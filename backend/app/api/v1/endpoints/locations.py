"""
Locations endpoints.

CRUD operations for business locations.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.location import Location
from app.models.user import User, UserMembership
from app.models.organization import Organization
from app.schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationResponse,
    LocationListResponse,
)

router = APIRouter()


@router.get("/", response_model=List[LocationListResponse])
async def list_locations(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    List all locations the current user has access to.
    """
    query = (
        select(Location)
        .join(Organization)
        .join(UserMembership, UserMembership.organization_id == Organization.id)
        .where(UserMembership.user_id == current_user.id)
    )
    
    if organization_id:
        query = query.where(Location.organization_id == organization_id)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    locations = result.scalars().all()
    return locations


@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_in: LocationCreate,
):
    """
    Create a new location.
    """
    # Check if user has permission in the organization
    result = await db.execute(
        select(UserMembership)
        .where(
            UserMembership.user_id == current_user.id,
            UserMembership.organization_id == location_in.organization_id,
        )
    )
    membership = result.scalar_one_or_none()
    
    if not membership or membership.role not in ["owner", "admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to create location",
        )
    
    # Check organization location limit
    org_result = await db.execute(
        select(Organization).where(Organization.id == location_in.organization_id)
    )
    organization = org_result.scalar_one()
    
    # Count existing locations
    count_result = await db.execute(
        select(Location).where(Location.organization_id == organization.id)
    )
    location_count = len(count_result.scalars().all())
    
    if location_count >= organization.get_location_limit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Location limit reached for {organization.subscription_tier} tier",
        )
    
    # Create location
    location = Location(**location_in.model_dump())
    db.add(location)
    
    await db.commit()
    await db.refresh(location)
    
    return location


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
):
    """
    Get a specific location by ID.
    """
    result = await db.execute(
        select(Location)
        .join(Organization)
        .join(UserMembership, UserMembership.organization_id == Organization.id)
        .where(
            Location.id == location_id,
            UserMembership.user_id == current_user.id,
        )
        .options(
            selectinload(Location.reviews),
            selectinload(Location.platform_connections),
        )
    )
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    
    return location


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
    location_in: LocationUpdate,
):
    """
    Update a location.
    """
    # Get location and check permissions
    result = await db.execute(
        select(Location, UserMembership)
        .join(Organization)
        .join(UserMembership, UserMembership.organization_id == Organization.id)
        .where(
            Location.id == location_id,
            UserMembership.user_id == current_user.id,
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    
    location, membership = row
    
    # Check permissions
    if membership.role not in ["owner", "admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    # Update fields
    update_data = location_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)
    
    await db.commit()
    await db.refresh(location)
    
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
):
    """
    Delete a location. Only owners and admins can delete.
    """
    # Get location and check permissions
    result = await db.execute(
        select(Location, UserMembership)
        .join(Organization)
        .join(UserMembership, UserMembership.organization_id == Organization.id)
        .where(
            Location.id == location_id,
            UserMembership.user_id == current_user.id,
            UserMembership.role.in_(["owner", "admin"]),
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found or insufficient permissions",
        )
    
    location, _ = row
    
    await db.delete(location)
    await db.commit()
    
    return None


@router.post("/{location_id}/connect-platform")
async def connect_platform(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
    platform: str,
):
    """
    Initialize platform connection OAuth flow.
    """
    # TODO: Implement OAuth flow for each platform
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Platform connection not yet implemented",
    )