"""API endpoints for interactions (comments, DMs, mentions)."""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.interaction import Interaction
from app.models.view import InteractionView
from app.schemas.interaction import (
    InteractionCreate,
    InteractionUpdate,
    InteractionOut,
    InteractionList,
    InteractionFilters,
    BulkActionRequest,
    BulkActionResponse,
)

router = APIRouter()


def build_filter_query(
    base_query,
    filters: InteractionFilters,
    user_id: UUID
):
    """Build SQLAlchemy query from filter parameters."""
    conditions = [Interaction.user_id == user_id]
    
    if filters.platforms:
        conditions.append(Interaction.platform.in_(filters.platforms))
    
    if filters.types:
        conditions.append(Interaction.type.in_(filters.types))
    
    if filters.keywords:
        # Search in content for any keyword
        keyword_conditions = [
            Interaction.content.ilike(f"%{kw}%") for kw in filters.keywords
        ]
        conditions.append(or_(*keyword_conditions))
    
    if filters.sentiment:
        conditions.append(Interaction.sentiment == filters.sentiment)
    
    if filters.priority_min:
        conditions.append(Interaction.priority_score >= filters.priority_min)
    
    if filters.priority_max:
        conditions.append(Interaction.priority_score <= filters.priority_max)
    
    if filters.status:
        conditions.append(Interaction.status.in_(filters.status))
    
    if filters.tags:
        # Check if interaction has any of the specified tags
        for tag in filters.tags:
            conditions.append(Interaction.tags.contains([tag]))
    
    if filters.categories:
        # Check if interaction has any of the specified categories
        for category in filters.categories:
            conditions.append(Interaction.categories.contains([category]))
    
    if filters.has_replies is not None:
        if filters.has_replies:
            conditions.append(Interaction.reply_count > 0)
        else:
            conditions.append(Interaction.reply_count == 0)
    
    if filters.is_unread is not None:
        if filters.is_unread:
            conditions.append(Interaction.status == 'unread')
        else:
            conditions.append(Interaction.status != 'unread')
    
    if filters.date_from:
        conditions.append(Interaction.created_at >= filters.date_from)
    
    if filters.date_to:
        conditions.append(Interaction.created_at <= filters.date_to)
    
    if filters.author_username:
        conditions.append(Interaction.author_username.ilike(f"%{filters.author_username}%"))
    
    if filters.assigned_to_user_id:
        conditions.append(Interaction.assigned_to_user_id == filters.assigned_to_user_id)
    
    if filters.fan_id:
        conditions.append(Interaction.fan_id == filters.fan_id)
    
    return base_query.where(and_(*conditions))


@router.post("/interactions", response_model=InteractionOut, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    payload: InteractionCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new interaction (typically from platform sync)."""
    # Check for duplicate platform_id
    existing = await session.execute(
        select(Interaction).where(Interaction.platform_id == payload.platform_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Interaction with this platform_id already exists")
    
    interaction = Interaction(
        **payload.model_dump(exclude={'platform_created_at'}),
        platform_created_at=payload.platform_created_at or datetime.utcnow(),
        user_id=current_user.id,
        organization_id=getattr(current_user, 'organization_id', None),
    )
    
    session.add(interaction)
    await session.commit()
    await session.refresh(interaction)
    
    # TODO: Trigger workflow evaluation in background
    # TODO: Update thread and fan records
    
    return interaction


@router.get("/interactions", response_model=InteractionList)
async def list_interactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("newest", description="newest, oldest, priority, engagement"),
    
    # Filter parameters
    platforms: Optional[List[str]] = Query(None),
    types: Optional[List[str]] = Query(None),
    keywords: Optional[List[str]] = Query(None),
    sentiment: Optional[str] = Query(None),
    priority_min: Optional[int] = Query(None, ge=1, le=100),
    priority_max: Optional[int] = Query(None, ge=1, le=100),
    status: Optional[List[str]] = Query(None),
    tags: Optional[List[str]] = Query(None),
    
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List interactions with filtering and pagination."""
    # Build filters
    filters = InteractionFilters(
        platforms=platforms,
        types=types,
        keywords=keywords,
        sentiment=sentiment,
        priority_min=priority_min,
        priority_max=priority_max,
        status=status,
        tags=tags,
    )
    
    # Build query
    query = select(Interaction)
    query = build_filter_query(query, filters, current_user.id)
    
    # Apply sorting
    if sort_by == "newest":
        query = query.order_by(desc(Interaction.created_at))
    elif sort_by == "oldest":
        query = query.order_by(Interaction.created_at.asc())
    elif sort_by == "priority":
        query = query.order_by(desc(Interaction.priority_score), desc(Interaction.created_at))
    elif sort_by == "engagement":
        query = query.order_by(desc(Interaction.like_count + Interaction.reply_count), desc(Interaction.created_at))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await session.execute(query)
    interactions = list(result.scalars().all())
    
    return InteractionList(
        interactions=interactions,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(interactions)) < total
    )


