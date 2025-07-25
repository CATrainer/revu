"""
Users endpoints.

User profile and membership management.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_active_user, get_password_hash
from app.models.user import User, UserMembership
from app.schemas.user import UserUpdate, User as UserSchema
from app.schemas.membership import MembershipResponse

router = APIRouter()


@router.get("/me", response_model=UserSchema)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current user's profile.
    """
    return current_user


@router.put("/me", response_model=UserSchema)
async def update_current_user(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    user_update: UserUpdate,
):
    """
    Update current user's profile.
    """
    # Update fields
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Handle password update
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.get("/me/memberships", response_model=List[MembershipResponse])
async def get_my_memberships(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all organization memberships for the current user.
    """
    result = await db.execute(
        select(UserMembership)
        .where(UserMembership.user_id == current_user.id)
        .options(
            selectinload(UserMembership.organization),
            selectinload(UserMembership.location),
        )
    )
    memberships = result.scalars().all()
    return memberships


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete current user's account.
    
    This will remove the user from all organizations.
    """
    # Check if user is the only owner of any organization
    result = await db.execute(
        select(UserMembership)
        .where(
            UserMembership.user_id == current_user.id,
            UserMembership.role == "owner",
        )
    )
    owner_memberships = result.scalars().all()
    
    for membership in owner_memberships:
        # Check if there are other owners
        other_owners_result = await db.execute(
            select(UserMembership)
            .where(
                UserMembership.organization_id == membership.organization_id,
                UserMembership.role == "owner",
                UserMembership.user_id != current_user.id,
            )
        )
        other_owners = other_owners_result.scalars().all()
        
        if not other_owners:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete account: You are the only owner of organization {membership.organization_id}. Transfer ownership first.",
            )
    
    # Delete user (cascades to memberships)
    await db.delete(current_user)
    await db.commit()
    
    return None