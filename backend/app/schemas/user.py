"""
User schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

# Type alias for access status
AccessStatus = Literal["waiting_list", "early_access", "full_access"]


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    is_active: bool = True


class UserCreate(UserBase):
    """User creation schema."""

    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    """User update schema."""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    is_active: Optional[bool] = None
    access_status: Optional[AccessStatus] = None


class UserAccessUpdate(BaseModel):
    """Schema for updating user access status."""
    
    access_status: AccessStatus
    
    
class DemoRequest(BaseModel):
    """Schema for demo request."""
    
    message: Optional[str] = Field(None, max_length=500, description="Optional message from user")


class User(UserBase):
    """User response schema."""

    id: UUID
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    access_status: AccessStatus = "waiting_list"
    joined_waiting_list_at: Optional[datetime] = None
    early_access_granted_at: Optional[datetime] = None
    demo_requested: bool = False
    demo_requested_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserInDB(User):
    """User in database schema (with hashed password)."""

    hashed_password: str
