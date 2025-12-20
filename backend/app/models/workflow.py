"""Workflow domain models."""
from sqlalchemy import Column, String, Boolean, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class Workflow(Base):
    """Represents an interaction workflow.

    Workflows are automations that run on incoming interactions. Each workflow has:
    - Trigger conditions (which interactions it applies to)
    - An action (what to do when triggered)
    - A priority (determines which workflow runs if multiple match)
    
    Only ONE workflow runs per interaction - highest priority wins.
    System workflows (Auto Moderator, Auto Archive) have fixed priorities 1-2.
    """

    __tablename__ = "workflows"

    name = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="active")  # active|paused|draft
    description = Column(Text)
    
    # Workflow type and priority
    type = Column(String(20), nullable=False, default="custom")  # 'system' | 'custom'
    priority = Column(Integer, nullable=False, default=100)  # Lower = higher priority. System: 1-2, Custom: 3+
    is_enabled = Column(Boolean, default=True)

    # Legacy JSON configs (kept for backward compatibility)
    trigger = Column(JSONB, nullable=True)
    conditions = Column(JSONB, nullable=True)
    actions = Column(JSONB, nullable=True)
    
    # New: Natural language conditions (evaluated by AI)
    natural_language_conditions = Column(ARRAY(Text))  # ["Hateful messages", "Spam content"]
    compiled_conditions = Column(JSONB, nullable=True)  # AI-compiled structured conditions
    
    # Platform and interaction type filters
    platforms = Column(ARRAY(String(32)))  # ['youtube', 'instagram', 'tiktok', 'twitter']
    interaction_types = Column(ARRAY(String(16)))  # ['comment', 'dm', 'mention']
    
    # Action configuration
    action_type = Column(String(50))  # 'auto_moderate', 'auto_archive', 'auto_respond', 'generate_response'
    action_config = Column(JSONB)  # Action-specific config (e.g., template text, tone settings)

    # View association (workflows can be scoped to a specific view or global)
    view_id = Column(PGUUID(as_uuid=True), ForeignKey("interaction_views.id", ondelete="SET NULL"), nullable=True)
    is_global = Column(Boolean, default=False)  # If true, applies to all views

    # Ownership / scoping
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    approvals = relationship("WorkflowApproval", back_populates="workflow", cascade="all, delete-orphan")
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowApproval(Base):
    """Items created by workflows that require manual approval before sending."""

    __tablename__ = "workflow_approvals"

    workflow_id = Column(PGUUID(as_uuid=True), ForeignKey("workflows.id"), nullable=True)

    platform = Column(String(32), nullable=False)  # youtube|instagram|tiktok|twitter
    interaction_type = Column(String(16), nullable=False)  # dm|comment|mention

    author = Column(String(255))
    link_url = Column(Text)
    user_message = Column(Text, nullable=False)

    proposed_response = Column(Text, nullable=False)
    edited_response = Column(Text)

    status = Column(String(16), nullable=False, default="pending")  # pending|sent|rejected|saved
    rejected_reason = Column(Text)

    # Optional scoping
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    workflow = relationship("Workflow", back_populates="approvals")


class WorkflowExecution(Base):
    """Execution log entries for workflows.

    Captures inputs/outputs and status for auditability.
    """

    __tablename__ = "workflow_executions"

    workflow_id = Column(PGUUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False)
    status = Column(String(20), nullable=False, default="completed")  # completed|failed|skipped
    context = Column(JSONB, nullable=True)  # input context (e.g., event)
    result = Column(JSONB, nullable=True)   # output/result actions or decision
    error = Column(Text, nullable=True)

    # Optional scoping
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
