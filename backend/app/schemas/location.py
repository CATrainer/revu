"""
Location schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID

from pydantic import BaseModel, Field


class LocationBase(BaseModel):
    """Base location schema."""
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    google_place_id: Optional[str] = None
    timezone: str = Field(default="Europe/London")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    brand_voice_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    business_info: Optional[Dict[str, Any]] = Field(default_factory=dict)


class LocationCreate(LocationBase):
    """Schema for creating a location."""
    organization_id: UUID


class LocationUpdate(BaseModel):
    """Schema for updating a location."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = None
    google_place_id: Optional[str] = None
    timezone: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    brand_voice_data: Optional[Dict[str, Any]] = None
    business_info: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class LocationListResponse(BaseModel):
    """Schema for location in list view."""
    id: UUID
    organization_id: UUID
    name: str
    address: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class LocationResponse(LocationBase):
    """Schema for detailed location response."""
    id: UUID
    organization_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Related counts
    review_count: int = Field(default=0)
    platform_count: int = Field(default=0)
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "organization_id": obj.organization_id,
            "name": obj.name,
            "address": obj.address,
            "google_place_id": obj.google_place_id,
            "timezone": obj.timezone,
            "settings": obj.settings,
            "brand_voice_data": obj.brand_voice_data,
            "business_info": obj.business_info,
            "is_active": obj.is_active,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
            "review_count": len(obj.reviews) if hasattr(obj, "reviews") else 0,
            "platform_count": len(obj.platform_connections) if hasattr(obj, "platform_connections") else 0,
        }
        return cls(**data)