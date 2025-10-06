"""Pydantic schemas for interaction threads."""
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel


class ThreadBase(BaseModel):
    """Base thread schema."""
    author_username: str
    author_name: Optional[str] = None
    platform: str


class ThreadOut(ThreadBase):
    """Schema for thread output."""
    id: UUID
    
    # Metadata
    interaction_count: int = 1
    first_interaction_at: Optional[datetime] = None
    last_interaction_at: Optional[datetime] = None
    sentiment_summary: Optional[str] = None
    is_customer: bool = False
    total_revenue: Decimal = Decimal(0)
    
    # Relations
    fan_id: Optional[UUID] = None
    user_id: UUID
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ThreadWithInteractions(ThreadOut):
    """Thread with full interaction list."""
    interactions: List[Any]  # List of InteractionOut
