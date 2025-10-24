"""
User schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

# Type aliases for user attributes
# AccessStatus: Legacy field - 'pending' for new users in approval workflow, 'full' for approved/legacy users
AccessStatus = Literal["pending", "full"]
UserKind = Literal["content", "business"]
AccountType = Literal["creator", "agency", "legacy"]
ApprovalStatus = Literal["pending", "approved", "rejected"]


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    is_active: bool = True


class WaitlistJoin(BaseModel):
    """Schema for joining the waitlist without creating an account."""
    
    email: EmailStr
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    marketing_opt_in: Optional[bool] = False


class UserCreate(UserBase):
    """User creation schema."""

    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    """User update schema."""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    is_active: Optional[bool] = None
    access_status: Optional[AccessStatus] = None
    user_kind: Optional[UserKind] = None
    has_account: Optional[bool] = None


class UserAccessUpdate(BaseModel):
    """Schema for updating user access status."""
    
    access_status: AccessStatus
    user_kind: Optional[UserKind] = None


class WaitlistAccountCreate(BaseModel):
    """Schema for creating account from waitlist."""
    
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    
    
class DemoRequest(BaseModel):
    """Schema for demo request."""
    
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)
    current_solution: Optional[str] = Field(None, max_length=255)
    message: Optional[str] = Field(None, max_length=500, description="Optional message from user")


class AdminNotes(BaseModel):
    """Schema for admin notes update."""
    
    demo_prep_notes: Optional[str] = Field(None, max_length=1000)
    follow_up_reminders: Optional[str] = Field(None, max_length=1000)
    user_qualification_notes: Optional[str] = Field(None, max_length=1000)


class User(UserBase):
    """User response schema."""

    id: UUID
    is_admin: bool = False
    has_account: bool = True
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    
    # Legacy access control fields (kept for backward compatibility)
    access_status: AccessStatus = "pending"
    user_kind: Optional[UserKind] = "content"
    
    # New approval workflow fields
    account_type: Optional[AccountType] = None
    approval_status: ApprovalStatus = "pending"
    application_submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    rejected_at: Optional[datetime] = None
    rejected_by: Optional[UUID] = None
    rejection_reason: Optional[str] = None
    
    # Other fields
    joined_waiting_list_at: Optional[datetime] = None
    early_access_granted_at: Optional[datetime] = None
    demo_requested: bool = False
    demo_requested_at: Optional[datetime] = None
    demo_scheduled_at: Optional[datetime] = None
    demo_completed: bool = False
    demo_completed_at: Optional[datetime] = None
    company_size: Optional[str] = None
    current_solution: Optional[str] = None
    demo_prep_notes: Optional[str] = None
    follow_up_reminders: Optional[str] = None
    user_qualification_notes: Optional[str] = None

    class Config:
        from_attributes = True


class UserInDB(User):
    """User in database schema (with hashed password)."""

    hashed_password: str
