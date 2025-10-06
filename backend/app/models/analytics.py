"""Analytics models for tracking metrics."""

from sqlalchemy import Column, Date, Integer, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AnalyticsSnapshot(Base):
    """Analytics snapshot model for historical data tracking."""

    __tablename__ = "analytics_snapshots"
    __table_args__ = (
        UniqueConstraint("location_id", "date", name="uq_location_date"),
    )

    location_id = Column(PGUUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    date = Column(Date, nullable=False)
    metrics = Column(JSONB, nullable=False)

    # Relationships
    location = relationship("Location", back_populates="analytics")

    def __repr__(self) -> str:
        return f"<AnalyticsSnapshot(location_id='{self.location_id}', date='{self.date}')>"

    def get_metric(self, key: str, default=None):
        """Get a specific metric value."""
        return self.metrics.get(key, default)

    @property
    def average_rating(self) -> float:
        """Get average rating from metrics."""
        return self.metrics.get("avg_rating", 0.0)

    @property
    def total_reviews(self) -> int:
        """Get total reviews count."""
        return self.metrics.get("total_reviews", 0)

    @property
    def response_rate(self) -> float:
        """Get response rate percentage."""
        return self.metrics.get("response_rate", 0.0)

    @property
    def sentiment_breakdown(self) -> dict:
        """Get sentiment breakdown."""
        return self.metrics.get("sentiment_breakdown", {
            "positive": 0,
            "neutral": 0,
            "negative": 0,
        })


class InteractionAnalytics(Base):
    """Analytics for interaction metrics by day/hour."""
    
    __tablename__ = "interaction_analytics"
    
    date = Column(Date, nullable=False, index=True)
    hour = Column(Integer)  # 0-23 for hourly metrics, NULL for daily
    
    # Counts
    total_interactions = Column(Integer, default=0)
    total_replied = Column(Integer, default=0)
    total_archived = Column(Integer, default=0)
    total_spam = Column(Integer, default=0)
    
    # By type
    comments_count = Column(Integer, default=0)
    dms_count = Column(Integer, default=0)
    mentions_count = Column(Integer, default=0)
    
    # By priority
    urgent_count = Column(Integer, default=0)
    important_count = Column(Integer, default=0)
    
    # Sentiment
    positive_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)
    neutral_count = Column(Integer, default=0)
    
    # Performance metrics
    avg_response_time_minutes = Column(Integer)
    response_rate = Column(Numeric(5, 2))  # Percentage (0-100)
    
    # Revenue & opportunities
    sales_count = Column(Integer, default=0)
    revenue = Column(Numeric(10, 2), default=0)
    collab_opportunities = Column(Integer, default=0)
    
    # Foreign keys
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    view_id = Column(PGUUID(as_uuid=True), ForeignKey('interaction_views.id', ondelete='CASCADE'), index=True)
    
    # Relationships
    view = relationship("InteractionView", back_populates="analytics")
    
    def __repr__(self):
        return f"<InteractionAnalytics {self.date} - {self.total_interactions} interactions>"