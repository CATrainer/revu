"""Background job functions for YouTube sync workflows.

These functions can be scheduled by Celery, APScheduler, or any job runner.
They manage their own AsyncSession lifecycle and delegate logic to SyncService.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.services.sync_service import SyncService


async def _with_session(fn):
    async with async_session_maker() as session:  # type: AsyncSession
        try:
            return await fn(session)
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def process_channel_sync(connection_id: UUID) -> int:
    """Full sync: fetch all videos for the channel.

    Returns number of videos synced.
    """
    logger.info("Starting full channel sync: {conn}", conn=str(connection_id))

    async def run(session: AsyncSession) -> int:
        service = SyncService(session, connection_id)
        try:
            count = await service.sync_channel_videos()
            await session.commit()
            logger.info("Full channel sync complete: {count} videos", count=count)
            return count
        except Exception as e:  # noqa: BLE001
            logger.exception("Full channel sync failed for %s", connection_id)
            raise e

    return await _with_session(run)


async def process_incremental_sync(connection_id: UUID, last_sync: Optional[datetime]) -> int:
    """Incremental sync: fetch new videos published after last_sync.

    Returns number of videos synced in this run.
    """
    logger.info(
        "Starting incremental sync: {conn} since {ts}", conn=str(connection_id), ts=str(last_sync)
    )

    async def run(session: AsyncSession) -> int:
        service = SyncService(session, connection_id)
        try:
            count = await service.sync_new_videos(last_sync)
            await session.commit()
            logger.info("Incremental sync complete: {count} videos", count=count)
            return count
        except Exception as e:  # noqa: BLE001
            logger.exception("Incremental sync failed for %s", connection_id)
            raise e

    return await _with_session(run)


async def sync_recent_comments(connection_id: UUID) -> int:
    """Fetch comments for videos from the last 7 days.

    Returns total comments upserted.
    """
    logger.info("Starting recent comments sync: {conn}", conn=str(connection_id))

    async def run(session: AsyncSession) -> int:
        from sqlalchemy import select, desc
        from app.models.youtube import YouTubeVideo

        service = SyncService(session, connection_id)
        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)
        total = 0
        try:
            q = (
                select(YouTubeVideo)
                .where(
                    (YouTubeVideo.channel_id == connection_id)
                    & (YouTubeVideo.published_at.isnot(None))
                    & (YouTubeVideo.published_at >= seven_days_ago)
                )
                .order_by(desc(YouTubeVideo.published_at))
            )
            res = await session.execute(q)
            videos = res.scalars().all()

            for v in videos:
                total += await service.sync_video_comments(v.video_id)

            await session.commit()
            logger.info("Recent comments sync complete: {count} comments", count=total)
            return total
        except Exception as e:  # noqa: BLE001
            logger.exception("Recent comments sync failed for %s", connection_id)
            raise e

    return await _with_session(run)
