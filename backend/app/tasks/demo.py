"""Background tasks to simulate ongoing demo activity and reports."""

from __future__ import annotations

from datetime import datetime

from loguru import logger
from sqlalchemy import select

from app.core.celery import celery_app
from app.core.database import async_session_maker
# Removed DemoAccount import - model doesn't exist
from app.models.analytics import AnalyticsSnapshot
# Removed Location import (not needed for social media focus)
from app.models.user import User
from app.services.demo_data import DemoDataService
from datetime import date, timedelta


@celery_app.task
def simulate_ongoing_activity() -> dict:
    """Demo activity simulation disabled for social media focus."""
    logger.info("Demo activity simulation disabled - models don't exist")
    return {"created": 0, "status": "disabled"}


@celery_app.task
def generate_weekly_report() -> dict:
    """Generate realistic weekly reports for demo accounts (placeholder)."""
    logger.info("Generating weekly demo reports...")
    # In a full implementation, aggregate last 7 days from demo tables
    return {"status": "ok", "generated_at": datetime.utcnow().isoformat()}


@celery_app.task
def cleanup_expired_demo_users() -> dict:
    """Delete temporary demo users older than 24 hours (simplified for social media focus)."""
    removed = 0
    async def _run():
        nonlocal removed
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(hours=24)
        async with async_session_maker() as session:
            res = await session.execute(
                select(User).where(
                    User.email.like("demo+%@example.com"),
                    User.created_at <= cutoff,
                )
            )
            users = list(res.scalars())
            for u in users:
                await session.delete(u)
                removed += 1
            await session.commit()
    import asyncio
    asyncio.get_event_loop().run_until_complete(_run())
    return {"removed": removed}


@celery_app.task
def backfill_demo_analytics() -> dict:
    """Demo analytics backfill disabled for social media focus."""
    logger.info("Demo analytics backfill disabled - Location model doesn't exist")
    return {"snapshots_created": 0, "status": "disabled"}


def seed_demo_competitors(demo_account_id: str) -> None:
    """Placeholder: add competitor accounts for comparison features.

    In a full implementation, this would create Competitor rows tied to a Location.
    """
    logger.info(f"Seed competitors for demo account {demo_account_id} (placeholder)")
