"""
Organizations endpoints.

Basic CRUD operations for organizations.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.organization import Organization
from app.models.user import User, UserMembership
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationListResponse,
)

router = APIRouter()


@router.get("/", response_model=List[OrganizationListResponse])
async def list_organizations(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    List all organizations the current user has access to.
    """
    # Get user's organization memberships
    result = await db.execute(
        select(Organization)
        .join(UserMembership)
        .where(UserMembership.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    organizations = result.scalars().all()
    return organizations


@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    organization_in: OrganizationCreate,
):
    """
    Create a new organization and make the current user the owner.
    """
    # Create organization
    organization = Organization(
        name=organization_in.name,
        type=organization_in.type,
        billing_email=organization_in.billing_email or current_user.email,
    )
    db.add(organization)
    await db.flush()
    
    # Create owner membership
    membership = UserMembership(
        user_id=current_user.id,
        organization_id=organization.id,
        role="owner",
    )
    db.add(membership)
    
    await db.commit()
    await db.refresh(organization)
    
    return organization


@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID,
):
    """
    Get a specific organization by ID.
    """
    # Check if user has access
    result = await db.execute(
        select(Organization)
        .join(UserMembership)
        .where(
            Organization.id == organization_id,
            UserMembership.user_id == current_user.id,
        )
        .options(selectinload(Organization.locations))
    )
    organization = result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    
    return organization


@router.put("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID,
    organization_in: OrganizationUpdate,
):
    """
    Update an organization. Only admins and owners can update.
    """
    # Get organization and check permissions
    result = await db.execute(
        select(Organization, UserMembership)
        .join(UserMembership)
        .where(
            Organization.id == organization_id,
            UserMembership.user_id == current_user.id,
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    
    organization, membership = row
    
    # Check if user is admin or owner
    if membership.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    # Update fields
    update_data = organization_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)
    
    await db.commit()
    await db.refresh(organization)
    
    return organization


@router.delete("/{organization_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID,
):
    """
    Delete an organization. Only owners can delete.
    """
    # Get organization and check permissions
    result = await db.execute(
        select(Organization, UserMembership)
        .join(UserMembership)
        .where(
            Organization.id == organization_id,
            UserMembership.user_id == current_user.id,
            UserMembership.role == "owner",
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found or insufficient permissions",
        )
    
    organization, _ = row
    
    await db.delete(organization)
    await db.commit()
    
    return None