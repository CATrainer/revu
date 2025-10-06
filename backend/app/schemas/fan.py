"""Pydantic schemas for Fan CRM."""
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr


class FanBase(BaseModel):
    """Base fan schema."""
    username: str = Field(..., min_length=1, max_length=255)
    name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    
    # Profile
    avatar_url: Optional[str] = None
    profile_url: Optional[str] = None
    bio: Optional[str] = None
    platforms: Optional[Dict[str, str]] = None  # {"instagram": "@user", "youtube": "@channel"}
    
    # Classification
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class FanCreate(FanBase):
    """Schema for creating a new fan."""
    pass


class FanUpdate(BaseModel):
    """Schema for updating a fan."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    profile_url: Optional[str] = None
    bio: Optional[str] = None
    platforms: Optional[Dict[str, str]] = None
    
    # Classification
    is_vip: Optional[bool] = None
    is_blocked: Optional[bool] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class FanOut(FanBase):
    """Schema for fan output."""
    id: UUID
    
    # Engagement metrics
    total_interactions: int = 0
    first_interaction_at: Optional[datetime] = None
    last_interaction_at: Optional[datetime] = None
    avg_sentiment: Optional[str] = None
    engagement_score: int = 0
    
    # Classification
    is_superfan: bool = False
    is_vip: bool = False
    is_customer: bool = False
    is_blocked: bool = False
    
    # Revenue
    lifetime_value: Decimal = Decimal(0)
    purchase_count: int = 0
    last_purchase_at: Optional[datetime] = None
    
    # Custom data
    custom_fields: Optional[Dict[str, Any]] = None
    
    # Ownership
    user_id: UUID
    organization_id: Optional[UUID] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FanList(BaseModel):
    """Paginated list of fans."""
    fans: List[FanOut]
    total: int
    page: int
    page_size: int
    has_more: bool


class FanInteractionHistory(BaseModel):
    """Fan's interaction history."""
    fan: FanOut
    interactions: List[Any]  # List of InteractionOut
    threads: List[Any]  # List of thread summaries
    
    # Summary stats
    total_interactions: int
    platforms_used: List[str]
    most_common_topics: List[str]
    sentiment_breakdown: Dict[str, int]
