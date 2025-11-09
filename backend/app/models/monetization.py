"""Monetization engine models for creator opportunities."""

from datetime import datetime, date
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Boolean, Column, DateTime, Date, Integer, String, Text, 
    ForeignKey, UniqueConstraint, CheckConstraint, Numeric, Index
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class CreatorProfile(Base):
    """Creator profile with platform metrics and audience data."""
    
    __tablename__ = "creator_profiles"
    
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Required fields
    primary_platform = Column(String(50), nullable=False)  # 'youtube', 'instagram', 'tiktok', 'twitch'
    follower_count = Column(Integer, nullable=False)
    engagement_rate = Column(Numeric(5, 2), nullable=False)  # e.g., 6.84
    niche = Column(String(100), nullable=False)  # 'fashion', 'gaming', 'wellness', 'tech'
    
    # Optional but valuable fields
    platform_url = Column(String(500))
    avg_content_views = Column(Integer)
    content_frequency = Column(Integer)  # posts per week
    audience_demographics = Column(JSONB)  # {age_range, gender_split, top_locations}
    community_signals = Column(JSONB)  # {avg_comments, repeat_commenters, dm_volume}
    creator_personality = Column(String(50))  # 'casual', 'professional', 'educational'
    time_available_hours_per_week = Column(Integer)
    
    # Relationships
    user = relationship("User", back_populates="creator_profile")
    
    def __repr__(self) -> str:
        return f"<CreatorProfile(user_id={self.user_id}, platform={self.primary_platform})>"


class ActiveProject(Base):
    """Active monetization project for a creator."""
    
    __tablename__ = "active_projects"
    
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Opportunity details
    opportunity_id = Column(String(100), nullable=False, default="premium-community")
    opportunity_title = Column(String(200), nullable=False, default="Premium Community")
    opportunity_category = Column(String(50), nullable=False, default="community")
    
    # Project state
    status = Column(String(20), nullable=False, default="active")  # 'active', 'completed', 'abandoned'
    current_phase_index = Column(Integer, nullable=False, default=0)
    
    # Progress tracking (0-100 for each)
    overall_progress = Column(Integer, nullable=False, default=0)
    planning_progress = Column(Integer, nullable=False, default=0)  # 5 key decisions
    execution_progress = Column(Integer, nullable=False, default=0)  # 22 tasks
    timeline_progress = Column(Integer)  # nullable if no target date
    
    # Timeline
    started_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    target_launch_date = Column(Date)
    last_activity_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True))
    
    # The implementation plan (JSONB for flexibility)
    customized_plan = Column(JSONB, nullable=False)  # copy of opportunity template
    
    # Relationships
    user = relationship("User", back_populates="active_project")
    chat_messages = relationship("ProjectChatMessage", back_populates="project", cascade="all, delete-orphan")
    task_completions = relationship("ProjectTaskCompletion", back_populates="project", cascade="all, delete-orphan")
    decisions = relationship("ProjectDecision", back_populates="project", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("user_id", name="one_project_per_user"),
        CheckConstraint("status IN ('active', 'completed', 'abandoned')", name="valid_status"),
        CheckConstraint("overall_progress >= 0 AND overall_progress <= 100", name="valid_overall_progress"),
        CheckConstraint("planning_progress >= 0 AND planning_progress <= 100", name="valid_planning_progress"),
        CheckConstraint("execution_progress >= 0 AND execution_progress <= 100", name="valid_execution_progress"),
        Index("idx_active_projects_user", "user_id"),
        Index("idx_active_projects_status", "status"),
    )
    
    def __repr__(self) -> str:
        return f"<ActiveProject(id={self.id}, user_id={self.user_id}, status={self.status})>"


