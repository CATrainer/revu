"""High-level YouTube service as the main interface for app features.

Exposes: connect_youtube_channel, disconnect_channel, get_user_videos,
get_video_comments, reply_to_comment, trigger_manual_sync.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, desc, select, func, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube import YouTubeConnection, YouTubeVideo, YouTubeComment
from app.repository.youtube_connection import YouTubeConnectionRepository
from app.repository.youtube_video import YouTubeVideoRepository
from app.repository.youtube_comment import YouTubeCommentRepository
from app.services.oauth_service import OAuthService
from app.services.token_manager import TokenManager
from app.services.youtube_api_wrapper import YouTubeAPIWrapper
from app.workers.sync_worker import process_channel_sync, process_incremental_sync, sync_recent_comments
from app.services.sync_service import SyncService


READONLY_SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]
WRITE_SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]


class YouTubeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.conn_repo = YouTubeConnectionRepository(session)
        self.video_repo = YouTubeVideoRepository(session)
        self.comment_repo = YouTubeCommentRepository(session)

    # ---- Connection management ----
    async def connect_youtube_channel(
        self,
        *,
        user_id: UUID,
        code: str,
        state: str,
        redirect_uri: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Complete OAuth by validating state, exchanging code, and storing tokens.

        Returns { connection_id, status }.
        """
        oauth = OAuthService(self.session)
        valid = await oauth.validate_state_token(state)
        if not valid or valid.user_id != user_id:
            raise ValueError("Invalid or expired state token")

        payload = await oauth.exchange_code_for_tokens(code=code, redirect_uri=redirect_uri)
        access_token = payload.get("access_token")
        refresh_token = payload.get("refresh_token")
        expires_in = payload.get("expires_in")
        if not access_token or not expires_in:
            raise ValueError("Invalid token response from Google")

        conn = await self.conn_repo.create_connection(user_id=user_id)

        manager = TokenManager(self.session)
        await manager.store_tokens(
            connection_id=conn.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=int(expires_in),
        )

        # Attempt to discover and persist the authenticated channel metadata
        try:
            api = YouTubeAPIWrapper(self.session, conn.id)
            me = await api.get_my_channel()
            if me:
                channel_id = me.get("id")
                channel_name = (me.get("snippet") or {}).get("title")
                if channel_id or channel_name:
                    await self.conn_repo.set_channel_metadata(
                        connection_id=conn.id,
                        channel_id=channel_id,
                        channel_name=channel_name,
                    )
        except Exception:
            pass

        valid.used = True
        await self.session.commit()
        await self.session.refresh(conn)
        return {"connection_id": str(conn.id), "status": "connected"}

    async def disconnect_channel(self, *, user_id: UUID, connection_id: UUID) -> bool:
        """Delete a connection row (does not revoke Google tokens)."""
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            return False
        deleted = await self.conn_repo.delete_connection(connection_id)
        await self.session.commit()
        return bool(deleted)

    # ---- Reads ----
    async def get_user_videos(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        limit: int = 50,
        offset: int = 0,
        newest_first: bool = True,
        published_after: Optional[datetime] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Return videos for a connection, with optional filters."""
        # Ownership check
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            return []

        q = select(YouTubeVideo).where(YouTubeVideo.channel_id == connection_id)
        if published_after is not None:
            q = q.where(YouTubeVideo.published_at.isnot(None), YouTubeVideo.published_at >= published_after)
        if search:
            like = f"%{search}%"
            from sqlalchemy import or_

            q = q.where(or_(YouTubeVideo.title.ilike(like), YouTubeVideo.description.ilike(like)))
        order_clause = desc(YouTubeVideo.published_at) if newest_first else YouTubeVideo.published_at
        q = q.order_by(order_clause).limit(limit).offset(offset)
        res = await self.session.execute(q)
        videos = res.scalars().all()
        return [
            {
                "id": str(v.id),
                "video_id": v.video_id,
                "title": v.title,
                "description": v.description,
                "thumbnail_url": v.thumbnail_url,
                "published_at": v.published_at,
                "view_count": v.view_count,
                "like_count": v.like_count,
                "comment_count": v.comment_count,
                "duration": v.duration,
            }
            for v in videos
        ]

    async def get_video_comments(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        youtube_video_id: str,
        limit: int = 50,
        offset: int = 0,
        newest_first: bool = True,
    ) -> List[Dict[str, Any]]:
        """Return comments for a given video with pagination."""
        # Ownership check
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            return []

        video = await self.video_repo.get_video_by_youtube_id(youtube_video_id)
        if not video or str(video.channel_id) != str(connection_id):
            return []

        comments = await self.comment_repo.get_video_comments(
            video_id=video.id, limit=limit, offset=offset, newest_first=newest_first
        )

        # Lazy-load comments on first request if missing
        if not comments and offset == 0:
            try:
                sync = SyncService(self.session, connection_id)
                fetched = await sync.sync_video_comments(youtube_video_id)
                if fetched:
                    await self.session.commit()
                    comments = await self.comment_repo.get_video_comments(
                        video_id=video.id, limit=limit, offset=offset, newest_first=newest_first
                    )
            except Exception:
                # Best-effort: don't break the request if sync fails; just return empty set
                from loguru import logger
                logger.exception(
                    "On-demand comment sync failed for video {vid} (conn {cid})",
                    vid=youtube_video_id,
                    cid=str(connection_id),
                )
        return [
            {
                "id": str(c.id),
                "comment_id": c.comment_id,
                "author_name": c.author_name,
                "author_channel_id": c.author_channel_id,
                "content": c.content,
                "published_at": c.published_at,
                "like_count": c.like_count,
                "reply_count": c.reply_count,
                "parent_comment_id": c.parent_comment_id,
                "is_channel_owner_comment": c.is_channel_owner_comment,
                "hearted_by_owner": getattr(c, "hearted_by_owner", False),
                "liked_by_owner": getattr(c, "liked_by_owner", False),
            }
            for c in comments
        ]

    async def get_channel_comments(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        limit: int = 50,
        offset: int = 0,
        newest_first: bool = True,
        parents_only: bool = False,
    ) -> List[Dict[str, Any]]:
        """Return a channel-wide comments feed (optionally only top-level)."""
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            return []

        rows = await self.comment_repo.get_channel_comments(
            channel_id=connection_id,
            limit=limit,
            offset=offset,
            newest_first=newest_first,
            parents_only=parents_only,
        )
        items: List[Dict[str, Any]] = []
        for c, v in rows:
            items.append(
                {
                    "id": str(c.id),
                    "comment_id": c.comment_id,
                    "author_name": c.author_name,
                    "author_channel_id": c.author_channel_id,
                    "content": c.content,
                    "published_at": c.published_at,
                    "like_count": c.like_count,
                    "reply_count": c.reply_count,
                    "parent_comment_id": c.parent_comment_id,
                    "is_channel_owner_comment": c.is_channel_owner_comment,
                    "hearted_by_owner": getattr(c, "hearted_by_owner", False),
                    "liked_by_owner": getattr(c, "liked_by_owner", False),
                    # Video context
                    "video": {
                        "id": str(v.id),
                        "video_id": v.video_id,
                        "title": v.title,
                        "thumbnail_url": v.thumbnail_url,
                        "published_at": v.published_at,
                        "view_count": v.view_count,
                        "like_count": v.like_count,
                        "comment_count": v.comment_count,
                        "duration": v.duration,
                    },
                }
            )
        return items

    async def _check_comment_belongs_to_connection(self, *, connection_id: UUID, youtube_comment_id: str) -> Optional[YouTubeComment]:
        q = (
            select(YouTubeComment)
            .join(YouTubeVideo, YouTubeVideo.id == YouTubeComment.video_id)
            .where(and_(YouTubeVideo.channel_id == connection_id, YouTubeComment.comment_id == youtube_comment_id))
        )
        res = await self.session.execute(q)
        return res.scalars().first()

    async def set_comment_heart(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        youtube_comment_id: str,
        value: bool,
    ) -> bool:
        # Ownership check
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            raise ValueError("Connection not found")
        row = await self._check_comment_belongs_to_connection(connection_id=connection_id, youtube_comment_id=youtube_comment_id)
        if not row:
            return False
        # Local-only toggle (not propagated to YouTube)
        from sqlalchemy import update
        await self.session.execute(
            update(YouTubeComment)
            .where(YouTubeComment.id == row.id)
            .values(hearted_by_owner=bool(value))
        )
        await self.session.commit()
        return True

    async def set_comment_like(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        youtube_comment_id: str,
        value: bool,
    ) -> bool:
        # Ownership check
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            raise ValueError("Connection not found")
        row = await self._check_comment_belongs_to_connection(connection_id=connection_id, youtube_comment_id=youtube_comment_id)
        if not row:
            return False
        from sqlalchemy import update
        await self.session.execute(
            update(YouTubeComment)
            .where(YouTubeComment.id == row.id)
            .values(liked_by_owner=bool(value))
        )
        await self.session.commit()
        return True

    async def reply_to_comment(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        parent_comment_id: str,
        text: str,
    ) -> Dict[str, Any]:
        """Reply to a comment via API and mark local model accordingly."""
        # Ownership check
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            raise ValueError("Connection not found")

        api = YouTubeAPIWrapper(self.session, connection_id)
        res = await api.post_comment_reply(parent_comment_id=parent_comment_id, text=text)

        # Optionally update local reply counts if we can map the parent in DB
        parent = await self.session.execute(
            select(YouTubeComment).where(YouTubeComment.comment_id == parent_comment_id)
        )
        parent_row = parent.scalars().first()
        if parent_row:
            from app.repository.youtube_comment import YouTubeCommentRepository

            await YouTubeCommentRepository(self.session).mark_comment_replied(id=parent_row.id, reply_count=(parent_row.reply_count or 0) + 1)
            await self.session.commit()

        return res

    # ---- Manual sync trigger ----
    async def trigger_manual_sync(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        scope: str = "full",
        last_sync: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Trigger a manual sync for a connection.

        scope: "full" | "incremental" | "recent_comments"
        """
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            raise ValueError("Connection not found")

        if scope == "full":
            count = await process_channel_sync(connection_id)
            return {"status": "ok", "synced_videos": count}
        elif scope == "incremental":
            count = await process_incremental_sync(connection_id, last_sync)
            return {"status": "ok", "synced_videos": count}
        elif scope == "recent_comments":
            count = await sync_recent_comments(connection_id)
            return {"status": "ok", "synced_comments": count}
        else:
            raise ValueError("Unsupported scope")

    # ---- Analytics ----
    async def get_comment_statistics(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        since: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Return response rate and average response time for top-level comments.

        - Response rate = fraction of top-level comments with at least one reply.
        - Average response time = average(min(reply.published_at) - parent.published_at) over replied parents.
        """
        # Ownership check
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            return {"response_rate": 0.0, "avg_response_time_seconds": None, "total_top_level": 0, "replied": 0}

        # Base query for top-level comments on channel videos
        from app.models.youtube import YouTubeVideo, YouTubeComment

        parent_q = select(func.count()).select_from(YouTubeComment).join(
            YouTubeVideo, YouTubeVideo.id == YouTubeComment.video_id
        ).where(
            and_(
                YouTubeVideo.channel_id == connection_id,
                YouTubeComment.parent_comment_id.is_(None),
                True if since is None else YouTubeComment.published_at >= since,
            )
        )
        total_top = (await self.session.execute(parent_q)).scalar_one()

        replied_q = select(func.count()).select_from(YouTubeComment).join(
            YouTubeVideo, YouTubeVideo.id == YouTubeComment.video_id
        ).where(
            and_(
                YouTubeVideo.channel_id == connection_id,
                YouTubeComment.parent_comment_id.is_(None),
                (YouTubeComment.reply_count.isnot(None)) & (YouTubeComment.reply_count > 0),
                True if since is None else YouTubeComment.published_at >= since,
            )
        )
        replied = (await self.session.execute(replied_q)).scalar_one()

        # Average response time: min(child.published_at) - parent.published_at per parent, then avg
        child = YouTubeComment.alias("child")
        parent = YouTubeComment.alias("parent")
        sub_min = select(func.min(child.c.published_at)).where(
            child.c.parent_comment_id == parent.c.comment_id
        ).correlate(parent)
        # Only parents with at least one child
        has_child = exists(select(1).where(child.c.parent_comment_id == parent.c.comment_id))
        delta_q = select(
            func.avg(func.extract('epoch', (sub_min.scalar_subquery() - parent.c.published_at)))
        ).select_from(parent).join(
            YouTubeVideo, YouTubeVideo.id == parent.c.video_id
        ).where(
            and_(
                YouTubeVideo.channel_id == connection_id,
                parent.c.parent_comment_id.is_(None),
                has_child,
                True if since is None else parent.c.published_at >= since,
            )
        )
        avg_seconds = (await self.session.execute(delta_q)).scalar_one()

        response_rate = float(replied) / float(total_top) if total_top else 0.0
        return {
            "response_rate": response_rate,
            "avg_response_time_seconds": float(avg_seconds) if avg_seconds is not None else None,
            "total_top_level": int(total_top),
            "replied": int(replied),
        }

    async def get_channel_analytics(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        since: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Return aggregate counts for a channel: videos, comments, views, likes, engagement ratios."""
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            return {
                "total_videos": 0,
                "total_comments": 0,
                "total_views": 0,
                "total_likes": 0,
                "avg_comments_per_video": 0.0,
                "avg_views_per_video": 0.0,
                "avg_likes_per_video": 0.0,
            }

        # Videos aggregate
        vq = select(
            func.count(YouTubeVideo.id),
            func.coalesce(func.sum(YouTubeVideo.view_count), 0),
            func.coalesce(func.sum(YouTubeVideo.like_count), 0),
            func.coalesce(func.sum(YouTubeVideo.comment_count), 0),
        ).where(YouTubeVideo.channel_id == connection_id)
        if since is not None:
            vq = vq.where(YouTubeVideo.published_at.isnot(None), YouTubeVideo.published_at >= since)
        v_count, v_views, v_likes, v_comments = (await self.session.execute(vq)).one()

        # Actual comments rows counted (can be more accurate than video.comment_count)
        from app.models.youtube import YouTubeComment

        cq = select(func.count(YouTubeComment.id)).join(
            YouTubeVideo, YouTubeVideo.id == YouTubeComment.video_id
        ).where(YouTubeVideo.channel_id == connection_id)
        if since is not None:
            cq = cq.where(YouTubeComment.published_at.isnot(None), YouTubeComment.published_at >= since)
        c_rows = (await self.session.execute(cq)).scalar_one()

        tv = int(v_count or 0)
        total_views = int(v_views or 0)
        total_likes = int(v_likes or 0)
        total_comments = int(c_rows or 0)
        return {
            "total_videos": tv,
            "total_comments": total_comments,
            "total_views": total_views,
            "total_likes": total_likes,
            "avg_comments_per_video": (total_comments / tv) if tv else 0.0,
            "avg_views_per_video": (total_views / tv) if tv else 0.0,
            "avg_likes_per_video": (total_likes / tv) if tv else 0.0,
        }

    async def get_unanswered_comments_count(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        since: Optional[datetime] = None,
    ) -> int:
        """Count top-level comments without replies for a channel."""
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            return 0

        from app.models.youtube import YouTubeVideo, YouTubeComment

        q = select(func.count(YouTubeComment.id)).join(
            YouTubeVideo, YouTubeVideo.id == YouTubeComment.video_id
        ).where(
            and_(
                YouTubeVideo.channel_id == connection_id,
                YouTubeComment.parent_comment_id.is_(None),
                (YouTubeComment.reply_count.is_(None)) | (YouTubeComment.reply_count == 0),
                True if since is None else YouTubeComment.published_at >= since,
            )
        )
        return int((await self.session.execute(q)).scalar_one())

    async def export_comments_to_csv(
        self,
        *,
        user_id: UUID,
        connection_id: UUID,
        include_replies: bool = True,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> tuple[str, bytes]:
        """Export comments to CSV and return (filename, content_bytes)."""
        # Ownership check
        conns = await self.conn_repo.get_user_connections(user_id)
        if not any(c.id == connection_id for c in conns):
            return ("comments.csv", b"")

        from app.models.youtube import YouTubeVideo, YouTubeComment
        from io import StringIO
        import csv
        import datetime as dt

        q = select(
            YouTubeComment.comment_id,
            YouTubeComment.parent_comment_id,
            YouTubeComment.author_name,
            YouTubeComment.author_channel_id,
            YouTubeComment.content,
            YouTubeComment.published_at,
            YouTubeComment.like_count,
            YouTubeComment.reply_count,
            YouTubeVideo.video_id,
            YouTubeVideo.title,
        ).join(YouTubeVideo, YouTubeVideo.id == YouTubeComment.video_id).where(
            YouTubeVideo.channel_id == connection_id
        )
        if not include_replies:
            q = q.where(YouTubeComment.parent_comment_id.is_(None))
        if since is not None:
            q = q.where(YouTubeComment.published_at.isnot(None), YouTubeComment.published_at >= since)
        if until is not None:
            q = q.where(YouTubeComment.published_at.isnot(None), YouTubeComment.published_at <= until)
        q = q.order_by(YouTubeComment.published_at)

        rows = (await self.session.execute(q)).all()

        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "video_id",
            "video_title",
            "comment_id",
            "parent_comment_id",
            "author_name",
            "author_channel_id",
            "content",
            "published_at",
            "like_count",
            "reply_count",
        ])
        for r in rows:
            (
                comment_id,
                parent_comment_id,
                author_name,
                author_channel_id,
                content,
                published_at,
                like_count,
                reply_count,
                video_id,
                video_title,
            ) = r
            writer.writerow(
                [
                    video_id,
                    video_title,
                    comment_id,
                    parent_comment_id or "",
                    author_name or "",
                    author_channel_id or "",
                    (content or "").replace("\r\n", " ").replace("\n", " "),
                    published_at.isoformat() if published_at else "",
                    like_count or 0,
                    reply_count or 0,
                ]
            )

        content = buf.getvalue().encode("utf-8")
        buf.close()
        ts = dt.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        filename = f"comments-{connection_id}-{ts}.csv"
        return filename, content
