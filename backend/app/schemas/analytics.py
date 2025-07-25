"""
Analytics schemas for dashboard and reporting.
"""

from datetime import date
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DashboardMetrics(BaseModel):
    """Dashboard overview metrics."""
    avg_rating: float = Field(..., ge=0, le=5)
    total_reviews: int = Field(..., ge=0)
    response_rate: float = Field(..., ge=0, le=100)
    reviews_this_week: int = Field(..., ge=0)
    pending_responses: int = Field(..., ge=0)
    sentiment_score: float = Field(..., ge=0, le=100)
    positive_reviews: int = Field(..., ge=0)
    negative_reviews: int = Field(..., ge=0)


class ReviewAnalytics(BaseModel):
    """Detailed review analytics."""
    location_id: UUID
    period_start: date
    period_end: date
    rating_distribution: Dict[str, int]
    review_velocity: List[Dict[str, int]]  # [{"date": "2024-01-01", "count": 5}, ...]
    platform_breakdown: Dict[str, int]
    average_response_time_hours: Optional[float] = None


class SentimentBreakdown(BaseModel):
    """Sentiment analysis results."""
    location_id: UUID
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float
    trending_topics: List[Dict[str, any]]


class CompetitorComparison(BaseModel):
    """Competitor comparison data."""
    location_id: UUID
    competitors: List[Dict[str, any]]
    ranking: Dict[str, int]  # {"rating": 1, "reviews": 3, "response_rate": 1}
    insights: List[str]