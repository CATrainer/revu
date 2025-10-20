"""API endpoints for Fan CRM."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.fan import Fan
from app.models.interaction import Interaction
from app.schemas.fan import (
    FanCreate,
    FanUpdate,
    FanOut,
    FanList,
)

router = APIRouter()


@router.post("/fans", response_model=FanOut, status_code=status.HTTP_201_CREATED)
async def create_fan(
    payload: FanCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new fan profile."""
    # Check if fan with this username already exists
    existing = await session.execute(
        select(Fan).where(
            Fan.user_id == current_user.id,
            Fan.username == payload.username
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Fan with this username already exists")
    
    fan = Fan(
        **payload.model_dump(),
        user_id=current_user.id,
        organization_id=getattr(current_user, 'organization_id', None),
    )
    
    session.add(fan)
    await session.commit()
    await session.refresh(fan)
    
    return fan


@router.get("/fans", response_model=FanList)
async def list_fans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("engagement", description="engagement, recent, alphabetical, ltv"),
    
    # Filters
    is_superfan: Optional[bool] = Query(None),
    is_vip: Optional[bool] = Query(None),
    is_customer: Optional[bool] = Query(None),
    tags: Optional[List[str]] = Query(None),
    
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List all fans with filtering and pagination."""
    # CRITICAL: Filter by demo mode to prevent data mixing
    query = select(Fan).where(
        Fan.user_id == current_user.id,
        Fan.is_demo == current_user.demo_mode
    )
    
    # Apply filters
    if is_superfan is not None:
        query = query.where(Fan.is_superfan == is_superfan)
    
    if is_vip is not None:
        query = query.where(Fan.is_vip == is_vip)
    
    if is_customer is not None:
        query = query.where(Fan.is_customer == is_customer)
    
    if tags:
        for tag in tags:
            query = query.where(Fan.tags.contains([tag]))
    
    # Apply sorting
    if sort_by == "engagement":
        query = query.order_by(desc(Fan.engagement_score), desc(Fan.last_interaction_at))
    elif sort_by == "recent":
        query = query.order_by(desc(Fan.last_interaction_at))
    elif sort_by == "alphabetical":
        query = query.order_by(Fan.username.asc())
    elif sort_by == "ltv":
        query = query.order_by(desc(Fan.lifetime_value), desc(Fan.engagement_score))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute
    result = await session.execute(query)
    fans = list(result.scalars().all())
    
    return FanList(
        fans=fans,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(fans)) < total
    )


@router.get("/fans/{fan_id}", response_model=FanOut)
async def get_fan(
    fan_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific fan profile."""
    fan = await session.get(Fan, fan_id)
    
    if not fan:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    # Security: Verify ownership
    if fan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    # CRITICAL: Prevent cross-mode access (demo vs real)
    if fan.is_demo != current_user.demo_mode:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    return fan


@router.patch("/fans/{fan_id}", response_model=FanOut)
async def update_fan(
    fan_id: UUID,
    payload: FanUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update a fan profile."""
    fan = await session.get(Fan, fan_id)
    
    if not fan:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    if fan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # CRITICAL: Prevent cross-mode modifications
    if fan.is_demo != current_user.demo_mode:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(fan, field, value)
    
    await session.commit()
    await session.refresh(fan)
    
    return fan


@router.delete("/fans/{fan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fan(
    fan_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a fan profile."""
    fan = await session.get(Fan, fan_id)
    
    if not fan:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    if fan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # CRITICAL: Prevent cross-mode deletions
    if fan.is_demo != current_user.demo_mode:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    await session.delete(fan)
    await session.commit()
    
    return None


@router.get("/fans/{fan_id}/interactions")
async def get_fan_interactions(
    fan_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get all interactions from a specific fan."""
    fan = await session.get(Fan, fan_id)
    
    if not fan:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    if fan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Fan not found")
    
    # Get interactions
    query = select(Interaction).where(
        Interaction.fan_id == fan_id
    ).order_by(desc(Interaction.created_at))
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await session.execute(query)
    interactions = list(result.scalars().all())
    
    return {
        "fan": fan,
        "interactions": interactions,
        "page": page,
        "page_size": page_size,
    }


@router.get("/fans/superfans/list")
async def list_superfans(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get top superfans by engagement score."""
    query = select(Fan).where(
        Fan.user_id == current_user.id,
        Fan.is_superfan == True,
        Fan.is_demo == current_user.demo_mode  # CRITICAL: Filter by demo mode
    ).order_by(
        desc(Fan.engagement_score),
        desc(Fan.total_interactions)
    ).limit(limit)
    
    result = await session.execute(query)
    superfans = list(result.scalars().all())
    
    return {"superfans": superfans, "total": len(superfans)}
