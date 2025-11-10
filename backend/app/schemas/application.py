"""
Application schemas for request/response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# Type aliases
AccountType = Literal["creator", "agency"]
ApplicationStatus = Literal["pending", "approved", "rejected"]


class PlatformInfo(BaseModel):
    """Platform connection information."""
    enabled: bool
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    
    @field_validator('email', 'username', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        """Convert empty strings to None for optional fields."""
        if v == '' or v is None:
            return None
        return v


class CreatorApplicationData(BaseModel):
    """Creator application form data."""
    full_name: str = Field(..., min_length=1, max_length=100)
    creator_name: str = Field(..., min_length=1, max_length=100)
    platforms: Dict[str, PlatformInfo]
    follower_range: str
    content_type: str = Field(..., min_length=1, max_length=500)
    why_repruv: str = Field(..., min_length=1, max_length=500)
    biggest_challenge: str = Field(..., min_length=1, max_length=500)
    referral_source: str


class AgencyApplicationData(BaseModel):
    """Agency application form data."""
    agency_name: str = Field(..., min_length=1, max_length=150)
    contact_name: str = Field(..., min_length=1, max_length=100)
    contact_role: str = Field(..., min_length=1, max_length=100)
    agency_website: Optional[str] = None
    creator_count: int = Field(..., ge=1)
    platforms: List[str]
    avg_audience_size: str
    partner_interest: Literal["yes", "maybe", "no"]
    biggest_challenge: str = Field(..., min_length=1, max_length=500)
    required_features: str = Field(..., min_length=1, max_length=500)
    creator_emails: List[EmailStr] = Field(default_factory=list, max_length=10)
    referral_source: str
    
    @field_validator('agency_website', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        """Convert empty strings to None for optional fields."""
        if v == '' or v is None:
            return None
        return v


class ApplicationCreate(BaseModel):
    """Schema for creating an application."""
    account_type: AccountType
    application_data: Dict[str, Any]  # Will be CreatorApplicationData or AgencyApplicationData


class ApplicationUpdate(BaseModel):
    """Schema for updating an application (admin only)."""
    admin_notes: Optional[str] = None
    status: Optional[ApplicationStatus] = None


class ApplicationApprove(BaseModel):
    """Schema for approving an application."""
    send_email: bool = True


class ApplicationReject(BaseModel):
    """Schema for rejecting an application."""
    send_email: bool = True
    reason: Optional[str] = Field(None, max_length=1000)


class ApplicationResponse(BaseModel):
    """Application response schema."""
    id: UUID
    user_id: UUID
    account_type: AccountType
    application_data: Dict[str, Any]
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[UUID] = None
    status: ApplicationStatus
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationListResponse(BaseModel):
    """Simplified application list response."""
    id: UUID
    user_id: UUID
    user_email: str
    user_full_name: Optional[str] = None
    account_type: AccountType
    status: ApplicationStatus
    submitted_at: datetime
    created_at: datetime


class AdminNotificationSettingsCreate(BaseModel):
    """Schema for creating admin notification settings."""
    email: EmailStr
    notification_types: Optional[Dict[str, bool]] = Field(
        default_factory=lambda: {"creator_applications": True, "agency_applications": True}
    )


class AdminNotificationSettingsUpdate(BaseModel):
    """Schema for updating admin notification settings."""
    notification_types: Optional[Dict[str, bool]] = None
    is_active: Optional[bool] = None


class AdminNotificationSettingsResponse(BaseModel):
    """Admin notification settings response schema."""
    id: UUID
    email: str
    notification_types: Dict[str, bool]
    is_active: bool
    added_by: Optional[UUID] = None
    added_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccountTypeSelect(BaseModel):
    """Schema for selecting account type during onboarding."""
    account_type: Literal["creator", "agency"]
