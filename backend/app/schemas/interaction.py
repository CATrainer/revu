"""Pydantic schemas for interactions."""
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


# ==================== INTERACTION SCHEMAS ====================

class InteractionBase(BaseModel):
    """Base interaction schema."""
    platform: str = Field(..., description="Platform: instagram, youtube, tiktok, twitter")
    type: str = Field(..., description="Type: comment, dm, mention")
    content: str = Field(..., min_length=1)
    
    # Author info
    author_name: Optional[str] = None
    author_username: Optional[str] = None
    author_profile_url: Optional[str] = None
    author_avatar_url: Optional[str] = None
    author_follower_count: Optional[int] = None
    author_is_verified: bool = False
    
    # Context
    parent_content_id: Optional[str] = None
    parent_content_title: Optional[str] = None
    parent_content_url: Optional[str] = None
    is_reply: bool = False
    
    # Optional enrichments
    media_urls: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class InteractionCreate(InteractionBase):
    """Schema for creating a new interaction."""
    platform_id: str = Field(..., description="External platform ID (must be unique)")
    platform_created_at: Optional[datetime] = None
    
    # Initial enrichments (can be added later)
    sentiment: Optional[str] = None
    categories: Optional[List[str]] = None
    detected_keywords: Optional[List[str]] = None


class InteractionUpdate(BaseModel):
    """Schema for updating an interaction."""
    status: Optional[str] = Field(None, description="unread, read, awaiting_approval, answered, ignored")
    tags: Optional[List[str]] = None
    assigned_to_user_id: Optional[UUID] = None
    internal_notes: Optional[str] = None
    pending_response: Optional[Dict[str, Any]] = None
    workflow_id: Optional[UUID] = None
    workflow_action: Optional[str] = None
    
    # Enrichments
    sentiment: Optional[str] = None
    priority_score: Optional[int] = Field(None, ge=1, le=100)
    categories: Optional[List[str]] = None


class InteractionOut(InteractionBase):
    """Schema for interaction output."""
    id: UUID
    platform_id: str
    
    # Enriched data
    sentiment: Optional[str] = None
    priority_score: int = 50
    categories: Optional[List[str]] = None
    detected_keywords: Optional[List[str]] = None
    language: Optional[str] = None
    
    # Relations
    thread_id: Optional[UUID] = None
    fan_id: Optional[UUID] = None
    reply_to_id: Optional[UUID] = None
    
    # Management
    status: str
    assigned_to_user_id: Optional[UUID] = None
    internal_notes: Optional[str] = None
    triggered_workflows: Optional[List[UUID]] = None
    applied_actions: Optional[Dict[str, Any]] = None
    workflow_id: Optional[UUID] = None  # Which workflow acted on this
    workflow_action: Optional[str] = None  # 'auto_responded', 'flagged_for_approval', etc.
    
    # Response management (V2)
    pending_response: Optional[Dict[str, Any]] = None
    
    # Engagement
    like_count: int = 0
    reply_count: int = 0
    
    # Timestamps
    platform_created_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    read_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    
    # Ownership
    user_id: UUID
    organization_id: Optional[UUID] = None
    
    class Config:
        from_attributes = True


class InteractionList(BaseModel):
    """Paginated list of interactions."""
    interactions: List[InteractionOut]
    total: int
    page: int
    page_size: int
    has_more: bool


# ==================== FILTER SCHEMAS ====================

class InteractionFilters(BaseModel):
    """Filters for querying interactions."""
    platforms: Optional[List[str]] = None
    types: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    sentiment: Optional[str] = None
    priority_min: Optional[int] = Field(None, ge=1, le=100)
    priority_max: Optional[int] = Field(None, ge=1, le=100)
    status: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    has_replies: Optional[bool] = None
    is_unread: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    author_username: Optional[str] = None
    assigned_to_user_id: Optional[UUID] = None
    fan_id: Optional[UUID] = None
    
    # Archive filters
    exclude_archived: Optional[bool] = None  # Exclude archived interactions
    archived_only: Optional[bool] = None  # Only show archived interactions
    
    # Sent/Response filters
    exclude_sent: Optional[bool] = None  # Exclude interactions with sent responses (unless new activity)
    has_sent_response: Optional[bool] = None  # Only show interactions with sent responses


# ==================== BULK ACTION SCHEMAS ====================

class BulkActionRequest(BaseModel):
    """Schema for bulk actions on interactions."""
    interaction_ids: List[UUID] = Field(..., min_items=1)
    action: str = Field(..., description="tag, untag, mark_read, mark_unread, archive, spam, assign")
    value: Optional[Any] = Field(None, description="Value for the action (e.g., tag name, user_id)")


class BulkActionResponse(BaseModel):
    """Response for bulk actions."""
    success: bool
    updated_count: int
    failed_ids: List[UUID] = []
    message: str


# ==================== RESPONSE MANAGEMENT (V2) ====================

class PendingResponse(BaseModel):
    """Structure for pending AI-generated responses."""
    text: str
    generated_at: datetime
    model: str = "gpt-4"
    confidence: Optional[float] = None
    workflow_id: Optional[UUID] = None


class GenerateResponseRequest(BaseModel):
    """Request to generate AI response for interaction."""
    interaction_id: UUID
    context: Optional[str] = None
    tone: Optional[str] = Field(None, description="casual, professional, friendly, formal")
    

class SendResponseRequest(BaseModel):
    """Request to send response to interaction."""
    text: str
    send_immediately: bool = True
    add_to_approval_queue: bool = False


class InteractionContext(BaseModel):
    """Rich context for an interaction."""
    interaction: InteractionOut
    thread_messages: List[InteractionOut] = []
    parent_content: Optional[Dict[str, Any]] = None
    fan_profile: Optional[Dict[str, Any]] = None
    related_interactions: List[InteractionOut] = []


class InteractionThread(BaseModel):
    """Thread view of interaction conversation."""
    id: UUID
    messages: List[InteractionOut]
    participant_count: int
    total_messages: int
