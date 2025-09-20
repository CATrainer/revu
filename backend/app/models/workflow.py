"""Workflow domain models."""
from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Workflow(Base):
    """Represents an interaction workflow.

    For v1, we keep trigger, conditions, and actions as JSON to allow fast iteration.
    Later, we can normalize into dedicated tables if needed.
    """

    __tablename__ = "workflows"

    name = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="active")  # active|paused|draft
    description = Column(Text)

    # JSON configs (validated by schemas/services)
    trigger = Column(JSONB, nullable=True)
    conditions = Column(JSONB, nullable=True)
    actions = Column(JSONB, nullable=True)

    # Ownership / scoping (optional for now)
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
