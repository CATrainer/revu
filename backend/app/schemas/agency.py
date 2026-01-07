"""
Agency schemas for request/response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# Type aliases
AgencyMemberRole = Literal["owner", "admin", "member"]
AgencyMemberStatus = Literal["pending_invite", "pending_request", "active", "removed"]
AgencyInvitationStatus = Literal["pending", "accepted", "expired", "cancelled"]


# ============================================
# Agency Schemas
# ============================================

class AgencyCreate(BaseModel):
    """Schema for creating an agency."""
    name: str = Field(..., min_length=1, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None

    @field_validator('website', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


class AgencyUpdate(BaseModel):
    """Schema for updating an agency."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    website: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

    @field_validator('website', 'logo_url', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


class AgencyResponse(BaseModel):
    """Agency response schema."""
    id: UUID
    name: str
    slug: str
    owner_id: UUID
    logo_url: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    settings: Dict[str, Any] = {}
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgencyListResponse(BaseModel):
    """Simplified agency list response."""
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    creator_count: int = 0
    is_active: bool


class AgencyPublicResponse(BaseModel):
    """Public agency info (for creator search)."""
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None


# ============================================
# Agency Signup Schemas
# ============================================

class AgencySignupRequest(BaseModel):
    """Schema for agency signup."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1, max_length=255)
    agency_name: str = Field(..., min_length=1, max_length=255)
    website: Optional[str] = Field(None, max_length=500)

    @field_validator('website', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


class AgencySignupResponse(BaseModel):
    """Response after successful agency signup."""
    user_id: UUID
    agency_id: UUID
    agency_slug: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ============================================
# Agency Member Schemas
# ============================================

class AgencyMemberResponse(BaseModel):
    """Agency member response schema."""
    id: UUID
    agency_id: UUID
    user_id: UUID
    role: AgencyMemberRole
    status: AgencyMemberStatus
    invited_by: Optional[UUID] = None
    invited_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # User info (populated via join)
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    user_avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class AgencyMemberListResponse(BaseModel):
    """Simplified member list response."""
    id: UUID
    user_id: UUID
    role: AgencyMemberRole
    status: AgencyMemberStatus
    user_email: str
    user_full_name: Optional[str] = None
    joined_at: Optional[datetime] = None


class AgencyMemberRoleUpdate(BaseModel):
    """Schema for updating member role."""
    role: Literal["admin", "member"]  # Can't change to owner via API


# ============================================
# Agency Invitation Schemas
# ============================================

class AgencyInviteRequest(BaseModel):
    """Schema for inviting a creator to agency."""
    email: EmailStr
    role: AgencyMemberRole = "member"


class AgencyInvitationResponse(BaseModel):
    """Agency invitation response schema."""
    id: UUID
    agency_id: UUID
    email: str
    role: AgencyMemberRole
    status: AgencyInvitationStatus
    invited_by: UUID
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime

    # Agency info (populated via join)
    agency_name: Optional[str] = None
    agency_logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class AgencyInvitationListResponse(BaseModel):
    """Simplified invitation list response."""
    id: UUID
    email: str
    role: AgencyMemberRole
    status: AgencyInvitationStatus
    expires_at: datetime
    created_at: datetime


# ============================================
# Creator-side Agency Schemas
# ============================================

class CreatorAgencyResponse(BaseModel):
    """Response for creator's current agency."""
    agency_id: UUID
    agency_name: str
    agency_slug: str
    agency_logo_url: Optional[str] = None
    role: AgencyMemberRole
    joined_at: Optional[datetime] = None


class AgencyJoinRequest(BaseModel):
    """Schema for creator requesting to join agency."""
    message: Optional[str] = Field(None, max_length=500)


class PendingInvitationResponse(BaseModel):
    """Pending invitation for creator."""
    id: UUID
    agency_id: UUID
    agency_name: str
    agency_logo_url: Optional[str] = None
    invited_at: datetime
    expires_at: datetime


# ============================================
# Agency Search Schemas
# ============================================

class AgencySearchParams(BaseModel):
    """Parameters for searching agencies."""
    q: str = Field(..., min_length=1, max_length=100)
    limit: int = Field(default=10, ge=1, le=50)
