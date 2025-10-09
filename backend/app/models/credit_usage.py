"""
Credit usage tracking models.

1 credit = $0.10 of actual cost to us (API costs + compute)
Users get 100 free credits per month, reset on signup anniversary.
"""
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index, Boolean, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class ActionType(str, enum.Enum):
    """Types of actions that consume credits."""
    # AI Operations
    AI_CHAT_MESSAGE = "ai_chat_message"
    AI_COMMENT_RESPONSE = "ai_comment_response"
    AI_SENTIMENT_ANALYSIS = "ai_sentiment_analysis"
    AI_CONTENT_SUGGESTION = "ai_content_suggestion"
    
    # Automation
    WORKFLOW_EXECUTION = "workflow_execution"
    SCHEDULED_TASK = "scheduled_task"
    BULK_OPERATION = "bulk_operation"
    
    # Platform Features
    YOUTUBE_SYNC = "youtube_sync"
    COMMENT_FETCH = "comment_fetch"
    VIDEO_ANALYSIS = "video_analysis"
    ANALYTICS_GENERATION = "analytics_generation"
    
    # API Calls
    EXTERNAL_API_CALL = "external_api_call"


class CreditUsageEvent(Base):
    """Individual credit usage event - detailed tracking."""
    __tablename__ = "credit_usage_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Event details
    action_type = Column(SQLEnum(ActionType), nullable=False, index=True)
    description = Column(String(500), nullable=True)  # Human-readable description
    
    # Cost breakdown
    credits_charged = Column(Float, nullable=False)  # Total credits charged
    base_cost = Column(Float, default=0.0)  # Base cost component
    api_cost = Column(Float, default=0.0)  # Actual API cost (in dollars)
    compute_cost = Column(Float, default=0.0)  # Estimated compute cost (in dollars)
    
    # Metadata for AI operations
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    model_used = Column(String(100), nullable=True)
    
    # Additional context
    resource_id = Column(String(255), nullable=True)  # ID of related resource (workflow_id, video_id, etc.)
    resource_type = Column(String(100), nullable=True)  # Type of resource
    event_metadata = Column(JSON, nullable=True)  # Additional flexible metadata
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="credit_usage_events")

    # Indexes for common queries
    __table_args__ = (
        Index('idx_credit_events_user_date', 'user_id', 'created_at'),
        Index('idx_credit_events_action_date', 'action_type', 'created_at'),
    )

    def __repr__(self):
        return f"<CreditUsageEvent {self.action_type} user={self.user_id} credits={self.credits_charged}>"


class UserCreditBalance(Base):
    """Cached credit balance per user - for fast lookups."""
    __tablename__ = "user_credit_balances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Balance tracking
    current_balance = Column(Float, nullable=False, default=100.0)  # Current available credits
    total_earned = Column(Float, nullable=False, default=100.0)  # Total credits ever earned (resets, purchases)
    total_consumed = Column(Float, nullable=False, default=0.0)  # Total credits ever consumed
    
    # Monthly tracking
    monthly_allowance = Column(Float, nullable=False, default=100.0)  # How many credits they get per month
    month_start_balance = Column(Float, nullable=False, default=100.0)  # Balance at start of current month
    current_month_consumed = Column(Float, nullable=False, default=0.0)  # Credits used this month
    
    # Reset tracking
    last_reset_at = Column(DateTime, nullable=False, default=datetime.utcnow)  # When credits were last reset
    next_reset_at = Column(DateTime, nullable=False)  # When credits will next reset
    
    # Limits and flags
    is_unlimited = Column(Boolean, default=False)  # For admin/special accounts
    low_balance_notified = Column(Boolean, default=False)  # Has user been notified of low balance?
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="credit_balance")

    def __repr__(self):
        return f"<UserCreditBalance user={self.user_id} balance={self.current_balance}>"


class CreditActionCost(Base):
    """Configuration table for base costs of different actions."""
    __tablename__ = "credit_action_costs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_type = Column(SQLEnum(ActionType), nullable=False, unique=True, index=True)
    
    # Cost configuration
    base_cost_dollars = Column(Float, nullable=False, default=0.0)  # Base cost in dollars
    compute_cost_dollars = Column(Float, nullable=False, default=0.0)  # Estimated compute cost
    
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<CreditActionCost {self.action_type} cost=${self.base_cost_dollars + self.compute_cost_dollars}>"
