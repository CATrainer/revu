"""Interaction Thread model for grouping related interactions."""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class InteractionThread(Base):
    """Groups interactions by author to show conversation history."""
    
    __tablename__ = "interaction_threads"
    
    # Author identification
    author_username = Column(String(255), nullable=False, index=True)
    author_name = Column(String(255))
    platform = Column(String(32), nullable=False)
    
    # Thread metadata
    interaction_count = Column(Integer, default=1)
    first_interaction_at = Column(DateTime)
    last_interaction_at = Column(DateTime, index=True)
    sentiment_summary = Column(String(16))  # Overall sentiment across thread
    is_customer = Column(Boolean, default=False)
    total_revenue = Column(Numeric(10, 2), default=0)
    
    # Foreign keys
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    fan_id = Column(PGUUID(as_uuid=True), ForeignKey('fans.id'))
    
    # Relationships
    interactions = relationship("Interaction", back_populates="thread", cascade="all, delete-orphan")
    fan = relationship("Fan", back_populates="threads")
    
    def __repr__(self):
        return f"<InteractionThread {self.id} - {self.author_username} ({self.interaction_count} interactions)>"
