"""
Agency opportunity schemas for request/response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# Type aliases
OpportunityStatus = Literal["draft", "sent", "viewed", "accepted", "declined", "completed", "cancelled"]
CompensationType = Literal["flat_fee", "cpm", "hybrid", "product_only"]


# ============================================
# Compensation & Requirements Schemas
# ============================================

class OpportunityRequirements(BaseModel):
    """Structured requirements for an opportunity."""
    deliverables: List[str] = Field(default_factory=list)
    content_guidelines: Optional[str] = None
    talking_points: List[str] = Field(default_factory=list)
    restrictions: List[str] = Field(default_factory=list)


class OpportunityCompensation(BaseModel):
    """Structured compensation for an opportunity."""
    type: CompensationType = "flat_fee"
    amount: Optional[float] = None
    currency: str = "USD"
    payment_terms: Optional[str] = None
    product_value: Optional[float] = None
    notes: Optional[str] = None


# ============================================
# Agency Opportunity Schemas
# ============================================

class AgencyOpportunityCreate(BaseModel):
    """Schema for creating an agency opportunity."""
    creator_id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    brand_name: str = Field(..., min_length=1, max_length=255)
    brand_logo_url: Optional[str] = Field(None, max_length=500)
    description: str = Field(..., min_length=1)

    requirements: OpportunityRequirements = Field(default_factory=OpportunityRequirements)
    compensation: OpportunityCompensation = Field(default_factory=OpportunityCompensation)

    deadline: Optional[datetime] = None
    content_deadline: Optional[datetime] = None

    @field_validator('brand_logo_url', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


class AgencyOpportunityUpdate(BaseModel):
    """Schema for updating an agency opportunity."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    brand_name: Optional[str] = Field(None, min_length=1, max_length=255)
    brand_logo_url: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None

    requirements: Optional[OpportunityRequirements] = None
    compensation: Optional[OpportunityCompensation] = None

    deadline: Optional[datetime] = None
    content_deadline: Optional[datetime] = None

    @field_validator('brand_logo_url', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


class AgencyOpportunityResponse(BaseModel):
    """Agency opportunity response schema."""
    id: UUID
    agency_id: UUID
    creator_id: UUID
    created_by: UUID

    title: str
    brand_name: str
    brand_logo_url: Optional[str] = None
    description: str

    requirements: Dict[str, Any] = {}
    compensation: Dict[str, Any] = {}

    deadline: Optional[datetime] = None
    content_deadline: Optional[datetime] = None

    status: OpportunityStatus
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    creator_response_at: Optional[datetime] = None
    creator_notes: Optional[str] = None

    project_id: Optional[UUID] = None

    created_at: datetime
    updated_at: datetime

    # Creator info (populated via join)
    creator_email: Optional[str] = None
    creator_full_name: Optional[str] = None

    class Config:
        from_attributes = True


class AgencyOpportunityListResponse(BaseModel):
    """Simplified opportunity list response."""
    id: UUID
    creator_id: UUID
    title: str
    brand_name: str
    status: OpportunityStatus
    deadline: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    creator_full_name: Optional[str] = None
    created_at: datetime


# ============================================
# Creator-side Opportunity Schemas
# ============================================

class CreatorOpportunityResponse(BaseModel):
    """Opportunity response for creator view."""
    id: UUID
    agency_id: UUID
    agency_name: str
    agency_logo_url: Optional[str] = None

    title: str
    brand_name: str
    brand_logo_url: Optional[str] = None
    description: str

    requirements: Dict[str, Any] = {}
    compensation: Dict[str, Any] = {}

    deadline: Optional[datetime] = None
    content_deadline: Optional[datetime] = None

    status: OpportunityStatus
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None

    project_id: Optional[UUID] = None

    created_at: datetime


class CreatorOpportunityListResponse(BaseModel):
    """Simplified opportunity list for creator."""
    id: UUID
    agency_name: str
    title: str
    brand_name: str
    status: OpportunityStatus
    deadline: Optional[datetime] = None
    sent_at: Optional[datetime] = None


class OpportunityAcceptRequest(BaseModel):
    """Schema for accepting an opportunity."""
    notes: Optional[str] = Field(None, max_length=1000)


class OpportunityDeclineRequest(BaseModel):
    """Schema for declining an opportunity."""
    reason: Optional[str] = Field(None, max_length=1000)


# ============================================
# Opportunity Filter Schemas
# ============================================

class OpportunityFilters(BaseModel):
    """Filters for listing opportunities."""
    status: Optional[OpportunityStatus] = None
    creator_id: Optional[UUID] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
