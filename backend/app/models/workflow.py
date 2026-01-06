"""Workflow domain models."""
from sqlalchemy import Column, String, Boolean, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class Workflow(Base):
    """Represents an interaction workflow.

    Workflows are automations that run on NEW incoming interactions only.
    
    Key principles:
    - Only ONE workflow runs per interaction (highest priority wins)
    - Workflows only apply to new incoming messages (not replies, not existing)
    - Priority determines execution order (lower number = higher priority)
    - Natural language conditions are evaluated by LLM
    
    Flow:
    1. New interaction arrives
    2. View labeling happens first
    3. Check which workflows match (filters + view scope)
    4. Evaluate natural language conditions via LLM
    5. Highest priority matching workflow executes
    """

    __tablename__ = "workflows"

    name = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="active")  # active|paused
    
    # Priority for execution order (lower = higher priority, 1 is highest)
    # User can reorder workflows which updates this value
    priority = Column(Integer, nullable=False, default=100)
    is_enabled = Column(Boolean, default=True)

    # Filters (platform and interaction type)
    platforms = Column(ARRAY(String(32)))  # ['youtube', 'instagram', 'tiktok', 'twitter'] - empty = all
    interaction_types = Column(ARRAY(String(16)))  # ['comment', 'dm', 'mention'] - empty = all
    
    # View scope - which views this workflow applies to
    # Empty array or contains "all" = applies to all interactions
    # Otherwise, only runs for interactions that match these views
    view_ids = Column(ARRAY(PGUUID(as_uuid=True)))  # UUIDs of views this workflow applies to
    
    # Natural language conditions (evaluated by LLM)
    # Multiple conditions use OR logic - workflow matches if ANY condition matches
    # Each individual condition is interpreted naturally by the AI
    # Example: ["Questions about pricing", "Shipping inquiries", "Product availability"]
    ai_conditions = Column(ARRAY(Text), nullable=True)
    
    # Action: 'auto_respond' or 'generate_response'
    action_type = Column(String(50), nullable=False)  # 'auto_respond' | 'generate_response'
    action_config = Column(JSONB)  # {response_text: str, tone: str}

    # Ownership
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)

    # Relationships
    approvals = relationship("WorkflowApproval", back_populates="workflow", cascade="all, delete-orphan")
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")
    
    # Legacy fields (kept for migration, will be removed later)
    description = Column(Text, nullable=True)  # DEPRECATED
    trigger = Column(JSONB, nullable=True)  # DEPRECATED
    conditions = Column(JSONB, nullable=True)  # DEPRECATED
    actions = Column(JSONB, nullable=True)  # DEPRECATED
    type = Column(String(20), nullable=True)  # DEPRECATED
    view_id = Column(PGUUID(as_uuid=True), ForeignKey("interaction_views.id", ondelete="SET NULL"), nullable=True)  # DEPRECATED
    is_global = Column(Boolean, nullable=True)  # DEPRECATED
    natural_language_conditions = Column(ARRAY(Text), nullable=True)  # DEPRECATED
    compiled_conditions = Column(JSONB, nullable=True)  # DEPRECATED
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # DEPRECATED


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
