"""
User Feedback Model for bug reports and feature requests.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
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
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Feedback content
    feedback_type = Column(SQLEnum(FeedbackType), nullable=False, default=FeedbackType.GENERAL)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Page/context info
    page_url = Column(String(500), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Status tracking
    status = Column(SQLEnum(FeedbackStatus), nullable=False, default=FeedbackStatus.NEW)
    admin_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="feedback")
    
    def __repr__(self):
        return f"<UserFeedback {self.id}: {self.feedback_type.value} - {self.title[:50]}>"
