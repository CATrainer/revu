"""MonitoringCoordinator orchestrates social data ingestion and analysis.

Pipeline phases:
1. Scheduling: decide which users/platforms to refresh based on tier & quotas.
2. Fetch: invoke platform clients (rate-limited) to pull recent items.
3. Process: normalize and enrich raw items (DataProcessor).
4. Analyze: batch AI sentiment, topics, embeddings (AIAnalyzer).
5. Store: persist mentions, threads, embeddings (Storage layer).

The coordinator does not perform heavy platform-specific logic itself; it delegates.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Sequence
from uuid import UUID

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from .data_processor import DataProcessor
from .ai_analyzer import AIAnalyzer
from .storage import Storage
from .platforms.base import PlatformClient, FetchResult
from .platforms.twitter import TwitterClient
from .platforms.reddit import RedditClient
from .platforms.tiktok import TikTokClient
from .platforms.instagram import InstagramClient


TIER_INTERVALS = {
    "free": timedelta(hours=6),
    "pro": timedelta(hours=3),
    "premium": timedelta(hours=1),
}

MANUAL_REFRESH_QUOTAS = {
    "free": 5,
    "pro": 25,
    "premium": 100,
}

RATE_LIMIT_DEFAULT = 60  # requests per minute per platform token (placeholder)


@dataclass
class ScheduledJob:
    user_id: UUID
    platform: str
    next_run_at: datetime
    tier: str
    priority: int = 100


class MonitoringCoordinator:
    """High-level orchestrator tying together fetch, process, analyze, store."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.data_processor = DataProcessor()
        self.ai_analyzer = AIAnalyzer(session)
        self.storage = Storage(session)
        self.platform_clients: Dict[str, PlatformClient] = {
            "twitter": TwitterClient(session),
            "reddit": RedditClient(session),
            "tiktok": TikTokClient(session),
            "instagram": InstagramClient(session),
        }

    async def schedule_due_jobs(self, limit: int = 100) -> List[ScheduledJob]:
        """Compute list of due jobs based on last snapshot / user tier.

        This assumes a table (social_profiles) exists; we map user tiers either from users table or a subscription table.
        For now, we'll fetch user_id, platform, last_synced_at, and join a hypothetical user_tier column.
        """
        result = await self.session.execute(
            text(
                """
                SELECT sp.user_id, sp.platform, sp.last_synced_at, u.tier
                FROM social_profiles sp
                JOIN users u ON u.id = sp.user_id
                WHERE sp.status = 'active'
                LIMIT :lim
                """
            ),
            {"lim": limit},
        )
        now = datetime.now(timezone.utc)
        jobs: List[ScheduledJob] = []
        for row in result.fetchall():
            user_id, platform, last_synced_at, tier = row
            tier_key = (tier or "free").lower()
            interval = TIER_INTERVALS.get(tier_key, TIER_INTERVALS["free"])
            due = (last_synced_at is None) or (now - last_synced_at >= interval)
            if due:
                jobs.append(
                    ScheduledJob(
                        user_id=user_id,
                        platform=platform,
                        next_run_at=now,
                        tier=tier_key,
                        priority=50 if tier_key == "premium" else 100,
                    )
                )
        logger.debug("Scheduled {n} monitoring jobs", n=len(jobs))
        return jobs

    async def run_job(self, job: ScheduledJob) -> None:
        client = self.platform_clients.get(job.platform)
        if not client:
            logger.warning("No client for platform {p}", p=job.platform)
            return
        logger.info("Running monitoring job user={u} platform={p}", u=str(job.user_id), p=job.platform)
        # 1. Fetch
        fetched: FetchResult = await client.fetch_recent(user_id=job.user_id)
        if not fetched.items:
            logger.debug("No items fetched user={u} platform={p}", u=str(job.user_id), p=job.platform)
            await self.storage.touch_profile(job.user_id, job.platform)
            return
        # 2. Process
        processed = [self.data_processor.normalize(i, platform=job.platform) for i in fetched.items]
        processed = self.data_processor.post_process(processed)
        # 3. Analyze (batch AI sentiment / topics / embeddings)
        analyzed = await self.ai_analyzer.analyze_mentions(processed, user_id=job.user_id)
        # 4. Store
        await self.storage.store_mentions(analyzed, user_id=job.user_id, platform=job.platform)
        # 5. Update sync timestamp
        await self.storage.touch_profile(job.user_id, job.platform)
        logger.info(
            "Completed monitoring job user={u} platform={p} fetched={f} stored={s}",
            u=str(job.user_id),
            p=job.platform,
            f=len(fetched.items),
            s=len(analyzed),
        )

    async def run_cycle(self, concurrency: int = 4) -> None:
        jobs = await self.schedule_due_jobs()
        if not jobs:
            logger.debug("No monitoring jobs due")
            return
        sem = asyncio.Semaphore(concurrency)

        async def _runner(j: ScheduledJob):
            async with sem:
                try:
                    await self.run_job(j)
                except Exception:
                    logger.exception("Error running job user={u} platform={p}", u=str(j.user_id), p=j.platform)

        await asyncio.gather(*[_runner(j) for j in jobs])

    async def manual_refresh(self, user_id: UUID, platform: str) -> bool:
        """Attempt a manual refresh respecting manual quota per user tier.

        Simplified: assume a user_manual_refreshes table (user_id, platform, count, period_start).
        Reset quota daily.
        """
        tier_res = await self.session.execute(
            text("SELECT tier FROM users WHERE id = :uid"), {"uid": str(user_id)}
        )
        tier_row = tier_res.first()
        tier = (tier_row[0] if tier_row else "free").lower()
        quota = MANUAL_REFRESH_QUOTAS.get(tier, MANUAL_REFRESH_QUOTAS["free"])

        # Upsert & check usage
        await self.session.execute(
            text(
                """
                INSERT INTO monitoring_manual_refreshes (user_id, platform, count, period_start)
                VALUES (:uid, :plat, 1, date_trunc('day', now()))
                ON CONFLICT (user_id, platform, period_start)
                DO UPDATE SET count = monitoring_manual_refreshes.count + 1
                RETURNING count
                """
            ),
            {"uid": str(user_id), "plat": platform},
        )
        res2 = await self.session.execute(
            text(
                """SELECT count FROM monitoring_manual_refreshes
                WHERE user_id = :uid AND platform = :plat AND period_start = date_trunc('day', now())"""
            ),
            {"uid": str(user_id), "plat": platform},
        )
        used = res2.scalar_one_or_none() or 0
        if used > quota:
            logger.info(
                "Manual refresh quota exceeded user={u} platform={p} used={used} quota={q}",
                u=str(user_id),
                p=platform,
                used=used,
                q=quota,
            )
            return False
        # Run immediate job
        await self.run_job(
            ScheduledJob(
                user_id=user_id,
                platform=platform,
                next_run_at=datetime.now(timezone.utc),
                tier=tier,
            )
        )
        return True
