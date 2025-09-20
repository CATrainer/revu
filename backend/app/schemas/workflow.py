"""Pydantic schemas for workflows and approvals."""
from datetime import datetime
from typing import Any, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Shared config blobs (unstructured for fast iteration)
class WorkflowTrigger(BaseModel):
    type: Optional[Literal['sentiment', 'keyword', 'platform', 'mention_type', 'volume_spike']] = None
    value: Optional[str] = None


class WorkflowCondition(BaseModel):
    field: str
    op: Literal['is', 'is_not', 'contains', 'not_contains']
    value: str


class WorkflowAction_Tag(BaseModel):
    type: Literal['tag'] = 'tag'
    config: dict = Field(default_factory=dict)


class WorkflowAction_Assign(BaseModel):
    type: Literal['assign'] = 'assign'
    config: dict = Field(default_factory=dict)


class WorkflowAction_Notify(BaseModel):
    type: Literal['notify'] = 'notify'
    config: dict = Field(default_factory=dict)


class WorkflowAction_TemplateReply(BaseModel):
    type: Literal['template_reply'] = 'template_reply'
    config: dict = Field(default_factory=dict)


WorkflowAction = WorkflowAction_Tag | WorkflowAction_Assign | WorkflowAction_Notify | WorkflowAction_TemplateReply


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
