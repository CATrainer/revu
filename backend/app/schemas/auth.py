"""
Authentication schemas for request/response validation.
"""

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    """Token response schema."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Token refresh request schema."""

    refresh_token: str


class UserLogin(BaseModel):
    """User login request schema."""

    email: EmailStr
    password: str = Field(..., min_length=8)


class UserSignup(BaseModel):
    """User signup request schema."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)


class PasswordReset(BaseModel):
    """Password reset request schema."""

    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""

    email: EmailStr
