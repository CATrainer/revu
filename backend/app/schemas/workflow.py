"""Pydantic schemas for workflows and approvals."""
from datetime import datetime
from typing import Any, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Enhanced workflow configs with more trigger types and actions
class WorkflowTrigger(BaseModel):
    """Workflow trigger configuration."""
    type: Literal[
        'appears_in_view',  # NEW: Trigger when interaction appears in a specific view
        'sentiment', 
        'keyword', 
        'platform', 
        'mention_type', 
        'volume_spike',
        'priority_threshold',  # NEW: Trigger when priority score meets threshold
        'time_based',  # NEW: Trigger at specific times or intervals
        'author_property'  # NEW: Trigger based on author attributes
    ]
    value: Optional[str] = None
    view_id: Optional[UUID] = None  # For appears_in_view trigger
    threshold: Optional[int] = None  # For priority_threshold trigger
    schedule: Optional[dict] = None  # For time_based trigger


class WorkflowCondition(BaseModel):
    """Workflow condition for filtering.

    Supports two types:
    1. Field-based: Uses field, operator, value (rigid conditions)
    2. Natural language: Uses type='natural_language' and prompt (AI-powered)
    """
    # For natural language conditions
    type: Optional[Literal['natural_language']] = None
    prompt: Optional[str] = None  # Natural language condition (e.g., "interactions asking about pricing")

    # For field-based conditions (traditional)
    field: Optional[str] = None  # platform, sentiment, priority_score, author_follower_count, etc.
    operator: Optional[Literal['is', 'is_not', 'contains', 'not_contains', 'equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'gt', 'lt', 'gte', 'lte']] = None
    value: Optional[Any] = None


class WorkflowAction_Tag(BaseModel):
    type: Literal['tag'] = 'tag'
    config: dict = Field(default_factory=dict)  # {tag: "urgent"}


class WorkflowAction_Assign(BaseModel):
    type: Literal['assign'] = 'assign'
    config: dict = Field(default_factory=dict)  # {user_id: "..."}


class WorkflowAction_Notify(BaseModel):
    type: Literal['notify'] = 'notify'
    config: dict = Field(default_factory=dict)  # {channel: "email", user_id: "..."}


class WorkflowAction_TemplateReply(BaseModel):
    type: Literal['template_reply'] = 'template_reply'
    config: dict = Field(default_factory=dict)  # {template_id: "...", require_approval: true}


class WorkflowAction_AIReply(BaseModel):
    """NEW: AI-generated response action."""
    type: Literal['ai_reply'] = 'ai_reply'
    config: dict = Field(default_factory=dict)  # {tone: "friendly", require_approval: true, max_tokens: 150}


class WorkflowAction_RouteToView(BaseModel):
    """NEW: Route interaction to specific view."""
    type: Literal['route_to_view'] = 'route_to_view'
    config: dict = Field(default_factory=dict)  # {view_id: "..."}


class WorkflowAction_UpdateStatus(BaseModel):
    """NEW: Update interaction status."""
    type: Literal['update_status'] = 'update_status'
    config: dict = Field(default_factory=dict)  # {status: "archived"}


WorkflowAction = (
    WorkflowAction_Tag | 
    WorkflowAction_Assign | 
    WorkflowAction_Notify | 
    WorkflowAction_TemplateReply |
    WorkflowAction_AIReply |
    WorkflowAction_RouteToView |
    WorkflowAction_UpdateStatus
)


# Workflow
class WorkflowBase(BaseModel):
    name: str
    status: Literal['active', 'paused', 'draft'] = 'active'
    description: Optional[str] = None
    trigger: Optional[WorkflowTrigger] = None
    conditions: Optional[List[WorkflowCondition]] = None
    actions: Optional[List[WorkflowAction]] = None


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[Literal['active', 'paused', 'draft']] = None
    description: Optional[str] = None
    trigger: Optional[WorkflowTrigger] = None
    conditions: Optional[List[WorkflowCondition]] = None
    actions: Optional[List[WorkflowAction]] = None


class WorkflowOut(WorkflowBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Approval
class ApprovalBase(BaseModel):
    workflow_id: Optional[UUID] = None
    platform: Literal['youtube', 'instagram', 'tiktok', 'twitter']
    interaction_type: Literal['dm', 'comment', 'mention']
    author: Optional[str] = None
    link_url: Optional[str] = None
    user_message: str
    proposed_response: str
    edited_response: Optional[str] = None
    status: Literal['pending', 'sent', 'rejected', 'saved'] = 'pending'
    rejected_reason: Optional[str] = None


class ApprovalCreate(ApprovalBase):
    pass


class ApprovalUpdate(BaseModel):
    edited_response: Optional[str] = None
    status: Optional[Literal['pending', 'sent', 'rejected', 'saved']] = None
    rejected_reason: Optional[str] = None


class ApprovalOut(ApprovalBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Execution
class WorkflowExecutionCreate(BaseModel):
    context: Optional[dict] = None
    result: Optional[dict] = None
    status: Literal['completed', 'failed', 'skipped'] = 'completed'
    error: Optional[str] = None


class WorkflowExecutionOut(BaseModel):
    id: UUID
    workflow_id: UUID
    status: Literal['completed', 'failed', 'skipped']
    context: Optional[dict] = None
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
