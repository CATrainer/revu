"""Monitoring worker: consume scraping_queue entries and run monitoring pipeline.

Responsibilities:
- Pull pending scraping_queue rows (task_type in ['profile','thread','mention'])
- Acquire distributed lock per (user_id, platform) to avoid concurrent duplication
- Run MonitoringCoordinator.run_job for that platform
- Update scraping_queue status (succeeded/failed)
- Generate monitoring snapshot summary
- Emit notifications (placeholder logging)
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import aioredis
from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.monitoring.coordinator import MonitoringCoordinator

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
LOCK_TTL = 300
BATCH_LIMIT = 25


async def _get_redis():  # type: ignore[no-untyped-def]
    return await aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)


async def acquire_lock(redis, key: str, ttl: int) -> bool:  # type: ignore[no-untyped-def]
    return await redis.set(key, "1", ex=ttl, nx=True) is True


async def process_one(session: AsyncSession, row) -> None:  # type: ignore[no-untyped-def]
    qid, user_id, platform = row
    lock_key = f"lock:monitor:{user_id}:{platform}"
    redis = await _get_redis()
    if not await acquire_lock(redis, lock_key, 60):
        logger.debug("Skip task (locked) user={u} plat={p}", u=user_id, p=platform)
        return
    logger.info("Processing monitoring queue id={qid} user={u} platform={p}", qid=qid, u=user_id, p=platform)
    coordinator = MonitoringCoordinator(session)
    try:
        # Reconstruct job dataclass is internal; use run_job wrapper manually
        from app.monitoring.coordinator import ScheduledJob
        job = ScheduledJob(user_id=UUID(user_id), platform=platform, next_run_at=datetime.now(timezone.utc), tier="free")
        await coordinator.run_job(job)
        await session.execute(
            text("UPDATE scraping_queue SET status='succeeded', finished_at=now(), updated_at=now() WHERE id=:id"),
            {"id": str(qid)},
        )
    except Exception:
        logger.exception("Monitoring task failed id={qid}", qid=qid)
        await session.execute(
            text("UPDATE scraping_queue SET status='failed', finished_at=now(), updated_at=now() WHERE id=:id"),
            {"id": str(qid)},
        )
    # Snapshot summary (simplified)
    await session.execute(
        text(
            """INSERT INTO monitoring_snapshots (id, user_id, period_start, period_end, metrics, generated_by)
            VALUES (gen_random_uuid(), :uid, now(), now(), '{"recent_run":true}'::jsonb, 'system')"""
        ),
        {"uid": str(user_id)}
    )


async def worker_loop(interval_seconds: int = 10):
    while True:
        try:
            async with async_session_maker() as session:  # type: AsyncSession
                res = await session.execute(
                    text(
                        """SELECT id, user_id::text, platform FROM scraping_queue
                        WHERE status='pending' AND platform IS NOT NULL
                        ORDER BY priority ASC, scheduled_at NULLS FIRST, created_at ASC
                        LIMIT :lim FOR UPDATE SKIP LOCKED"""
                    ),
                    {"lim": BATCH_LIMIT},
                )
                rows = res.fetchall()
                if not rows:
                    await session.commit()
                    await asyncio.sleep(interval_seconds)
                    continue
                for r in rows:
                    await process_one(session, r)
                await session.commit()
        except Exception:
            logger.exception("monitoring_worker loop error")
        await asyncio.sleep(interval_seconds)


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(worker_loop())
