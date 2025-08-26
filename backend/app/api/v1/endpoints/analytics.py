"""
Analytics endpoints for dashboard and reporting.
"""

from typing import Dict, Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User, UserMembership
from app.models.location import Location
from app.models.review import Review
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
    # Demo mode removed; fall back to real data only
    # Verify user has access to location
    result = await db.execute(
        select(Location)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Location.id == location_id,
            UserMembership.user_id == current_user.id,
        )
    )
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=date_range)
    
    # Get review statistics
    review_stats = await db.execute(
        select(
            func.count(Review.id).label("total_reviews"),
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).filter(Review.review_reply.is_not(None)).label("responded_count"),
            func.count(Review.id).filter(Review.rating >= 4).label("positive_count"),
            func.count(Review.id).filter(Review.rating <= 2).label("negative_count"),
        )
        .where(
            Review.location_id == location_id,
            Review.published_at >= start_date,
        )
    )
    stats = review_stats.one()
    
    # Calculate response rate
    response_rate = (
        (stats.responded_count / stats.total_reviews * 100) 
        if stats.total_reviews > 0 else 0
    )
    
    # Get recent reviews count (last 7 days)
    recent_count_result = await db.execute(
        select(func.count(Review.id))
        .where(
            Review.location_id == location_id,
            Review.published_at >= datetime.utcnow() - timedelta(days=7),
        )
    )
    recent_count = recent_count_result.scalar()
    
    # Get reviews needing response
    pending_result = await db.execute(
        select(func.count(Review.id))
        .where(
            Review.location_id == location_id,
            Review.review_reply.is_(None),
            Review.rating <= 3,
        )
    )
    pending_count = pending_result.scalar()
    
    return DashboardMetrics(
        avg_rating=float(stats.avg_rating or 0),
        total_reviews=stats.total_reviews,
        response_rate=response_rate,
        reviews_this_week=recent_count,
        pending_responses=pending_count,
        sentiment_score=calculate_sentiment_score(stats),
        positive_reviews=stats.positive_count,
        negative_reviews=stats.negative_count,
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