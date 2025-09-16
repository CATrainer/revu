"""
Analytics endpoints for dashboard and reporting.
Adds API usage and AI response analytics for the dashboard.
"""

from typing import Dict, Optional, Any, List
from uuid import UUID
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
# Removed imports for Location and Review models (not needed for social media focus)
from app.models.analytics import AnalyticsSnapshot
from app.schemas.analytics import (
    DashboardMetrics,
    ReviewAnalytics,
    SentimentBreakdown,
    CompetitorComparison,
)
from app.services.demo_adapter import DemoDataAdapter

router = APIRouter()


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
    date_range: int = Query(30, description="Number of days to analyze"),
):
    """
    Get dashboard metrics for a location.
    """
    # Analytics not implemented for social media focus
    raise HTTPException(
        status_code=501,
        detail="Location-based analytics not implemented for social media focus"
    )


@router.get("/reviews", response_model=ReviewAnalytics)
async def get_review_analytics(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """
    Get detailed review analytics for a location.
    """
    # TODO: Implement review analytics
    # - Rating distribution over time
    # - Review velocity trends
    # - Platform breakdown
    # - Top keywords/topics
    
    return ReviewAnalytics(
        location_id=location_id,
        period_start=start_date or date.today() - timedelta(days=30),
        period_end=end_date or date.today(),
        rating_distribution={
            "5": 100,
            "4": 50,
            "3": 20,
            "2": 10,
            "1": 5,
        },
        review_velocity=[],  # Daily counts
        platform_breakdown={
            "google": 150,
            "tripadvisor": 35,
        },
    )


@router.get("/sentiment", response_model=SentimentBreakdown)
async def get_sentiment_analysis(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
):
    """
    Get sentiment analysis breakdown.
    """
    # TODO: Implement sentiment analysis
    return SentimentBreakdown(
        location_id=location_id,
        positive_percentage=70,
        negative_percentage=20,
        neutral_percentage=10,
        trending_topics=[
            {"topic": "service", "mentions": 45, "sentiment": "positive"},
            {"topic": "food quality", "mentions": 38, "sentiment": "positive"},
            {"topic": "wait time", "mentions": 15, "sentiment": "negative"},
        ],
    )


def calculate_sentiment_score(stats) -> float:
    """Calculate overall sentiment score from stats."""
    if stats.total_reviews == 0:
        return 0.0
    
    # Simple sentiment calculation based on ratings
    positive_weight = stats.positive_count * 1.0
    negative_weight = stats.negative_count * -1.0
    neutral_weight = (stats.total_reviews - stats.positive_count - stats.negative_count) * 0.2
    
    score = (positive_weight + negative_weight + neutral_weight) / stats.total_reviews
    # Normalize to 0-100 scale
    return max(0, min(100, (score + 1) * 50))


# New analytics endpoints for API usage/LLM metrics

@router.get("/usage/summary")
async def get_usage_summary(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    days: int = 30,
):
    """Return daily usage, totals, cost, avg latency, and cache rate over a window.

    Uses api_usage_log and response_metrics.
    """
    start = datetime.utcnow() - timedelta(days=max(1, days))

    # Daily API usage counts and cost from api_usage_log
    usage_rows = await db.execute(
        text(
            """
            SELECT date_trunc('day', created_at) AS day,
                   COUNT(*) AS calls,
                   COALESCE(SUM(estimated_cost_usd), 0) AS cost,
                   AVG(NULLIF(latency_ms, 0)) AS avg_latency
            FROM api_usage_log
            WHERE created_at >= :start
            GROUP BY 1
            ORDER BY 1
            """
        ),
        {"start": start},
    )
    usage_series = [
        {
            "date": r[0].date().isoformat(),
            "calls": int(r[1] or 0),
            "cost": float(r[2] or 0),
            "avg_latency": float(r[3] or 0),
        }
        for r in usage_rows.fetchall()
    ]

    # Totals
    totals_row = await db.execute(
        text(
            """
            SELECT COUNT(*) AS calls, COALESCE(SUM(estimated_cost_usd), 0) AS cost,
                   AVG(NULLIF(latency_ms, 0)) AS avg_latency
            FROM api_usage_log
            WHERE created_at >= :start
            """
        ),
        {"start": start},
    )
    calls, cost, avg_latency = totals_row.first() or (0, 0, 0)

    # Cache hit rate from response_metrics across channels
    cache_row = await db.execute(
        text(
            """
            SELECT COALESCE(SUM(cache_hits), 0) AS cache_hits,
                   COALESCE(SUM(responses_generated), 0) AS generated
            FROM response_metrics
            WHERE stats_date >= :d
            """
        ),
        {"d": start.date()},
    )
    ch, gen = cache_row.first() or (0, 0)
    cache_rate = float(ch) / float(gen) * 100.0 if gen else 0.0

    return {
        "series": usage_series,
        "totals": {"calls": int(calls or 0), "cost": float(cost or 0), "avg_latency": float(avg_latency or 0)},
        "cache_rate": cache_rate,
    }


@router.get("/usage/buckets")
async def get_usage_buckets(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Return daily/weekly/monthly aggregates for api usage and cost."""
    # Daily for last 30, weekly for last 12, monthly for last 12
    now = datetime.utcnow()
    start_daily = now - timedelta(days=30)
    start_weekly = now - timedelta(weeks=12)
    start_monthly = now - timedelta(days=365)

    def build_series(rows) -> List[Dict[str, Any]]:
        return [
            {"date": r[0].date().isoformat(), "calls": int(r[1] or 0), "cost": float(r[2] or 0)} for r in rows
        ]

    daily_res = await db.execute(
        text(
            """
            SELECT date_trunc('day', created_at) AS bucket, COUNT(*), COALESCE(SUM(estimated_cost_usd), 0)
            FROM api_usage_log
            WHERE created_at >= :start
            GROUP BY 1
            ORDER BY 1
            """
        ),
        {"start": start_daily},
    )
    weekly_res = await db.execute(
        text(
            """
            SELECT date_trunc('week', created_at) AS bucket, COUNT(*), COALESCE(SUM(estimated_cost_usd), 0)
            FROM api_usage_log
            WHERE created_at >= :start
            GROUP BY 1
            ORDER BY 1
            """
        ),
        {"start": start_weekly},
    )
    monthly_res = await db.execute(
        text(
            """
            SELECT date_trunc('month', created_at) AS bucket, COUNT(*), COALESCE(SUM(estimated_cost_usd), 0)
            FROM api_usage_log
            WHERE created_at >= :start
            GROUP BY 1
            ORDER BY 1
            """
        ),
        {"start": start_monthly},
    )

    return {
        "daily": build_series(daily_res.fetchall()),
        "weekly": build_series(weekly_res.fetchall()),
        "monthly": build_series(monthly_res.fetchall()),
    }


@router.get("/classifications")
async def get_classification_counts(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    days: int = 30,
):
    """Return most common comment classifications over a time window."""
    start = datetime.utcnow() - timedelta(days=max(1, days))
    rows = await db.execute(
        text(
            """
            SELECT classification, COUNT(1) AS c
            FROM comments_queue
            WHERE created_at >= :start AND classification IS NOT NULL
            GROUP BY classification
            ORDER BY c DESC
            LIMIT 10
            """
        ),
        {"start": start},
    )
    return [{"classification": r[0], "count": int(r[1] or 0)} for r in rows.fetchall()]


@router.get("/reliability/overview")
async def get_reliability_overview(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    limit: int = 25,
):
    """Return DLQ totals and recent error logs for quick diagnostics."""
    dlq_res = await db.execute(text("SELECT COUNT(*) FROM comments_dead_letter"))
    dlq_total = int(dlq_res.scalar() or 0)

    err_res = await db.execute(
        text(
            """
            SELECT service_name, operation, error_code, message, created_at
            FROM error_logs
            ORDER BY created_at DESC
            LIMIT :lim
            """
        ),
        {"lim": int(max(1, min(limit, 100)))},
    )
    recent = [
        {
            "service": r[0],
            "operation": r[1],
            "code": r[2],
            "message": r[3],
            "at": r[4].isoformat() if r[4] else None,
        }
        for r in err_res.fetchall()
    ]
    return {"dlq_total": dlq_total, "recent_errors": recent}