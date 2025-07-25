"""
AI schemas for request/response validation.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class GenerateResponseRequest(BaseModel):
    """Request to generate AI response."""
    review_id: UUID
    tone_override: Optional[str] = None
    include_alternatives: bool = True
    max_length: Optional[int] = Field(None, ge=50, le=1000)


class GenerateResponseResponse(BaseModel):
    """AI-generated response."""
    response_text: str
    alternatives: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BrandVoiceUpdate(BaseModel):
    """Update brand voice settings."""
    brand_voice: Optional[Dict[str, Any]] = None
    business_info: Optional[Dict[str, Any]] = None


class BrandVoiceResponse(BaseModel):
    """Brand voice profile response."""
    location_id: UUID
    brand_voice: Dict[str, Any]
    business_info: Dict[str, Any]


class TrainingExample(BaseModel):
    """Training example for brand voice."""
    review_text: str
    response_text: str
    rating: int = Field(..., ge=1, le=5)
    tags: List[str] = Field(default_factory=list)