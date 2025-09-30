"""AI Context management endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_async_session, get_current_active_user
from app.models.user import User
from app.models.ai_context import UserAIContext
from app.services.context_analyzer import ContextAnalyzer

router = APIRouter()


class ContextResponse(BaseModel):
    """AI Context response model."""
    
    user_id: UUID
    channel_name: Optional[str] = None
    niche: Optional[str] = None
    content_type: Optional[str] = None
    avg_video_length: Optional[int] = None
    upload_frequency: Optional[str] = None
    primary_platform: Optional[str] = None
    subscriber_count: Optional[int] = None
    avg_views: Optional[int] = None
    engagement_rate: Optional[float] = None
    primary_audience_age: Optional[str] = None
    primary_audience_geo: Optional[str] = None
    top_performing_topics: Optional[list] = None
    content_pillars: Optional[list] = None
    posting_times: Optional[list] = None
    goals: Optional[str] = None
    target_audience: Optional[str] = None
    brand_voice: Optional[str] = None
    custom_notes: Optional[str] = None
    last_auto_update: Optional[str] = None
    last_user_edit: Optional[str] = None
    data_sources: Optional[list] = None
    
    class Config:
        from_attributes = True


class ContextUpdateRequest(BaseModel):
    """Update AI context request."""
    
    niche: Optional[str] = None
    content_type: Optional[str] = None
    upload_frequency: Optional[str] = None
    goals: Optional[str] = None
    target_audience: Optional[str] = None
    brand_voice: Optional[str] = None
    custom_notes: Optional[str] = None
    content_pillars: Optional[list] = None


@router.get("/context", response_model=ContextResponse)
async def get_context(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get user's AI context."""
    result = await db.execute(
        select(UserAIContext).where(UserAIContext.user_id == current_user.id)
    )
    context = result.scalar_one_or_none()
    
    if not context:
        # No context yet, create one by analyzing
        context = await ContextAnalyzer.update_user_context(db, str(current_user.id))
    
    return context


@router.post("/context/refresh", response_model=ContextResponse)
async def refresh_context(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Refresh AI context from connected platforms."""
    context = await ContextAnalyzer.update_user_context(db, str(current_user.id))
    return context


@router.put("/context", response_model=ContextResponse)
async def update_context(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    data: ContextUpdateRequest,
):
    """Update user's AI context manually."""
    result = await db.execute(
        select(UserAIContext).where(UserAIContext.user_id == current_user.id)
    )
    context = result.scalar_one_or_none()
    
    if not context:
        # Create if doesn't exist
        context = UserAIContext(user_id=current_user.id)
        db.add(context)
    
    # Update fields
    if data.niche is not None:
        context.niche = data.niche
    if data.content_type is not None:
        context.content_type = data.content_type
    if data.upload_frequency is not None:
        context.upload_frequency = data.upload_frequency
    if data.goals is not None:
        context.goals = data.goals
    if data.target_audience is not None:
        context.target_audience = data.target_audience
    if data.brand_voice is not None:
        context.brand_voice = data.brand_voice
    if data.custom_notes is not None:
        context.custom_notes = data.custom_notes
    if data.content_pillars is not None:
        context.content_pillars = data.content_pillars
    
    from datetime import datetime
    context.last_user_edit = datetime.utcnow()
    
    await db.commit()
    await db.refresh(context)
    
    return context
