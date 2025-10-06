"""Pydantic schemas for custom views."""
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class ViewFilters(BaseModel):
    """Flexible filter configuration for views."""
    platforms: Optional[List[str]] = None
    types: Optional[List[str]] = None  # comment, dm, mention
    keywords: Optional[List[str]] = None
    sentiment: Optional[str] = None  # positive, negative, neutral
    priority_min: Optional[int] = Field(None, ge=1, le=100)
    priority_max: Optional[int] = Field(None, ge=1, le=100)
    status: Optional[List[str]] = None  # unread, read, replied, archived
    tags: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    has_replies: Optional[bool] = None
    is_unread: Optional[bool] = None
    date_range: Optional[Dict[str, str]] = None  # {start: "2024-01-01", end: "2024-12-31"}
    author_username: Optional[str] = None
    has_media: Optional[bool] = None
    fan_id: Optional[UUID] = None
    is_superfan: Optional[bool] = None
    is_vip: Optional[bool] = None
    
    class Config:
        extra = "allow"  # Allow additional filter fields


class ViewDisplay(BaseModel):
    """Display preferences for views."""
    sort_by: str = Field(default="newest", description="newest, oldest, priority, engagement")
    group_by: Optional[str] = Field(None, description="platform, date, author, null for no grouping")
    show_replies: bool = True
    density: str = Field(default="comfortable", description="comfortable, compact")
    
    class Config:
        extra = "allow"  # Allow additional display options


class ViewBase(BaseModel):
    """Base view schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    icon: str = Field(default='📋', max_length=50)
    color: str = Field(default='#3b82f6', max_length=20)
    type: str = Field(default='custom', description="smart, custom, workflow")
    
    filters: ViewFilters = Field(default_factory=ViewFilters)
    display: ViewDisplay = Field(default_factory=ViewDisplay)
    
    is_pinned: bool = False
    is_shared: bool = False
    order_index: int = 0


class ViewCreate(ViewBase):
    """Schema for creating a new view."""
    pass


class ViewUpdate(BaseModel):
    """Schema for updating a view."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=20)
    
    filters: Optional[ViewFilters] = None
    display: Optional[ViewDisplay] = None
    
    is_pinned: Optional[bool] = None
    is_shared: Optional[bool] = None
    order_index: Optional[int] = None
    workflow_ids: Optional[List[UUID]] = None


class ViewOut(ViewBase):
    """Schema for view output."""
    id: UUID
    is_template: bool = False
    is_system: bool = False
    workflow_ids: Optional[List[UUID]] = None
    
    # Ownership
    user_id: UUID
    organization_id: Optional[UUID] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Optional metrics
    interaction_count: Optional[int] = None
    unread_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class ViewList(BaseModel):
    """List of views."""
    views: List[ViewOut]
    total: int


# ==================== VIEW TEMPLATES ====================

class ViewTemplate(BaseModel):
    """Predefined view templates users can create from."""
    name: str
    description: str
    icon: str
    color: str
    filters: ViewFilters
    display: ViewDisplay
    category: str  # organization, priority, platform, workflow


# Predefined templates
VIEW_TEMPLATES: List[ViewTemplate] = [
    ViewTemplate(
        name="Merch Inquiries",
        description="Comments and DMs asking about merchandise",
        icon="💰",
        color="#10b981",
        filters=ViewFilters(keywords=["merch", "shop", "store", "buy", "purchase", "price"]),
        display=ViewDisplay(sort_by="newest"),
        category="organization"
    ),
    ViewTemplate(
        name="Collaboration Requests",
        description="Business opportunities and partnership inquiries",
        icon="🤝",
        color="#8b5cf6",
        filters=ViewFilters(keywords=["collab", "collaboration", "partner", "sponsor", "business", "brand deal"]),
        display=ViewDisplay(sort_by="priority"),
        category="organization"
    ),
    ViewTemplate(
        name="Questions",
        description="Interactions that are questions needing answers",
        icon="❓",
        color="#3b82f6",
        filters=ViewFilters(categories=["question"], status=["unread", "read"]),
        display=ViewDisplay(sort_by="newest"),
        category="organization"
    ),
    ViewTemplate(
        name="Negative Sentiment",
        description="Interactions with negative sentiment requiring attention",
        icon="😠",
        color="#ef4444",
        filters=ViewFilters(sentiment="negative", status=["unread", "read"]),
        display=ViewDisplay(sort_by="priority"),
        category="priority"
    ),
    ViewTemplate(
        name="Superfans",
        description="Interactions from your most engaged followers",
        icon="⭐",
        color="#f59e0b",
        filters=ViewFilters(is_superfan=True),
        display=ViewDisplay(sort_by="newest"),
        category="organization"
    ),
    ViewTemplate(
        name="Needs Reply",
        description="Unread interactions requiring a response",
        icon="📬",
        color="#06b6d4",
        filters=ViewFilters(status=["unread"], has_replies=False),
        display=ViewDisplay(sort_by="priority"),
        category="priority"
    ),
]
