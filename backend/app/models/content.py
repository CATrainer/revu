"""Content models for tracking social media posts and their performance."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Numeric, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class ContentPiece(Base):
    """Model for individual content pieces across platforms."""
    
    __tablename__ = "content_pieces"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), index=True)
    
    # Platform info
    platform = Column(String(32), nullable=False, index=True)  # youtube, instagram, tiktok
    platform_id = Column(String(255), nullable=False, unique=True, index=True)  # External platform ID
    content_type = Column(String(50), nullable=False, index=True)  # video, short, reel, post, story
    
    # Basic content information
    title = Column(Text, nullable=False)
    description = Column(Text)
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text)
    
    # Content metadata
    duration_seconds = Column(Integer)  # For video content
    hashtags = Column(ARRAY(String(100)))
    mentions = Column(ARRAY(String(100)))
    caption = Column(Text)
    
    # Publishing info
    published_at = Column(DateTime, nullable=False, index=True)
    timezone = Column(String(50))
    day_of_week = Column(Integer)  # 0-6 (Monday-Sunday)
    hour_of_day = Column(Integer)  # 0-23
    
    # Creator context at time of posting
    follower_count_at_post = Column(Integer)
    
    # AI-generated metadata
    theme = Column(String(100), index=True)  # Tutorial, Behind the Scenes, Storytime, Tips, etc.
    summary = Column(Text)  # AI-generated brief summary
    detected_topics = Column(ARRAY(String(100)))
    
    # Status
    is_deleted = Column(Boolean, default=False)
    last_synced_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    performance = relationship("ContentPerformance", back_populates="content", uselist=False, cascade="all, delete-orphan")
    insights = relationship("ContentInsight", back_populates="content", cascade="all, delete-orphan")
    user = relationship("User", back_populates="content_pieces")
    
    __table_args__ = (
        Index('idx_content_user_platform', 'user_id', 'platform'),
        Index('idx_content_published', 'user_id', 'published_at'),
        Index('idx_content_theme', 'user_id', 'theme'),
    )
    
    def __repr__(self):
        return f"<ContentPiece {self.id} - {self.platform} {self.content_type}: {self.title[:50]}>"


class ContentPerformance(Base):
    """Performance metrics for content pieces."""
    
    __tablename__ = "content_performance"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id = Column(UUID(as_uuid=True), ForeignKey('content_pieces.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Core metrics (available on most platforms)
    views = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    
    # Video-specific metrics
    watch_time_minutes = Column(Integer)
    average_view_duration_seconds = Column(Integer)
    retention_rate = Column(Numeric(5, 2))  # Percentage
    
    # Engagement metrics
    engagement_rate = Column(Numeric(5, 2))  # Percentage
    click_through_rate = Column(Numeric(5, 2))  # Percentage
    
    # Growth metrics
    followers_gained = Column(Integer, default=0)
    profile_visits = Column(Integer, default=0)
    
    # Revenue (if applicable)
    revenue = Column(Numeric(10, 2))
    
    # Calculated performance metrics
    performance_score = Column(Numeric(5, 2))  # 0-100 score relative to user's content
    percentile_rank = Column(Integer)  # 0-100 percentile
    performance_category = Column(String(20), index=True)  # overperforming, normal, underperforming
    
    # Recent velocity (last 24 hours)
    views_last_24h = Column(Integer, default=0)
    engagement_last_24h = Column(Integer, default=0)
    
    # Platform-specific metrics (stored as JSONB for flexibility)
    platform_specific_metrics = Column(JSONB)
    
    # Timestamps
    calculated_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    content = relationship("ContentPiece", back_populates="performance")
    
    def __repr__(self):
        return f"<ContentPerformance {self.content_id} - Score: {self.performance_score}>"


class ContentInsight(Base):
    """AI-generated insights about content performance."""
    
    __tablename__ = "content_insights"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id = Column(UUID(as_uuid=True), ForeignKey('content_pieces.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Insight details
    insight_type = Column(String(50), nullable=False)  # success_factor, failure_factor, pattern, recommendation
    category = Column(String(100))  # timing, topic, format, engagement, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    impact_level = Column(String(20))  # high, medium, low
    
    # Supporting data
    supporting_data = Column(JSONB)  # Specific metrics or evidence
    confidence_score = Column(Numeric(3, 2))  # 0-1 confidence in this insight
    
    # Context
    is_positive = Column(Boolean)  # True for success factors, False for issues
    is_actionable = Column(Boolean, default=False)  # Can user act on this?
    
    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    content = relationship("ContentPiece", back_populates="insights")
    
    __table_args__ = (
        Index('idx_insight_content_type', 'content_id', 'insight_type'),
    )
    
    def __repr__(self):
        return f"<ContentInsight {self.id} - {self.title}>"


class ContentTheme(Base):
    """Content themes/categories with aggregate performance."""
    
    __tablename__ = "content_themes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Theme details
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7))  # Hex color for UI
    
    # Aggregate metrics (updated periodically)
    content_count = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    avg_engagement_rate = Column(Numeric(5, 2))
    avg_performance_score = Column(Numeric(5, 2))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_calculated_at = Column(DateTime)
    
    # Relationships
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_theme_user_name', 'user_id', 'name', unique=True),
    )
    
    def __repr__(self):
        return f"<ContentTheme {self.name} - {self.content_count} pieces>"


class ActionPlan(Base):
    """Action plans created from insights and AI conversations."""
    
    __tablename__ = "action_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Plan details
    name = Column(String(255), nullable=False)
    description = Column(Text)
    goal = Column(Text, nullable=False)
    
    # Context
    source_type = Column(String(50))  # content_insight, ai_chat, manual
    source_content_id = Column(UUID(as_uuid=True), ForeignKey('content_pieces.id', ondelete='SET NULL'))
    source_chat_session_id = Column(UUID(as_uuid=True), ForeignKey('ai_chat_sessions.id', ondelete='SET NULL'))
    
    # Timeline
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    estimated_duration_days = Column(Integer)
    
    # Status tracking
    status = Column(String(20), default='active', index=True)  # active, completed, paused, cancelled
    progress_percentage = Column(Integer, default=0)
    
    # Results tracking
    projected_outcomes = Column(JSONB)  # Expected results
    actual_outcomes = Column(JSONB)  # Actual results after completion
    completion_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="action_plans")
    action_items = relationship("ActionItem", back_populates="plan", cascade="all, delete-orphan", order_by="ActionItem.order_index")
    source_content = relationship("ContentPiece", foreign_keys=[source_content_id])
    source_chat = relationship("ChatSession", foreign_keys=[source_chat_session_id])
    
    __table_args__ = (
        Index('idx_action_plan_user_status', 'user_id', 'status'),
        Index('idx_action_plan_dates', 'start_date', 'end_date'),
    )
    
    def __repr__(self):
        return f"<ActionPlan {self.name} - {self.status}>"


class ActionItem(Base):
    """Individual action items within an action plan."""
    
    __tablename__ = "action_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('action_plans.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Item details
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, nullable=False)  # For ordering within plan
    
    # Timeline
    due_date = Column(DateTime, index=True)
    estimated_hours = Column(Integer)
    
    # Status
    is_completed = Column(Boolean, default=False, index=True)
    completed_at = Column(DateTime)
    
    # Expected vs actual
    projected_outcome = Column(Text)  # What we expect to happen
    actual_outcome = Column(Text)  # What actually happened
    
    # Linked content
    linked_content_id = Column(UUID(as_uuid=True), ForeignKey('content_pieces.id', ondelete='SET NULL'))
    
    # Notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    plan = relationship("ActionPlan", back_populates="action_items")
    linked_content = relationship("ContentPiece", foreign_keys=[linked_content_id])
    
    __table_args__ = (
        Index('idx_action_item_plan_order', 'plan_id', 'order_index'),
        Index('idx_action_item_due_date', 'due_date'),
    )
    
    def __repr__(self):
        return f"<ActionItem {self.title} - {'✓' if self.is_completed else '○'}>"
