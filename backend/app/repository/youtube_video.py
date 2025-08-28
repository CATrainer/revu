"""Repository for YouTubeVideo entities (async SQLAlchemy)."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable, Mapping, Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, desc, nullsfirst, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube import YouTubeVideo


class YouTubeVideoRepository:
    """Data access helpers for YouTubeVideo rows."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def bulk_create_videos(
        self,
        *,
        channel_id: UUID,
        videos: Iterable[Mapping[str, object]],
    ) -> Sequence[YouTubeVideo]:
        """Bulk insert videos for a channel, skipping duplicates.

        Each item in `videos` may include keys:
        - video_id (str, required)
        - title, description, thumbnail_url (str)
        - published_at (datetime)
        - view_count, like_count, comment_count (int)
        - duration (str)
        - last_fetched_at (datetime)

        Returns all rows in DB for the provided video_ids (inserted or existing).
        """
        rows = []
        video_ids: list[str] = []
        for v in videos:
            vid = str(v.get("video_id") or "").strip()
            if not vid:
                continue
            video_ids.append(vid)
            row = {
                "channel_id": channel_id,
                "video_id": vid,
                "title": v.get("title"),
                "description": v.get("description"),
                "thumbnail_url": v.get("thumbnail_url"),
                "published_at": v.get("published_at"),
                "view_count": v.get("view_count"),
                "like_count": v.get("like_count"),
                "comment_count": v.get("comment_count"),
                "duration": v.get("duration"),
            }
            # Only include last_fetched_at if provided; otherwise let DB server_default apply
            if v.get("last_fetched_at") is not None:
                row["last_fetched_at"] = v.get("last_fetched_at")
            rows.append(row)

        if rows:
            stmt = (
                pg_insert(YouTubeVideo.__table__)
                .values(rows)
                .on_conflict_do_nothing(index_elements=[YouTubeVideo.__table__.c.video_id])
            )
            await self.session.execute(stmt)

        if not video_ids:
            return []

        # Fetch and return all matching rows
        q = (
            select(YouTubeVideo)
            .where(
                and_(
                    YouTubeVideo.channel_id == channel_id,
                    YouTubeVideo.video_id.in_(video_ids),
                )
            )
            .order_by(desc(YouTubeVideo.published_at))
        )
        result = await self.session.execute(q)
        return result.scalars().all()

    async def get_channel_videos(
        self,
        *,
        channel_id: UUID,
        limit: int = 50,
        offset: int = 0,
        newest_first: bool = True,
    ) -> Sequence[YouTubeVideo]:
        """Return videos for a channel with pagination."""
        order_clause = desc(YouTubeVideo.published_at) if newest_first else YouTubeVideo.published_at
        q = (
            select(YouTubeVideo)
            .where(YouTubeVideo.channel_id == channel_id)
            .order_by(order_clause)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(q)
        return result.scalars().all()

    async def update_video_stats(
        self,
        *,
        id: Optional[UUID] = None,
        youtube_video_id: Optional[str] = None,
        view_count: Optional[int] = None,
        like_count: Optional[int] = None,
        comment_count: Optional[int] = None,
        last_fetched_at: Optional[datetime] = None,
    ) -> Optional[YouTubeVideo]:
        """Update stats for a video (by internal id or YouTube video_id)."""
        if not id and not youtube_video_id:
            raise ValueError("Provide either id or youtube_video_id")

        values: dict = {"updated_at": datetime.utcnow()}
        if view_count is not None:
            values["view_count"] = view_count
        if like_count is not None:
            values["like_count"] = like_count
        if comment_count is not None:
            values["comment_count"] = comment_count
        if last_fetched_at is not None:
            values["last_fetched_at"] = last_fetched_at

        q = update(YouTubeVideo).values(**values).returning(YouTubeVideo)
        if id:
            q = q.where(YouTubeVideo.id == id)
        else:
            q = q.where(YouTubeVideo.video_id == youtube_video_id)

        result = await self.session.execute(q)
        return result.scalars().first()

    async def get_video_by_youtube_id(self, youtube_video_id: str) -> Optional[YouTubeVideo]:
        """Fetch a single video by its external YouTube video_id."""
        q = select(YouTubeVideo).where(YouTubeVideo.video_id == youtube_video_id)
        result = await self.session.execute(q)
        return result.scalars().first()

    async def get_videos_for_sync(
        self,
        *,
        channel_id: UUID,
        limit: int = 50,
        stale_before: Optional[datetime] = None,
    ) -> Sequence[YouTubeVideo]:
        """Return videos needing sync: never fetched or older than `stale_before`."""
        cond = [YouTubeVideo.channel_id == channel_id]
        if stale_before is None:
            cond.append(YouTubeVideo.last_fetched_at.is_(None))
        else:
            cond.append(or_(YouTubeVideo.last_fetched_at.is_(None), YouTubeVideo.last_fetched_at < stale_before))

        q = (
            select(YouTubeVideo)
            .where(and_(*cond))
            .order_by(nullsfirst(YouTubeVideo.last_fetched_at))
            .limit(limit)
        )
        result = await self.session.execute(q)
        return result.scalars().all()
