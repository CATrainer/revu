"""Review and review response models."""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Review(Base):
    """Review model for storing customer reviews from various platforms."""

    __tablename__ = "reviews"

    location_id = Column(PGUUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    platform = Column(String(50), nullable=False)
    platform_review_id = Column(String(255))
    author_name = Column(String(255))
    author_id = Column(String(255))
    rating = Column(Integer, nullable=False)
    review_text = Column(Text)
    review_reply = Column(Text)
    published_at = Column(DateTime(timezone=True))
    replied_at = Column(DateTime(timezone=True))
    sentiment = Column(String(50))
    sentiment_score = Column(Float)
    tags = Column(ARRAY(String), default=list)
    staff_mentions = Column(ARRAY(String), default=list)
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String(255))
    meta_data = Column(JSONB, default=dict, nullable=False)

    # Relationships
    location = relationship("Location", back_populates="reviews")
    responses = relationship("ReviewResponse", back_populates="review", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Review(platform='{self.platform}', rating={self.rating}, location_id='{self.location_id}')>"

    @property
    def needs_response(self) -> bool:
        """Check if review needs a response."""
        return self.review_reply is None and self.rating <= 3

    @property
    def is_positive(self) -> bool:
        """Check if review is positive."""
        return self.rating >= 4

    @property
    def is_negative(self) -> bool:
        """Check if review is negative."""
        return self.rating <= 2

    @property
    def is_neutral(self) -> bool:
        """Check if review is neutral."""
        return self.rating == 3


class ReviewResponse(Base):
    """Review response model for tracking AI and manual responses."""

    __tablename__ = "review_responses"

    review_id = Column(PGUUID(as_uuid=True), ForeignKey("reviews.id"), nullable=False)
    response_text = Column(Text, nullable=False)
    response_type = Column(String(50), nullable=False)
    ai_model = Column(String(50))
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    sent_at = Column(DateTime(timezone=True))
    status = Column(String(50), default="draft", nullable=False)
    approval_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    approval_at = Column(DateTime(timezone=True))
    error_message = Column(Text)

    # Relationships
    review = relationship("Review", back_populates="responses")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="review_responses_created")
    approval_by = relationship("User", foreign_keys=[approval_by_id], back_populates="review_responses_approved")
    ai_training_data = relationship("AITrainingData", back_populates="review", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ReviewResponse(review_id='{self.review_id}', status='{self.status}')>"

    @property
    def is_sent(self) -> bool:
        """Check if response has been sent."""
        return self.status == "sent" and self.sent_at is not None

    @property
    def is_approved(self) -> bool:
        """Check if response has been approved."""
        return self.status in ["approved", "sent"]