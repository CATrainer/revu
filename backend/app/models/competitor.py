"""Competitor tracking model."""

from sqlalchemy import Boolean, Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Competitor(Base):
    """Competitor model for tracking competitor businesses."""

    __tablename__ = "competitors"

    location_id = Column(PGUUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)
    platform_id = Column(String(255))
    tracking_enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    location = relationship("Location", back_populates="competitors")

    def __repr__(self) -> str:
        return f"<Competitor(name='{self.name}', platform='{self.platform}')>"