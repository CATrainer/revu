"""APScheduler setup for YouTube background sync jobs.

Provides a function to start a BackgroundScheduler with three periodic jobs:
- Sync active channels (every 30 minutes)
- Sync recent video comments (every hour)
- Cleanup expired OAuth state tokens (daily)

Includes basic error handling and recovery: jobs catch exceptions and continue,
and the scheduler is configured with misfire grace time and coalescing.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Iterable

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger
from sqlalchemy import select

from app.core.database import async_session_maker
from app.models.youtube import OAuthStateToken, YouTubeConnection, YouTubeVideo
from app.workers.sync_worker import (
    process_channel_sync,
    process_incremental_sync,
    sync_recent_comments,
)
from app.core.database import async_session_maker
from app.services.early_warning import EarlyWarningService


async def _list_active_connections() -> list[YouTubeConnection]:
    async with async_session_maker() as session:
        res = await session.execute(
            select(YouTubeConnection).where(YouTubeConnection.connection_status == "active")
        )
        return res.scalars().all()


async def _latest_sync_time(conn: YouTubeConnection) -> datetime | None:
    return conn.last_synced_at


async def job_sync_channels() -> None:
    try:
        conns = await _list_active_connections()
        logger.info("Scheduler: syncing {n} active channels", n=len(conns))
        for conn in conns:
            # Use last_synced_at to decide incremental vs initial
            last_sync = await _latest_sync_time(conn)
            if last_sync:
                await process_incremental_sync(conn.id, last_sync)
            else:
                await process_channel_sync(conn.id)
    except Exception as e:  # noqa: BLE001
        logger.exception("job_sync_channels failed: %s", e)


async def job_sync_recent_comments() -> None:
    try:
        conns = await _list_active_connections()
        logger.info("Scheduler: syncing recent comments for {n} channels", n=len(conns))
        for conn in conns:
            await sync_recent_comments(conn.id)
    except Exception as e:  # noqa: BLE001
        logger.exception("job_sync_recent_comments failed: %s", e)
async def job_early_warning_scan() -> None:
    try:
        svc = EarlyWarningService()
        async with async_session_maker() as session:
            alerts = await svc.monitor_recent_videos(session)
            if alerts:
                from loguru import logger as _l
                _l.info("EarlyWarning: {} alert(s) detected", len(alerts))
    except Exception as e:  # noqa: BLE001
        logger.exception("job_early_warning_scan failed: %s", e)


async def job_cleanup_expired_oauth_tokens() -> None:
    try:
        now = datetime.now(timezone.utc)
        async with async_session_maker() as session:
            # Cleanup expired or used OAuth state tokens to keep table small
            from sqlalchemy import delete

            stmt = delete(OAuthStateToken).where(
                (OAuthStateToken.used.is_(True))
                | ((OAuthStateToken.expires_at.isnot(None)) & (OAuthStateToken.expires_at < now))
            )
            res = await session.execute(stmt)
            await session.commit()
            logger.info("OAuth tokens cleanup executed (rows affected may be None): {r}", r=res.rowcount)
    except Exception as e:  # noqa: BLE001
        logger.exception("job_cleanup_expired_oauth_tokens failed: %s", e)


def start_youtube_scheduler() -> AsyncIOScheduler:
    """Create and start the AsyncIO scheduler with configured jobs.

    Returns the scheduler instance so the caller can keep a handle
    and optionally shut it down on application exit.
    """
    scheduler = AsyncIOScheduler()

    # Jobs with reasonable misfire grace time to avoid backlog spikes
    scheduler.add_job(
        job_sync_channels,
        IntervalTrigger(minutes=30),
        id="youtube_sync_channels",
        name="Sync active YouTube channels",
        coalesce=True,
        misfire_grace_time=300,
        max_instances=1,
    )

    scheduler.add_job(
        job_sync_recent_comments,
        IntervalTrigger(hours=1),
        id="youtube_sync_recent_comments",
        name="Sync comments for recent videos",
        coalesce=True,
        misfire_grace_time=300,
        max_instances=1,
    )

    scheduler.add_job(
        job_early_warning_scan,
        IntervalTrigger(minutes=5),
        id="early_warning_scan",
        name="Scan for early viral signals",
        coalesce=True,
        misfire_grace_time=120,
        max_instances=1,
    )

    scheduler.add_job(
        job_cleanup_expired_oauth_tokens,
        IntervalTrigger(days=1),
        id="youtube_cleanup_oauth_tokens",
        name="Cleanup expired OAuth tokens",
        coalesce=True,
        misfire_grace_time=600,
        max_instances=1,
    )

    try:
        scheduler.start()
        logger.info("YouTube scheduler started with jobs: %s", [job.id for job in scheduler.get_jobs()])
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to start YouTube scheduler: %s", e)
        raise

    return scheduler
