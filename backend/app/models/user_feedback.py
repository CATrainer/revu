"""
User Feedback Model for bug reports and feature requests.
"""

from datetime import datetime
from uuid import UUID
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class FeedbackType(str, enum.Enum):
    """Types of feedback users can submit."""
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    GENERAL = "general"
    IMPROVEMENT = "improvement"


class FeedbackStatus(str, enum.Enum):
    """Status of feedback items."""
    NEW = "new"
    REVIEWING = "reviewing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    WONT_FIX = "wont_fix"


class UserFeedback(Base):
    """User feedback model for storing bug reports and feature requests."""
    
    __tablename__ = "user_feedback"
    
    # Note: id, created_at, updated_at inherited from Base (UUID primary key)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Feedback content
    # Use String type that references the PostgreSQL enum directly
    feedback_type = Column(String, nullable=False, default="general")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Page/context info
    page_url = Column(String(500), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Status tracking
    # Use String type that references the PostgreSQL enum directly
    status = Column(String, nullable=False, default="new")
    admin_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Note: created_at and updated_at are inherited from Base
    
    # Relationships
    user = relationship("User", back_populates="feedback")
    
    def __repr__(self):
        return f"<UserFeedback {self.id}: {self.feedback_type} - {self.title[:50]}>"
