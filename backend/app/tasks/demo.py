"""Background tasks to simulate ongoing demo activity and reports."""

from __future__ import annotations

from datetime import datetime

from loguru import logger
from sqlalchemy import select

from app.core.celery import celery_app
from app.core.database import async_session_maker
from app.models.demo import DemoAccount
from app.models.analytics import AnalyticsSnapshot
# Removed Location import (not needed for social media focus)
from app.models.user import User
from app.services.demo_data import DemoDataService
from datetime import date, timedelta


@celery_app.task
def simulate_ongoing_activity() -> dict:
    """Run periodically to simulate ongoing platform activity."""
    logger.info("Simulating ongoing demo activity...")
    created_total = 0
    async def _run():
        nonlocal created_total
        async with async_session_maker() as session:
            res = await session.execute(select(DemoAccount))
            accounts = list(res.scalars())
            service = DemoDataService(session)
            for acc in accounts:
                result = await service.simulate_new_activity(acc)
                created_total += result.get("created", 0)
    import asyncio
    asyncio.get_event_loop().run_until_complete(_run())
    return {"created": created_total}


@celery_app.task
def generate_weekly_report() -> dict:
    """Generate realistic weekly reports for demo accounts (placeholder)."""
    logger.info("Generating weekly demo reports...")
    # In a full implementation, aggregate last 7 days from demo tables
    return {"status": "ok", "generated_at": datetime.utcnow().isoformat()}


@celery_app.task
def cleanup_expired_demo_users() -> dict:
    """Delete temporary demo users and their demo data older than 24 hours."""
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
                # delete associated demo account if any
                acc_res = await session.execute(select(DemoAccount).where(DemoAccount.email == u.email))
                acc = acc_res.scalar_one_or_none()
                if acc:
                    await session.delete(acc)
                await session.delete(u)
                removed += 1
            await session.commit()
    import asyncio
    asyncio.get_event_loop().run_until_complete(_run())
    return {"removed": removed}


@celery_app.task
def backfill_demo_analytics() -> dict:
    """Create 30 days of historical analytics for demo accounts.

    For each demo account, generate daily snapshots in AnalyticsSnapshot
    based on current demo comments distribution.
    """
    created = 0
    async def _run():
        nonlocal created
        async with async_session_maker() as session:
            # We need a location to attach snapshots; use any existing location or skip
            loc_res = await session.execute(select(Location).limit(1))
            location = loc_res.scalar_one_or_none()
            if not location:
                logger.warning("No locations found; skipping backfill_demo_analytics")
                return

            # Build simple synthetic metrics with small trends
            today = date.today()
            for d in range(30, 0, -1):
                day = today - timedelta(days=d)
                # naive trend
                total_reviews = 50 + (30 - d) // 3
                avg_rating = 4.2 + ((30 - d) % 5) * 0.01
                response_rate = 70 + ((30 - d) % 10)
                metrics = {
                    "avg_rating": round(avg_rating, 2),
                    "total_reviews": int(total_reviews),
                    "response_rate": float(response_rate),
                    "sentiment_breakdown": {"positive": 70, "neutral": 20, "negative": 10},
                }
                snap = AnalyticsSnapshot(location_id=location.id, date=day, metrics=metrics)
                session.add(snap)
                created += 1
            await session.commit()
    import asyncio
    asyncio.get_event_loop().run_until_complete(_run())
    return {"snapshots_created": created}


def seed_demo_competitors(demo_account_id: str) -> None:
    """Placeholder: add competitor accounts for comparison features.

    In a full implementation, this would create Competitor rows tied to a Location.
    """
    logger.info(f"Seed competitors for demo account {demo_account_id} (placeholder)")
