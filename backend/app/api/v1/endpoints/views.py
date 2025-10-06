"""API endpoints for custom views."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.view import InteractionView
from app.schemas.view import (
    ViewCreate,
    ViewUpdate,
    ViewOut,
    ViewList,
    VIEW_TEMPLATES,
)

router = APIRouter()


@router.post("/views", response_model=ViewOut, status_code=status.HTTP_201_CREATED)
async def create_view(
    payload: ViewCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new custom view."""
    view = InteractionView(
        name=payload.name,
        description=payload.description,
        icon=payload.icon,
        color=payload.color,
        type=payload.type,
        filters=payload.filters.model_dump(exclude_none=True),
        display=payload.display.model_dump(),
        is_pinned=payload.is_pinned,
        is_shared=payload.is_shared,
        order_index=payload.order_index,
        user_id=current_user.id,
        organization_id=getattr(current_user, 'organization_id', None),
    )
    
    session.add(view)
    await session.commit()
    await session.refresh(view)
    
    return view


@router.get("/views", response_model=ViewList)
async def list_views(
    include_shared: bool = Query(True, description="Include organization shared views"),
    only_pinned: bool = Query(False, description="Only return pinned views"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List all views accessible to the user."""
    # Build query for user's views
    conditions = [InteractionView.user_id == current_user.id]
    
    # Optionally include shared views from organization
    if include_shared and hasattr(current_user, 'organization_id') and current_user.organization_id:
        conditions.append(
            and_(
                InteractionView.organization_id == current_user.organization_id,
                InteractionView.is_shared == True
            )
        )
    
    # Build final query
    stmt = select(InteractionView).where(
        InteractionView.user_id == current_user.id
    )
    
    if only_pinned:
        stmt = stmt.where(InteractionView.is_pinned == True)
    
    # Order by pinned first, then by order_index
    stmt = stmt.order_by(
        InteractionView.is_pinned.desc(),
        InteractionView.order_index.asc(),
        InteractionView.created_at.desc()
    )
    
    result = await session.execute(stmt)
    views = list(result.scalars().all())
    
    return ViewList(
        views=views,
        total=len(views)
    )


@router.get("/views/{view_id}", response_model=ViewOut)
async def get_view(
    view_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific view by ID."""
    view = await session.get(InteractionView, view_id)
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Check access permissions
    if view.user_id != current_user.id:
        # Check if it's a shared org view
        if not (view.is_shared and 
                hasattr(current_user, 'organization_id') and 
                view.organization_id == current_user.organization_id):
            raise HTTPException(status_code=404, detail="View not found")
    
    return view


@router.patch("/views/{view_id}", response_model=ViewOut)
async def update_view(
    view_id: UUID,
    payload: ViewUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update a view."""
    view = await session.get(InteractionView, view_id)
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Only owner can update (not shared users)
    if view.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this view")
    
    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ['filters', 'display'] and value:
            # For nested models, convert to dict
            setattr(view, field, value.model_dump(exclude_none=True) if hasattr(value, 'model_dump') else value)
        else:
            setattr(view, field, value)
    
    await session.commit()
    await session.refresh(view)
    
    return view


@router.delete("/views/{view_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_view(
    view_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a view."""
    view = await session.get(InteractionView, view_id)
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Only owner can delete
    if view.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this view")
    
    # Prevent deleting system views
    if view.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system views")
    
    await session.delete(view)
    await session.commit()
    
    return None


@router.post("/views/{view_id}/pin", response_model=ViewOut)
async def pin_view(
    view_id: UUID,
    pinned: bool = Query(True, description="Pin or unpin the view"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Pin or unpin a view to sidebar."""
    view = await session.get(InteractionView, view_id)
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    if view.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    view.is_pinned = pinned
    await session.commit()
    await session.refresh(view)
    
    return view


@router.get("/views/templates/list")
async def list_view_templates(
    current_user: User = Depends(get_current_active_user),
):
    """Get list of predefined view templates."""
    return {"templates": [t.model_dump() for t in VIEW_TEMPLATES]}


@router.post("/views/from-template/{template_name}", response_model=ViewOut, status_code=status.HTTP_201_CREATED)
async def create_from_template(
    template_name: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a view from a predefined template."""
    # Find template
    template = next((t for t in VIEW_TEMPLATES if t.name.lower().replace(" ", "-") == template_name.lower()), None)
    
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
    
    # Create view from template
    view = InteractionView(
        name=template.name,
        description=template.description,
        icon=template.icon,
        color=template.color,
        type='custom',
        filters=template.filters.model_dump(exclude_none=True),
        display=template.display.model_dump(),
        is_template=False,
        user_id=current_user.id,
        organization_id=getattr(current_user, 'organization_id', None),
    )
    
    session.add(view)
    await session.commit()
    await session.refresh(view)
    
    return view


@router.post("/views/{view_id}/duplicate", response_model=ViewOut, status_code=status.HTTP_201_CREATED)
async def duplicate_view(
    view_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Duplicate an existing view."""
    original = await session.get(InteractionView, view_id)
    
    if not original:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Check access
    if original.user_id != current_user.id:
        if not (original.is_shared and 
                hasattr(current_user, 'organization_id') and 
                original.organization_id == current_user.organization_id):
            raise HTTPException(status_code=404, detail="View not found")
    
    # Create duplicate
    duplicate = InteractionView(
        name=f"{original.name} (Copy)",
        description=original.description,
        icon=original.icon,
        color=original.color,
        type=original.type,
        filters=original.filters,
        display=original.display,
        user_id=current_user.id,
        organization_id=getattr(current_user, 'organization_id', None),
    )
    
    session.add(duplicate)
    await session.commit()
    await session.refresh(duplicate)
    
    return duplicate
