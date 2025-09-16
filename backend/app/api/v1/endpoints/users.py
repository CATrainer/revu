"""
Users endpoints.

User profile and membership management.
"""

from typing import List
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_active_user, get_password_hash
from app.models.user import User
from app.schemas.user import UserUpdate, User as UserSchema, UserAccessUpdate, WaitlistJoin, WaitlistAccountCreate, DemoRequest, AdminNotes
from app.schemas.membership import MembershipResponse

router = APIRouter()


@router.post("/waitlist/join", response_model=dict)
async def join_waitlist(
    waitlist_data: WaitlistJoin,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Add user to waiting list without creating a full account.
    If user already exists, update their contact info.
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == waitlist_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        # Update existing user's contact info
        for field, value in waitlist_data.model_dump(exclude_unset=True).items():
            if field != "email":  # Don't update email
                setattr(existing_user, field, value)
        
        # Set joined_waiting_list_at if not already set
        if not existing_user.joined_waiting_list_at:
            existing_user.joined_waiting_list_at = datetime.now(timezone.utc)
            
        await db.commit()
        await db.refresh(existing_user)
        
        return {
            "message": "Contact information updated successfully",
            "user_id": str(existing_user.id),
            "has_account": existing_user.has_account
        }
    else:
        # Create new waitlist entry
        new_user = User(
            **waitlist_data.model_dump(),
            has_account=False,
            access_status="waiting",
            user_kind="content",
            joined_waiting_list_at=datetime.now(timezone.utc),
            hashed_password=None  # No password yet
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return {
            "message": "Successfully joined the waiting list",
            "user_id": str(new_user.id),
            "has_account": False
        }


@router.post("/waitlist/create-account", response_model=UserSchema)
async def create_account_from_waitlist(
    account_data: WaitlistAccountCreate,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Upgrade a waitlist user to a full account with password.
    """
    # Find the waitlist user
    result = await db.execute(select(User).where(User.email == account_data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found in waiting list"
        )
    
    if user.has_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an account"
        )
    
    # Upgrade to full account
    user.hashed_password = get_password_hash(account_data.password)
    user.has_account = True
    
    await db.commit()
    await db.refresh(user)
    
    return user


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
async def get_user_memberships(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get user membership info (simplified for social media focus).
    """
    # Return simplified membership info since UserMembership model was removed
    return [{
        "id": current_user.id,
        "user_id": current_user.id,
        "role": "owner",  # Default role for social media users
        "organization": None,
        "location": None
    }]


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
    # Simplified deletion for social media focus (no organization ownership checks needed)
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
        .where(User.access_status.in_(["waiting","waiting_list"]))
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
    
    # Grant full access (early access removed)
    from datetime import datetime
    user.access_status = "full"
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
    
    # Update access status and optional user_kind
    old_status = user.access_status
    user.access_status = access_update.access_status
    if getattr(access_update, "user_kind", None) in ("content", "business"):
        user.user_kind = access_update.user_kind
    
    # Set timestamps based on new status
    from datetime import datetime
    if access_update.access_status == "full" and old_status != "full":
        if not user.early_access_granted_at:
            user.early_access_granted_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/request-demo", response_model=dict)
async def request_demo(
    demo_data: DemoRequest,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Handle demo request. Creates user if doesn't exist, or updates existing user.
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == demo_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        # Update existing user with demo info
        for field, value in demo_data.model_dump(exclude_unset=True).items():
            if field != "email" and field != "message":  # Don't update email, ignore message for now
                setattr(existing_user, field, value)
        
        # Mark as demo requested
        existing_user.demo_requested = True
        if not existing_user.demo_requested_at:
            existing_user.demo_requested_at = datetime.now(timezone.utc)
            
        await db.commit()
        await db.refresh(existing_user)
        
        return {
            "message": "Demo request updated successfully",
            "user_id": str(existing_user.id),
            "existing_user": True
        }
    else:
        # Create new user for demo
        user_data = demo_data.model_dump(exclude={"message"})  # Exclude message from user data
        new_user = User(
            **user_data,
            has_account=False,
            access_status="waiting",
            user_kind="content",
            demo_requested=True,
            demo_requested_at=datetime.now(timezone.utc),
            hashed_password=None
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return {
            "message": "Demo request submitted successfully",
            "user_id": str(new_user.id),
            "existing_user": False
        }


@router.put("/{user_id}/admin-notes", response_model=UserSchema)
async def update_admin_notes(
    user_id: UUID,
    notes: AdminNotes,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update admin notes for a user. Admin only.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update notes
    notes_data = notes.model_dump(exclude_unset=True)
    for field, value in notes_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.put("/{user_id}/demo-scheduled", response_model=UserSchema)
async def mark_demo_scheduled(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Mark demo as scheduled. Admin only.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Mark demo as scheduled
    user.demo_scheduled_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.put("/{user_id}/demo-completed", response_model=UserSchema)
async def mark_demo_completed(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Mark demo as completed. Admin only.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Mark demo as completed
    user.demo_completed = True
    user.demo_completed_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(user)
    
    return user