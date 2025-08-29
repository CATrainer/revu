"""Synchronization service for YouTube content.

Provides high-level methods to sync videos and comments for a YouTube connection.
Relies on YouTubeAPIWrapper for resilient API calls and repository classes for
database persistence.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional
from uuid import UUID

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube import YouTubeConnection, YouTubeVideo
from app.repository.youtube_connection import YouTubeConnectionRepository
from app.repository.youtube_video import YouTubeVideoRepository
from app.repository.youtube_comment import YouTubeCommentRepository
from app.services.youtube_api_wrapper import YouTubeAPIWrapper
from app.utils.youtube_utils import parse_youtube_timestamp
from typing import cast


class SyncService:
    """Coordinates YouTube sync flows for a given connection."""

    def __init__(self, session: AsyncSession, connection_id: UUID) -> None:
        self.session = session
        self.connection_id = connection_id
        self.conn_repo = YouTubeConnectionRepository(session)
        self.video_repo = YouTubeVideoRepository(session)
        self.comment_repo = YouTubeCommentRepository(session)
        self.api = YouTubeAPIWrapper(session, connection_id)

    async def _get_connection(self) -> Optional[YouTubeConnection]:
        result = await self.session.execute(
            select(YouTubeConnection).where(YouTubeConnection.id == self.connection_id)
        )
        return result.scalars().first()

    async def _hydrate_channel_metadata(self) -> Optional[YouTubeConnection]:
        """Ensure the connection has channel_id/channel_name.

        Attempts to fetch the authenticated user's channel via the API and
        persists channel_id/channel_name on the connection if missing.
        Returns the refreshed connection or None if not found.
        """
        conn = await self._get_connection()
        if not conn:
            logger.error("Connection not found: {cid}", cid=str(self.connection_id))
            return None

        if conn.channel_id:
            return conn

        try:
            me = await self.api.get_my_channel()
            if me:
                cid = me.get("id")
                title = (me.get("snippet") or {}).get("title")
                if cid:
                    updated = await self.conn_repo.set_channel_metadata(
                        connection_id=self.connection_id,
                        channel_id=cid,
                        channel_name=title,
                    )
                    # Make sure changes are flushed before subsequent queries
                    await self.session.flush()
                    logger.info(
                        "Hydrated channel metadata for connection {cid}: channel_id={ch}",
                        cid=str(self.connection_id),
                        ch=cid,
                    )
                    return updated or await self._get_connection()
                else:
                    logger.warning("Authenticated channel response missing id; cannot hydrate")
            else:
                logger.warning("Could not fetch authenticated channel; cannot hydrate")
        except Exception:
            logger.exception("Failed to hydrate channel metadata for {cid}", cid=str(self.connection_id))

        # Fallback: return whatever we have
        return await self._get_connection()

    # ---- Video Sync ----
    async def sync_channel_videos(self) -> int:
        """Initial sync: fetch all videos from the channel uploads playlist.

        Returns number of videos upserted (inserted or already present).
        """
        conn = await self._get_connection()
        if not conn or not conn.channel_id:
            # Attempt to auto-hydrate channel metadata before bailing out
            conn = await self._hydrate_channel_metadata()
            if not conn or not conn.channel_id:
                logger.error("Connection or external channel_id not set; cannot sync videos.")
                return 0

        uploads_playlist_id = await self.api.get_channel_uploads_playlist_id(conn.channel_id)
        if not uploads_playlist_id:
            logger.warning("Uploads playlist not found for channel {cid}", cid=conn.channel_id)
            return 0

        total = 0
        page_token: Optional[str] = None
        while True:
            resp = await self.api.list_playlist_videos(
                playlist_id=uploads_playlist_id,
                page_token=page_token,
                max_results=50,
            )
            items: List[Dict[str, Any]] = resp.get("items", [])
            if not items:
                break

            # Collect video IDs and fetch details for stats/duration
            video_ids = [it.get("contentDetails", {}).get("videoId") for it in items]
            video_ids = [vid for vid in video_ids if vid]
            details = await self.api.get_video_details(video_ids)
            details_by_id = {d.get("id"): d for d in details}

            rows: List[Dict[str, Any]] = []
            for it in items:
                snippet = it.get("snippet", {})
                cdet = it.get("contentDetails", {})
                vid = cdet.get("videoId")
                if not vid:
                    continue

                det = details_by_id.get(vid, {})
                stats = det.get("statistics", {}) if det else {}
                cdet2 = det.get("contentDetails", {}) if det else {}
                thumbs = (snippet.get("thumbnails") or {}).get("high") or (snippet.get("thumbnails") or {}).get("default") or {}

                # Determine tags
                # Always include platform tag
                tags: list[str] = ["youtube"]
                dur_iso = cast(str | None, cdet2.get("duration"))
                # Heuristic: Shorts are typically < 60 seconds
                def _is_shorts(duration_iso: str | None) -> bool:
                    if not duration_iso:
                        return False
                    # naive parse: PT#H#M#S
                    import re
                    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_iso)
                    if not m:
                        return False
                    h = int(m.group(1) or 0)
                    mnt = int(m.group(2) or 0)
                    sec = int(m.group(3) or 0)
                    total = h * 3600 + mnt * 60 + sec
                    return total > 0 and total < 60
                if _is_shorts(dur_iso):
                    tags.append("shorts")
                else:
                    tags.append("long form")

                rows.append(
                    {
                        "video_id": vid,
                        "title": snippet.get("title"),
                        "description": snippet.get("description"),
                        "thumbnail_url": thumbs.get("url"),
                        "published_at": parse_youtube_timestamp(snippet.get("publishedAt")),
                        "view_count": int(stats.get("viewCount", 0) or 0) if stats else None,
                        "like_count": int(stats.get("likeCount", 0) or 0) if stats else None,
                        "comment_count": int(stats.get("commentCount", 0) or 0) if stats else None,
                        "duration": cdet2.get("duration"),
                        "tags": tags,
                    }
                )

            saved = await self.video_repo.bulk_create_videos(channel_id=self.connection_id, videos=rows)
            total += len(saved)

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        # Update last_synced_at
        now = datetime.now(timezone.utc)
        # Ensure we never write a NULL into a NOT NULL column if historical rows had None
        status = conn.connection_status or "active"
        await self.conn_repo.update_connection_status(
            connection_id=self.connection_id, status=status, last_synced_at=now
        )

        return total

    async def sync_new_videos(self, last_sync: Optional[datetime]) -> int:
        """Incremental sync: fetch videos newer than last_sync.

        If last_sync is None, behaves like initial sync but returns count for this run.
        """
        conn = await self._get_connection()
        if not conn or not conn.channel_id:
            # Attempt to auto-hydrate channel metadata before bailing out
            conn = await self._hydrate_channel_metadata()
            if not conn or not conn.channel_id:
                logger.error("Connection or external channel_id not set; cannot sync videos.")
                return 0

        uploads_playlist_id = await self.api.get_channel_uploads_playlist_id(conn.channel_id)
        if not uploads_playlist_id:
            logger.warning("Uploads playlist not found for channel {cid}", cid=conn.channel_id)
            return 0

        cutoff = last_sync
        total = 0
        page_token: Optional[str] = None
        stop = False

        while not stop:
            resp = await self.api.list_playlist_videos(
                playlist_id=uploads_playlist_id,
                page_token=page_token,
                max_results=50,
            )
            items: List[Dict[str, Any]] = resp.get("items", [])
            if not items:
                break

            # Filter and stop when hitting older items
            fresh_items: List[Dict[str, Any]] = []
            for it in items:
                published_at = parse_youtube_timestamp(it.get("snippet", {}).get("publishedAt"))
                if cutoff is None or (published_at and published_at > cutoff):
                    fresh_items.append(it)
                else:
                    stop = True

            if not fresh_items:
                break

            video_ids = [it.get("contentDetails", {}).get("videoId") for it in fresh_items]
            video_ids = [vid for vid in video_ids if vid]
            details = await self.api.get_video_details(video_ids)
            details_by_id = {d.get("id"): d for d in details}

            rows: List[Dict[str, Any]] = []
            for it in fresh_items:
                snippet = it.get("snippet", {})
                cdet = it.get("contentDetails", {})
                vid = cdet.get("videoId")
                if not vid:
                    continue
                det = details_by_id.get(vid, {})
                stats = det.get("statistics", {}) if det else {}
                cdet2 = det.get("contentDetails", {}) if det else {}
                thumbs = (snippet.get("thumbnails") or {}).get("high") or (snippet.get("thumbnails") or {}).get("default") or {}
                # Determine tags
                tags: list[str] = ["youtube"]
                dur_iso = cdet2.get("duration")
                import re
                m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", dur_iso or "")
                if m:
                    h = int(m.group(1) or 0)
                    mnt = int(m.group(2) or 0)
                    sec = int(m.group(3) or 0)
                    total = h * 3600 + mnt * 60 + sec
                    tags.append("shorts" if (total > 0 and total < 60) else "long form")
                else:
                    tags.append("long form")
                rows.append(
                    {
                        "video_id": vid,
                        "title": snippet.get("title"),
                        "description": snippet.get("description"),
                        "thumbnail_url": thumbs.get("url"),
                        "published_at": parse_youtube_timestamp(snippet.get("publishedAt")),
                        "view_count": int(stats.get("viewCount", 0) or 0) if stats else None,
                        "like_count": int(stats.get("likeCount", 0) or 0) if stats else None,
                        "comment_count": int(stats.get("commentCount", 0) or 0) if stats else None,
                        "duration": cdet2.get("duration"),
                        "tags": tags,
                    }
                )

            saved = await self.video_repo.bulk_create_videos(channel_id=self.connection_id, videos=rows)
            total += len(saved)

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        # Update last_synced_at
        now = datetime.now(timezone.utc)
        status = conn.connection_status or "active"
        await self.conn_repo.update_connection_status(
            connection_id=self.connection_id, status=status, last_synced_at=now
        )
        return total

    # ---- Comment Sync ----
    async def sync_video_comments(self, youtube_video_id: str) -> int:
        """Fetch all comments (top-level and replies) for a video and upsert them."""
        video: Optional[YouTubeVideo] = await self.video_repo.get_video_by_youtube_id(youtube_video_id)
        if not video:
            logger.warning("Video %s not found in DB; cannot sync comments.", youtube_video_id)
            return 0

        count = 0
        page_token: Optional[str] = None
        while True:
            resp = await self.api.list_video_comments(
                video_id=youtube_video_id, page_token=page_token, max_results=100, fetch_replies=False
            )
            threads = resp.get("items", [])
            if not threads:
                break

            to_save: List[Dict[str, Any]] = []
            parent_ids: List[str] = []

            for th in threads:
                top = (th.get("snippet") or {}).get("topLevelComment") or {}
                cid = top.get("id")
                sn = top.get("snippet", {})
                if not cid:
                    continue
                to_save.append(
                    {
                        "comment_id": cid,
                        "author_name": sn.get("authorDisplayName"),
                        "author_channel_id": sn.get("authorChannelId", {}).get("value"),
                        "content": sn.get("textDisplay"),
                        "published_at": parse_youtube_timestamp(sn.get("publishedAt")),
                        "like_count": sn.get("likeCount"),
                        "reply_count": th.get("snippet", {}).get("totalReplyCount"),
                        "parent_comment_id": None,
                        "is_channel_owner_comment": bool(sn.get("authorChannelId", {}).get("value") == (await self._get_connection()).channel_id),
                    }
                )
                if (th.get("snippet", {}).get("totalReplyCount") or 0) > 0:
                    parent_ids.append(cid)

            if to_save:
                saved = await self.comment_repo.bulk_create_comments(video_id=video.id, comments=to_save)
                count += len(saved)

            # Fetch replies per parent, paginating each
            for parent_id in parent_ids:
                reply_token: Optional[str] = None
                while True:
                    rresp = await self.api.list_comment_replies(
                        parent_comment_id=parent_id, page_token=reply_token, max_results=100
                    )
                    replies = rresp.get("items", [])
                    if not replies:
                        break
                    to_save_replies: List[Dict[str, Any]] = []
                    for r in replies:
                        rsn = r.get("snippet", {})
                        rid = r.get("id")
                        if not rid:
                            continue
                        to_save_replies.append(
                            {
                                "comment_id": rid,
                                "author_name": rsn.get("authorDisplayName"),
                                "author_channel_id": rsn.get("authorChannelId", {}).get("value"),
                                "content": rsn.get("textDisplay"),
                                "published_at": parse_youtube_timestamp(rsn.get("publishedAt")),
                                "like_count": rsn.get("likeCount"),
                                "reply_count": 0,
                                "parent_comment_id": parent_id,
                                "is_channel_owner_comment": False,
                            }
                        )
                    if to_save_replies:
                        saved = await self.comment_repo.bulk_create_comments(
                            video_id=video.id, comments=to_save_replies
                        )
                        count += len(saved)

                    reply_token = rresp.get("nextPageToken")
                    if not reply_token:
                        break

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        return count

    # ---- Batch Processing ----
    async def process_sync_batch(
        self,
        tasks: Iterable[Dict[str, Any]],
        *,
        concurrency: int = 5,
    ) -> List[Dict[str, Any]]:
        """Process a batch of sync tasks concurrently with a concurrency cap.

        Each task is a dict with at least a "type" key. Supported types:
        - {"type": "video_comments", "youtube_video_id": "<id>"}

        Returns list of results with shape: {"task": task, "ok": bool, "result"|"error": ...}
        """
        import asyncio

        sem = asyncio.Semaphore(max(1, int(concurrency)))
        results: List[Dict[str, Any]] = []

        async def run_task(task: Dict[str, Any]):
            async with sem:
                try:
                    ttype = task.get("type")
                    if ttype == "video_comments":
                        vid = task.get("youtube_video_id")
                        if not vid:
                            raise ValueError("youtube_video_id is required")
                        res = await self.sync_video_comments(vid)
                    else:
                        raise ValueError(f"Unsupported task type: {ttype}")
                    results.append({"task": task, "ok": True, "result": res})
                except Exception as e:  # noqa: BLE001
                    logger.exception("Sync task failed: %s", task)
                    results.append({"task": task, "ok": False, "error": str(e)})

        await asyncio.gather(*(run_task(t) for t in tasks))
        return results
