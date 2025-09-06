"""Cleanup worker: archival and maintenance.

Tasks:
- Archive old mentions: free >90d, pro >365d (move to cold storage table or mark archived)
- Remove orphaned embeddings (no source row exists)
- Compact narrative threads (remove empty, recalc counts)
- Run DB optimize operations (ANALYZE / optional VACUUM hints)
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone, timedelta

import aioredis
from loguru import logger
from sqlalchemy import text

from app.core.database import async_session_maker

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
LOCK_TTL = 600
RUN_INTERVAL = 1800  # 30 minutes


async def _get_redis():  # type: ignore[no-untyped-def]
    return await aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)


async def acquire_lock(redis, key: str, ttl: int) -> bool:  # type: ignore[no-untyped-def]
    return await redis.set(key, "1", ex=ttl, nx=True) is True


async def archive_mentions(session):  # type: ignore[no-untyped-def]
    # Mark as archived instead of delete (add status if needed). For now set status='hidden'.
    await session.execute(
        text(
            """UPDATE social_mentions m SET status='archived', updated_at=now()
            FROM users u WHERE m.user_id=u.id AND m.status='active'
            AND ((u.tier='free' AND m.collected_at < now() - interval '90 days') OR (u.tier='pro' AND m.collected_at < now() - interval '365 days'))"""
        )
    )


async def remove_orphaned_embeddings(session):  # type: ignore[no-untyped-def]
    await session.execute(
        text(
            """DELETE FROM content_embeddings ce
            WHERE NOT EXISTS (
                SELECT 1 FROM social_mentions sm WHERE sm.id = ce.source_id
            )"""
        )
    )


async def compact_threads(session):  # type: ignore[no-untyped-def]
    # Remove threads with zero mentions; recount mention_count for others
    await session.execute(text("DELETE FROM narrative_threads WHERE mention_count=0"))
    await session.execute(
        text(
            """UPDATE narrative_threads nt SET mention_count=sub.cnt, updated_at=now()
            FROM (
                SELECT thread_id, COUNT(*) cnt FROM social_mentions WHERE thread_id IS NOT NULL GROUP BY thread_id
            ) sub WHERE nt.id=sub.thread_id"""
        )
    )


async def optimize_db(session):  # type: ignore[no-untyped-def]
    # Lightweight ANALYZE for key tables
    for tbl in ["social_mentions", "narrative_threads", "content_embeddings"]:
        try:
            await session.execute(text(f"ANALYZE {tbl}"))
        except Exception:  # noqa: BLE001
            pass


async def run_cycle():  # type: ignore[no-untyped-def]
    redis = await _get_redis()
    if not await acquire_lock(redis, "lock:cleanup_worker", LOCK_TTL):
        return
    async with async_session_maker() as session:
        try:
            await archive_mentions(session)
            await remove_orphaned_embeddings(session)
            await compact_threads(session)
            await optimize_db(session)
            await session.commit()
            logger.info("Cleanup cycle completed")
        except Exception:
            logger.exception("Cleanup cycle failed")
            await session.rollback()


async def loop():  # type: ignore[no-untyped-def]
    while True:
        await run_cycle()
        await asyncio.sleep(RUN_INTERVAL)


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(loop())
