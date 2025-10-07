"""Response queue model for rate-limited, human-like response sending."""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class ResponseQueue(Base):
    """Queue for managing rate-limited responses to interactions.
    
    Ensures we don't flood platforms with responses and maintains human-like behavior.
    """
    
    __tablename__ = "response_queue"
    
    # What we're responding to
    interaction_id = Column(PGUUID(as_uuid=True), ForeignKey('interactions.id'), nullable=False, index=True)
    
    # Response details
    response_text = Column(Text, nullable=False)
    platform = Column(String(32), nullable=False, index=True)  # For rate limiting per platform
    
    # Queue management
    status = Column(String(20), default='pending', index=True)  # pending, processing, sent, failed
    priority = Column(Integer, default=50)  # Higher = more urgent
    
    # Scheduling
    scheduled_for = Column(DateTime, nullable=True, index=True)  # When to send (with randomization)
    attempted_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    
    # Batch tracking
    batch_id = Column(String(50), nullable=True, index=True)  # Group responses into batches
    retry_count = Column(Integer, default=0)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    error_data = Column(JSONB, nullable=True)
    
    # Context
    workflow_id = Column(PGUUID(as_uuid=True), ForeignKey('workflows.id'), nullable=True)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey('organizations.id'), nullable=True, index=True)
    
    # Relationships
    interaction = relationship("Interaction", foreign_keys=[interaction_id])
    workflow = relationship("Workflow", foreign_keys=[workflow_id])
    
    def __repr__(self):
        return f"<ResponseQueue {self.id} - {self.platform} - {self.status}>"


class PlatformRateLimit(Base):
    """Track rate limits per platform to ensure we stay within API limits."""
    
    __tablename__ = "platform_rate_limits"
    
    # Platform info
    platform = Column(String(32), nullable=False, index=True)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    
    # Rate limit configuration
    max_per_hour = Column(Integer, default=60)  # Max responses per hour
    max_per_minute = Column(Integer, default=5)  # Max responses per minute
    min_interval_seconds = Column(Integer, default=10)  # Minimum seconds between responses
    
    # Current usage tracking
    responses_last_hour = Column(Integer, default=0)
    responses_last_minute = Column(Integer, default=0)
    last_response_at = Column(DateTime, nullable=True)
    
    # Human-like randomization
    add_random_delay = Column(Boolean, default=True)  # Add 5-30 second random delays
    min_delay_seconds = Column(Integer, default=5)
    max_delay_seconds = Column(Integer, default=30)
    
    # Window tracking
    hour_window_start = Column(DateTime, nullable=True)
    minute_window_start = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<PlatformRateLimit {self.platform} - {self.user_id}>"
