"""
Review schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class ReviewBase(BaseModel):
    """Base review schema."""
    platform: str
    platform_review_id: Optional[str] = None
    author_name: Optional[str] = None
    author_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    review_text: Optional[str] = None
    review_reply: Optional[str] = None
    published_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    staff_mentions: Optional[List[str]] = Field(default_factory=list)
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ReviewFilter(BaseModel):
    """Review filter options."""
    location_id: Optional[UUID] = None
    platform: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    sentiment: Optional[str] = None
    needs_response: Optional[bool] = None
    is_flagged: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class ReviewListResponse(BaseModel):
    """Schema for review in list view."""
    id: UUID
    location_id: UUID
    platform: str
    author_name: Optional[str]
    rating: int
    review_text: Optional[str]
    review_reply: Optional[str]
    published_at: Optional[datetime]
    sentiment: Optional[str]
    tags: List[str]
    is_flagged: bool
    needs_response: bool
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "location_id": obj.location_id,
            "platform": obj.platform,
            "author_name": obj.author_name,
            "rating": obj.rating,
            "review_text": obj.review_text,
            "review_reply": obj.review_reply,
            "published_at": obj.published_at,
            "sentiment": obj.sentiment,
            "tags": obj.tags or [],
            "is_flagged": obj.is_flagged,
            "needs_response": obj.needs_response,
        }
        return cls(**data)


class ReviewResponse(ReviewBase):
    """Schema for detailed review response."""
    id: UUID
    location_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Related data
    location_name: Optional[str] = None
    responses: List["ReviewResponseInfo"] = Field(default_factory=list)
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "location_id": obj.location_id,
            "platform": obj.platform,
            "platform_review_id": obj.platform_review_id,
            "author_name": obj.author_name,
            "author_id": obj.author_id,
            "rating": obj.rating,
            "review_text": obj.review_text,
            "review_reply": obj.review_reply,
            "published_at": obj.published_at,
            "replied_at": obj.replied_at,
            "sentiment": obj.sentiment,
            "sentiment_score": obj.sentiment_score,
            "tags": obj.tags or [],
            "staff_mentions": obj.staff_mentions or [],
            "is_flagged": obj.is_flagged,
            "flag_reason": obj.flag_reason,
            "meta_data": obj.meta_data or {},
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
            "location_name": obj.location.name if hasattr(obj, "location") else None,
            "responses": obj.responses if hasattr(obj, "responses") else [],
        }
        return cls(**data)


class ReviewResponseInfo(BaseModel):
    """Info about a review response."""
    id: UUID
    response_text: str
    response_type: str
    status: str
    created_by_name: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "response_text": obj.response_text,
            "response_type": obj.response_type,
            "status": obj.status,
            "created_by_name": obj.created_by.full_name if hasattr(obj, "created_by") and obj.created_by else None,
            "created_at": obj.created_at,
            "sent_at": obj.sent_at,
        }
        return cls(**data)


class CreateResponseRequest(BaseModel):
    """Request to create a review response."""
    response_text: str = Field(..., min_length=1)
    response_type: str = Field(..., pattern="^(ai_generated|manual|template|ai_edited)$")
    ai_model: Optional[str] = None
    send_immediately: bool = False


class ReviewResponseCreate(BaseModel):
    """Response after creating a review response."""
    id: UUID
    review_id: UUID
    response_text: str
    response_type: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True