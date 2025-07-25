"""AI training data model."""

from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AITrainingData(Base):
    """AI training data model for improving response quality."""

    __tablename__ = "ai_training_data"

    location_id = Column(PGUUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    review_id = Column(PGUUID(as_uuid=True), ForeignKey("reviews.id"))
    original_response = Column(Text)
    edited_response = Column(Text)
    feedback_type = Column(String(50))

    # Relationships
    location = relationship("Location", back_populates="ai_training_data")
    review = relationship("Review", back_populates="ai_training_data")

    def __repr__(self) -> str:
        return f"<AITrainingData(location_id='{self.location_id}', feedback='{self.feedback_type}')>"