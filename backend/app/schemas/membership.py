"""
Membership schemas for user organization relationships.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class MembershipBase(BaseModel):
    """Base membership schema."""
    role: str = Field(..., pattern="^(owner|admin|manager|member)$")
    permissions: Optional[Dict[str, bool]] = Field(default_factory=dict)


class MembershipCreate(MembershipBase):
    """Create a new membership."""
    user_id: UUID
    organization_id: UUID
    location_id: Optional[UUID] = None


class MembershipUpdate(BaseModel):
    """Update membership."""
    role: Optional[str] = Field(None, pattern="^(owner|admin|manager|member)$")
    permissions: Optional[Dict[str, bool]] = None
    location_id: Optional[UUID] = None


class MembershipResponse(MembershipBase):
    """Membership response with full details."""
    id: UUID
    user_id: UUID
    organization_id: UUID
    location_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    
    # Related data
    organization_name: Optional[str] = None
    location_name: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "user_id": obj.user_id,
            "organization_id": obj.organization_id,
            "location_id": obj.location_id,
            "role": obj.role,
            "permissions": obj.permissions or {},
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
            "organization_name": obj.organization.name if hasattr(obj, "organization") and obj.organization else None,
            "location_name": obj.location.name if hasattr(obj, "location") and obj.location else None,
            "user_email": obj.user.email if hasattr(obj, "user") and obj.user else None,
            "user_name": obj.user.full_name if hasattr(obj, "user") and obj.user else None,
        }
        return cls(**data)