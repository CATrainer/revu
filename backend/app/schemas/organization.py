"""
Organization schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr


class OrganizationBase(BaseModel):
    """Base organization schema."""
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., pattern="^(business|agency)$")
    billing_email: Optional[EmailStr] = None
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)


class OrganizationCreate(OrganizationBase):
    """Schema for creating an organization."""
    pass


class OrganizationUpdate(BaseModel):
    """Schema for updating an organization."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    billing_email: Optional[EmailStr] = None
    settings: Optional[Dict[str, Any]] = None


class OrganizationListResponse(BaseModel):
    """Schema for organization in list view."""
    id: UUID
    name: str
    type: str
    subscription_tier: str
    subscription_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class OrganizationResponse(OrganizationBase):
    """Schema for detailed organization response."""
    id: UUID
    subscription_tier: str
    subscription_status: str
    trial_ends_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    is_trial: bool = Field(default=False)
    is_active: bool = Field(default=True)
    location_count: int = Field(default=0)
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Add computed fields
        data = {
            "id": obj.id,
            "name": obj.name,
            "type": obj.type,
            "billing_email": obj.billing_email,
            "settings": obj.settings,
            "subscription_tier": obj.subscription_tier,
            "subscription_status": obj.subscription_status,
            "trial_ends_at": obj.trial_ends_at,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
            "is_trial": obj.is_trial,
            "is_active": obj.is_active,
            "location_count": len(obj.locations) if hasattr(obj, "locations") else 0,
        }
        return cls(**data)