"""Repository for YouTubeComment entities (async SQLAlchemy)."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable, Mapping, Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, desc, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube import YouTubeComment, YouTubeVideo


class YouTubeCommentRepository:
    """Data access helpers for YouTubeComment rows."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def bulk_create_comments(
        self,
        *,
        video_id: UUID,
        comments: Iterable[Mapping[str, object]],
    ) -> Sequence[YouTubeComment]:
        """Bulk insert comments for a video, skipping duplicates by comment_id.

        Each item in `comments` may include keys:
        - comment_id (str, required)
        - author_name, author_channel_id (str)
        - content (str)
        - published_at (datetime)
        - like_count, reply_count (int)
        - parent_comment_id (str or None)
        - is_channel_owner_comment (bool)

        Returns all rows in DB for the provided comment_ids (inserted or existing).
        """
        rows = []
        comment_ids: list[str] = []
        for c in comments:
            cid = str(c.get("comment_id") or "").strip()
            if not cid:
                continue
            comment_ids.append(cid)
            rows.append(
                {
                    "video_id": video_id,
                    "comment_id": cid,
                    "author_name": c.get("author_name"),
                    "author_channel_id": c.get("author_channel_id"),
                    "content": c.get("content"),
                    "published_at": c.get("published_at"),
                    "like_count": c.get("like_count"),
                    "reply_count": c.get("reply_count"),
                    "parent_comment_id": c.get("parent_comment_id"),
                    "is_channel_owner_comment": c.get("is_channel_owner_comment", False),
                }
            )

        if rows:
            stmt = (
                pg_insert(YouTubeComment.__table__)
                .values(rows)
                .on_conflict_do_nothing(index_elements=[YouTubeComment.__table__.c.comment_id])
            )
            await self.session.execute(stmt)

        if not comment_ids:
            return []

        q = (
            select(YouTubeComment)
            .where(
                and_(
                    YouTubeComment.video_id == video_id,
                    YouTubeComment.comment_id.in_(comment_ids),
                )
            )
            .order_by(desc(YouTubeComment.published_at))
        )
        result = await self.session.execute(q)
        return result.scalars().all()

    async def get_video_comments(
        self,
        *,
        video_id: UUID,
        limit: int = 50,
        offset: int = 0,
        newest_first: bool = True,
    ) -> Sequence[YouTubeComment]:
        """Return comments for a video with pagination."""
        order_clause = desc(YouTubeComment.published_at) if newest_first else YouTubeComment.published_at
        q = (
            select(YouTubeComment)
            .where(YouTubeComment.video_id == video_id)
            .order_by(order_clause)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(q)
        return result.scalars().all()

    async def get_unanswered_comments(
        self,
        *,
        video_id: UUID,
        limit: int = 50,
    ) -> Sequence[YouTubeComment]:
        """Return top-level comments without replies (reply_count is null or 0)."""
        q = (
            select(YouTubeComment)
            .where(
                and_(
                    YouTubeComment.video_id == video_id,
                    YouTubeComment.parent_comment_id.is_(None),
                    or_(
                        YouTubeComment.reply_count.is_(None),
                        YouTubeComment.reply_count == 0,
                    ),
                )
            )
            .order_by(desc(YouTubeComment.published_at))
            .limit(limit)
        )
        result = await self.session.execute(q)
        return result.scalars().all()

    async def mark_comment_replied(
        self,
        *,
        id: Optional[UUID] = None,
        youtube_comment_id: Optional[str] = None,
        reply_count: int = 1,
    ) -> Optional[YouTubeComment]:
        """Mark a comment as replied by setting reply_count >= 1.

        Provide either internal id or external youtube_comment_id.
        """
        if not id and not youtube_comment_id:
            raise ValueError("Provide either id or youtube_comment_id")
        if reply_count < 1:
            reply_count = 1

        q = (
            update(YouTubeComment)
            .values(reply_count=reply_count, updated_at=datetime.utcnow())
            .returning(YouTubeComment)
        )
        if id:
            q = q.where(YouTubeComment.id == id)
        else:
            q = q.where(YouTubeComment.comment_id == youtube_comment_id)

        result = await self.session.execute(q)
        return result.scalars().first()

    async def search_comments(
        self,
        *,
        query: str,
        video_id: Optional[UUID] = None,
        channel_id: Optional[UUID] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[YouTubeComment]:
        """Full-text-like search on content and author_name with optional scoping.

        If channel_id is provided, joins to YouTubeVideo to filter by channel.
        """
        like = f"%{query}%"
        base = select(YouTubeComment)
        conditions = [or_(YouTubeComment.content.ilike(like), YouTubeComment.author_name.ilike(like))]

        if video_id is not None:
            conditions.append(YouTubeComment.video_id == video_id)
        if channel_id is not None:
            base = base.join(YouTubeVideo, YouTubeVideo.id == YouTubeComment.video_id)
            conditions.append(YouTubeVideo.channel_id == channel_id)

        q = (
            base.where(and_(*conditions))
            .order_by(desc(YouTubeComment.published_at))
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(q)
        return result.scalars().all()
