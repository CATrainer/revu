"""Pydantic schemas for workflows and approvals.

Workflow System V2:
- Only ONE workflow runs per interaction (highest priority wins)
- Workflows only apply to new incoming messages
- Two actions only: auto_respond, generate_response
- Natural language conditions evaluated by LLM
- View scope: multi-select views or "all"
"""
from datetime import datetime
from typing import Any, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ==================== WORKFLOW SCHEMAS ====================

class WorkflowCreate(BaseModel):
    """Create a new workflow."""
    name: str = Field(..., min_length=1, max_length=255)
    
    # Filters (what interactions this workflow applies to)
    platforms: Optional[List[str]] = None  # ['youtube', 'instagram', 'tiktok', 'twitter'] - empty = all
    interaction_types: Optional[List[str]] = None  # ['comment', 'dm', 'mention'] - empty = all
    
    # View scope - which views this workflow applies to
    # Empty or None = applies to ALL interactions
    # List of view IDs = only applies to interactions matching those views
    view_ids: Optional[List[UUID]] = None
    
    # Natural language conditions (evaluated by LLM)
    # Multiple conditions use OR logic - workflow matches if ANY condition matches
    # Example: ["Questions about pricing", "Shipping inquiries"]
    ai_conditions: Optional[List[str]] = None
    
    # Action configuration
    action_type: Literal['auto_respond', 'generate_response']
    action_config: Optional[dict] = None  # {response_text: str} for auto_respond, {tone: str} for generate_response
    
    # Initial status
    status: Literal['active', 'paused'] = 'active'


class WorkflowUpdate(BaseModel):
    """Update an existing workflow."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    platforms: Optional[List[str]] = None
    interaction_types: Optional[List[str]] = None
    view_ids: Optional[List[UUID]] = None
    ai_conditions: Optional[List[str]] = None
    action_type: Optional[Literal['auto_respond', 'generate_response']] = None
    action_config: Optional[dict] = None
    status: Optional[Literal['active', 'paused']] = None
    priority: Optional[int] = None


class WorkflowOut(BaseModel):
    """Workflow response schema."""
    id: UUID
    name: str
    status: str
    priority: int
    is_enabled: bool
    
    # Filters
    platforms: Optional[List[str]] = None
    interaction_types: Optional[List[str]] = None
    
    # View scope
    view_ids: Optional[List[UUID]] = None
    
    # Conditions (OR logic between multiple)
    ai_conditions: Optional[List[str]] = None
    
    # Action
    action_type: str
    action_config: Optional[dict] = None
    
    # Ownership
    user_id: UUID
    organization_id: Optional[UUID] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class WorkflowReorder(BaseModel):
    """Reorder workflows by priority."""
    workflow_ids: List[UUID] = Field(..., description="Workflow IDs in desired priority order (first = highest priority)")


class WorkflowListOut(BaseModel):
    """List of workflows with metadata."""
    workflows: List[WorkflowOut]
    total: int


# ==================== APPROVAL SCHEMAS ====================

class ApprovalCreate(BaseModel):
    """Create a workflow approval item."""
    workflow_id: Optional[UUID] = None
    platform: str
    interaction_type: str
    author: Optional[str] = None
    link_url: Optional[str] = None
    user_message: str
    proposed_response: str
    edited_response: Optional[str] = None
    status: str = 'pending'
    rejected_reason: Optional[str] = None


class ApprovalUpdate(BaseModel):
    """Update an approval item."""
    edited_response: Optional[str] = None
    status: Optional[str] = None
    rejected_reason: Optional[str] = None


class ApprovalOut(BaseModel):
    """Approval response schema."""
    id: UUID
    workflow_id: Optional[UUID] = None
    platform: str
    interaction_type: str
    author: Optional[str] = None
    link_url: Optional[str] = None
    user_message: str
    proposed_response: str
    edited_response: Optional[str] = None
    status: str
    rejected_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== EXECUTION SCHEMAS ====================

class WorkflowExecutionCreate(BaseModel):
    """Log a workflow execution."""
    status: str = 'completed'
    context: Optional[dict] = None
    result: Optional[dict] = None
    error: Optional[str] = None


class WorkflowExecutionOut(BaseModel):
    """Execution log response schema."""
    id: UUID
    workflow_id: UUID
    status: str
    context: Optional[dict] = None
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== LEGACY SCHEMAS (for backward compatibility) ====================

class WorkflowTrigger(BaseModel):
    """DEPRECATED: Legacy workflow trigger configuration."""
    type: str
    value: Optional[str] = None
    view_id: Optional[UUID] = None
    threshold: Optional[int] = None
    schedule: Optional[dict] = None
    platforms: Optional[List[str]] = None
    interaction_types: Optional[List[str]] = None


class WorkflowCondition(BaseModel):
    """DEPRECATED: Legacy workflow condition."""
    type: Optional[str] = None
    prompt: Optional[str] = None
    field: Optional[str] = None
    operator: Optional[str] = None
    value: Optional[Any] = None
