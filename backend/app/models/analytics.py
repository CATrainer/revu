"""Analytics snapshot model."""

from sqlalchemy import Column, Date, ForeignKey, UniqueConstraint
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