class ProjectChatMessage(Base):
    """Chat messages within a monetization project."""
    
    __tablename__ = "project_chat_messages"
    
    project_id = Column(PGUUID(as_uuid=True), ForeignKey("active_projects.id", ondelete="CASCADE"), nullable=False)
    
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    
    # AI metadata
    detected_actions = Column(JSONB)  # actions AI parsed from response
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    
    # Relationships
    project = relationship("ActiveProject", back_populates="chat_messages")
    
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="valid_role"),
        Index("idx_chat_messages_project", "project_id", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<ProjectChatMessage(id={self.id}, project_id={self.project_id}, role={self.role})>"


class ProjectTaskCompletion(Base):
    """Completed tasks within a project."""
    
    __tablename__ = "project_task_completions"
    
    project_id = Column(PGUUID(as_uuid=True), ForeignKey("active_projects.id", ondelete="CASCADE"), nullable=False)
    
    task_id = Column(String(20), nullable=False)  # e.g., "1.2" for phase 1, task 2
    task_title = Column(String(500), nullable=False)
    
    completed_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_via = Column(String(20), nullable=False)  # 'manual', 'ai_auto', 'ai_confirmed'
    notes = Column(Text)
    
    # Relationships
    project = relationship("ActiveProject", back_populates="task_completions")
    
    __table_args__ = (
        UniqueConstraint("project_id", "task_id", name="unique_task_completion"),
        CheckConstraint("completed_via IN ('manual', 'ai_auto', 'ai_confirmed')", name="valid_completed_via"),
        Index("idx_task_completions_project", "project_id"),
    )
    
    def __repr__(self) -> str:
        return f"<ProjectTaskCompletion(id={self.id}, task_id={self.task_id})>"


class ProjectDecision(Base):
    """Key decisions made during project planning."""
    
    __tablename__ = "project_decisions"
    
    project_id = Column(PGUUID(as_uuid=True), ForeignKey("active_projects.id", ondelete="CASCADE"), nullable=False)
    
    decision_category = Column(String(50), nullable=False)  # 'pricing', 'platform', 'structure', 'timeline', 'content'
    decision_value = Column(Text, nullable=False)  # the actual choice made
    rationale = Column(Text)  # why this choice
    confidence = Column(String(20), nullable=False)  # 'high', 'medium', 'low'
    
    related_message_id = Column(PGUUID(as_uuid=True), ForeignKey("project_chat_messages.id"))
    
    decided_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    superseded_by = Column(PGUUID(as_uuid=True), ForeignKey("project_decisions.id"))  # if decision changed
    is_current = Column(Boolean, nullable=False, default=True)
    
    # Relationships
    project = relationship("ActiveProject", back_populates="decisions")
    
    __table_args__ = (
        CheckConstraint("decision_category IN ('pricing', 'platform', 'structure', 'timeline', 'content')", name="valid_category"),
        CheckConstraint("confidence IN ('high', 'medium', 'low')", name="valid_confidence"),
        Index("idx_decisions_project", "project_id"),
        Index("idx_decisions_current", "project_id", "is_current"),
    )
    
    def __repr__(self) -> str:
        return f"<ProjectDecision(id={self.id}, category={self.decision_category}, value={self.decision_value[:50]})>"


class AIUsageLog(Base):
    """Log of AI API usage for cost tracking."""
    
    __tablename__ = "ai_usage_logs"
    
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    project_id = Column(PGUUID(as_uuid=True), ForeignKey("active_projects.id", ondelete="SET NULL"))
    
    model = Column(String(100), nullable=False)
    input_tokens = Column(Integer, nullable=False)
    output_tokens = Column(Integer, nullable=False)
    estimated_cost = Column(Numeric(10, 6))  # in USD
    
    endpoint = Column(String(100))  # 'chat', 'welcome', etc.
    
    # Relationships
    user = relationship("User")
    
    __table_args__ = (
        Index("idx_usage_user_date", "user_id", "created_at"),
        Index("idx_usage_project", "project_id"),
    )
    
    def __repr__(self) -> str:
        return f"<AIUsageLog(id={self.id}, user_id={self.user_id}, cost={self.estimated_cost})>"
