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
from app.schemas.user import UserUpdate, User as UserSchema, UserAccessUpdate
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


# Admin endpoints for managing early access
@router.get("/waiting-list", response_model=List[UserSchema])
async def get_waiting_list_users(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get users on waiting list (admin only).
    
    Note: In a real app, you'd want proper admin role checking here.
    """
    # TODO: Add proper admin role checking
    
    result = await db.execute(
        select(User)
        .where(User.access_status == "waiting_list")
        .order_by(User.joined_waiting_list_at.desc())
        .offset(skip)
        .limit(limit)
    )
    users = result.scalars().all()
    return users


@router.post("/{user_id}/grant-early-access", response_model=UserSchema)
async def grant_early_access(
    *,
    db: AsyncSession = Depends(get_async_session),
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
):
    """
    Grant early access to a user (admin only).
    
    Note: In a real app, you'd want proper admin role checking here.
    """
    # TODO: Add proper admin role checking
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Grant early access
    from datetime import datetime
    user.access_status = "early_access"
    if not user.early_access_granted_at:
        user.early_access_granted_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.get("/demo-requests", response_model=List[UserSchema])
async def get_demo_requests(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get users who have requested demos (admin only).
    
    Note: In a real app, you'd want proper admin role checking here.
    """
    # TODO: Add proper admin role checking
    
    result = await db.execute(
        select(User)
        .where(User.demo_requested == True)
        .order_by(User.demo_requested_at.desc())
        .offset(skip)
        .limit(limit)
    )
    users = result.scalars().all()
    return users


@router.patch("/{user_id}/access-status", response_model=UserSchema)
async def update_user_access_status(
    *,
    db: AsyncSession = Depends(get_async_session),
    user_id: UUID,
    access_update: UserAccessUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update user's access status (admin only).
    
    Note: In a real app, you'd want proper admin role checking here.
    """
    # TODO: Add proper admin role checking
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update access status
    old_status = user.access_status
    user.access_status = access_update.access_status
    
    # Set timestamps based on new status
    from datetime import datetime
    if access_update.access_status == "early_access" and old_status != "early_access":
        if not user.early_access_granted_at:
            user.early_access_granted_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return user