@router.get("/interactions/by-view/{view_id}", response_model=InteractionList)
async def list_interactions_by_view(
    view_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List interactions filtered by a specific view's configuration."""
    # Get view
    view = await session.get(InteractionView, view_id)
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Check access
    if view.user_id != current_user.id:
        if not (view.is_shared and 
                hasattr(current_user, 'organization_id') and 
                view.organization_id == current_user.organization_id):
            raise HTTPException(status_code=404, detail="View not found")
    
    # Parse view filters
    filters = InteractionFilters(**view.filters)
    
    # Build query
    query = select(Interaction)
    query = build_filter_query(query, filters, current_user.id)
    
    # Apply view's sort preferences
    sort_by = view.display.get('sortBy', 'newest')
    if sort_by == "newest":
        query = query.order_by(desc(Interaction.created_at))
    elif sort_by == "oldest":
        query = query.order_by(Interaction.created_at.asc())
    elif sort_by == "priority":
        query = query.order_by(desc(Interaction.priority_score), desc(Interaction.created_at))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute
    result = await session.execute(query)
    interactions = list(result.scalars().all())
    
    return InteractionList(
        interactions=interactions,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(interactions)) < total
    )


@router.get("/interactions/{interaction_id}", response_model=InteractionOut)
async def get_interaction(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific interaction by ID."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    return interaction


@router.patch("/interactions/{interaction_id}", response_model=InteractionOut)
async def update_interaction(
    interaction_id: UUID,
    payload: InteractionUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update an interaction."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(interaction, field, value)
    
    # Update read_at timestamp if marking as read
    if payload.status == 'read' and interaction.read_at is None:
        interaction.read_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(interaction)
    
    return interaction


@router.delete("/interactions/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interaction(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an interaction."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await session.delete(interaction)
    await session.commit()
    
    return None


@router.post("/interactions/bulk-action", response_model=BulkActionResponse)
async def bulk_action(
    payload: BulkActionRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Perform bulk actions on multiple interactions."""
    # Get interactions
    query = select(Interaction).where(
        and_(
            Interaction.id.in_(payload.interaction_ids),
            Interaction.user_id == current_user.id
        )
    )
    result = await session.execute(query)
    interactions = list(result.scalars().all())
    
    if not interactions:
        raise HTTPException(status_code=404, detail="No interactions found")
    
    updated_count = 0
    failed_ids = []
    
    for interaction in interactions:
        try:
            if payload.action == "tag":
                if interaction.tags is None:
                    interaction.tags = []
                if payload.value not in interaction.tags:
                    interaction.tags.append(payload.value)
            
            elif payload.action == "untag":
                if interaction.tags and payload.value in interaction.tags:
                    interaction.tags.remove(payload.value)
            
            elif payload.action == "mark_read":
                interaction.status = "read"
                if interaction.read_at is None:
                    interaction.read_at = datetime.utcnow()
            
            elif payload.action == "mark_unread":
                interaction.status = "unread"
                interaction.read_at = None
            
            elif payload.action == "archive":
                interaction.status = "archived"
            
            elif payload.action == "spam":
                interaction.status = "spam"
            
            elif payload.action == "assign":
                interaction.assigned_to_user_id = UUID(payload.value) if payload.value else None
            
            else:
                failed_ids.append(interaction.id)
                continue
            
            updated_count += 1
        
        except Exception as e:
            failed_ids.append(interaction.id)
            continue
    
    await session.commit()
    
    return BulkActionResponse(
        success=True,
        updated_count=updated_count,
        failed_ids=failed_ids,
        message=f"Successfully updated {updated_count} of {len(payload.interaction_ids)} interactions"
    )
