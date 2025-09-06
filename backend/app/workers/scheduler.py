"""Central job scheduler for monitoring + maintenance.

Uses Celery beat (if configured) or can be invoked manually to enqueue tasks.
Scheduling logic:
- Monitoring scan frequency based on user tier (free=6h, pro=3h, premium=1h)
- Priority handling by routing key / queue name
- Retry policy for transient failures

Redis is leveraged for:
- Celery broker / backend
- Simple distributed locks (SET NX EX)
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

import aioredis
from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.monitoring.coordinator import MonitoringCoordinator

# Queue / routing names
QUEUE_MONITORING = "monitoring"
QUEUE_CLEANUP = "cleanup"

TIER_INTERVALS = {
    "free": timedelta(hours=6),
    "pro": timedelta(hours=3),
    "premium": timedelta(hours=1),
}

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
LOCK_TTL = 60  # seconds for short locks


async def _get_redis():  # type: ignore[no-untyped-def]
    return await aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)


async def acquire_lock(redis, key: str, ttl: int) -> bool:  # type: ignore[no-untyped-def]
    return await redis.set(key, "1", ex=ttl, nx=True) is True


async def schedule_monitoring_cycle() -> int:
    """Enqueue monitoring jobs (logical scheduling). Returns count queued.

    For Celery integration we would send tasks via delay/apply_async. Here we only mark
    due jobs by inserting into a hypothetical internal queue table or calling coordinator directly.
    """
    lock_key = "lock:schedule_monitoring"
    redis = await _get_redis()
    if not await acquire_lock(redis, lock_key, LOCK_TTL):
        logger.debug("schedule_monitoring skipped (lock held)")
        return 0

    async with async_session_maker() as session:  # type: AsyncSession
        coordinator = MonitoringCoordinator(session)
        jobs = await coordinator.schedule_due_jobs(limit=200)
        # Here we could push to a scraping_queue (already exists) for each job
        queued = 0
        for j in jobs:
            await session.execute(
                text(
                    """INSERT INTO scraping_queue (id, user_id, task_type, platform, status, priority, created_at, updated_at)
                    VALUES (gen_random_uuid(), :uid, 'profile', :plat, 'pending', :prio, now(), now())
                    ON CONFLICT DO NOTHING"""
                ),
                {"uid": str(j.user_id), "plat": j.platform, "prio": j.priority},
            )
            queued += 1
        await session.commit()
        logger.info("Scheduled {n} monitoring tasks", n=queued)
        return queued


async def schedule_cleanup_tasks() -> bool:
    lock_key = "lock:schedule_cleanup"
    redis = await _get_redis()
    if not await acquire_lock(redis, lock_key, LOCK_TTL):
        return False
    async with async_session_maker() as session:
        # Insert a cleanup marker task (could also enqueue multiple granular tasks)
        await session.execute(
            text(
                """INSERT INTO scraping_queue (id, user_id, task_type, platform, status, priority, created_at, updated_at)
                VALUES (gen_random_uuid(), NULL, 'site', 'system', 'pending', 150, now(), now())"""
            )
        )
        await session.commit()
        logger.info("Cleanup task scheduled")
        return True


async def main_loop(interval_seconds: int = 300):
    """Run periodic scheduling loop (alternative to celery beat)."""
    logger.info("Starting scheduler loop interval={s}s", s=interval_seconds)
    while True:
        try:
            await schedule_monitoring_cycle()
            await schedule_cleanup_tasks()
        except Exception:
            logger.exception("Scheduler cycle error")
        await asyncio.sleep(interval_seconds)


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(main_loop())
