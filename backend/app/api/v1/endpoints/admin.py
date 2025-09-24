"""
Admin endpoints for user management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import List

from app.core.database import get_async_session
from app.models.user import User
from app.core.security import get_current_user
from pydantic import BaseModel
from app.tasks.marketing import sync_all_contacts

router = APIRouter(tags=["admin"])

class GrantAccessRequest(BaseModel):
    email: str | None = None  # For grant_user_access by email
    access_status: str  # waiting | full
    user_kind: str | None = None  # content | business

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    has_account: bool
    access_status: str
    user_kind: str | None = None
    joined_waiting_list_at: str | None
    early_access_granted_at: str | None
    demo_requested: bool
    created_at: str

@router.post("/grant-access")
async def grant_user_access(
    request: GrantAccessRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Grant early or full access to a user. (Admin only)"""
    
    # TODO: Add admin role check
    # if not current_user.is_admin:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Admin access required"
    #     )
    
    # Find the target user by email
    if not request.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")
    result = await db.execute(select(User).filter(User.email == request.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{request.email}' not found"
        )
    
    # Validate access status
    if request.access_status not in ["waiting", "full"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Access status must be 'waiting' or 'full'"
        )
    
    # Grant access
    old_status = user.access_status
    user.access_status = request.access_status
    if request.user_kind in ("content", "business"):
        user.user_kind = request.user_kind
    
    if request.access_status == "full" and not user.early_access_granted_at:
        user.early_access_granted_at = datetime.now(timezone.utc)
    
    if request.access_status in ["early_access", "full_access"] and not user.early_access_granted_at:
        user.early_access_granted_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(user)
    
    return {
    "message": f"Successfully granted {request.access_status} to {request.email}",
        "user": {
            "email": user.email,
            "old_status": old_status,
            "new_status": user.access_status,
            "granted_at": user.early_access_granted_at
        }
    }

@router.get("/waiting-list", response_model=List[UserResponse])
async def get_waiting_list(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get all users on the waiting list. (Admin only)"""
    
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    result = await db.execute(select(User).filter(User.access_status.in_(['waiting', 'waiting_list'])))
    waiting_users = result.scalars().all()
    
    return [
        UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            has_account=user.has_account,
            access_status=user.access_status,
            user_kind=getattr(user, "user_kind", None),
            joined_waiting_list_at=user.joined_waiting_list_at.isoformat() if user.joined_waiting_list_at else None,
            early_access_granted_at=user.early_access_granted_at.isoformat() if user.early_access_granted_at else None,
            demo_requested=user.demo_requested,
            created_at=user.created_at.isoformat() if user.created_at else ""
        )
        for user in waiting_users
    ]

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get all users with their access status. (Admin only)"""
    
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    result = await db.execute(select(User))
    all_users = result.scalars().all()
    
    return [
        UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            has_account=user.has_account,
            access_status=user.access_status,
            user_kind=getattr(user, "user_kind", None),
            joined_waiting_list_at=user.joined_waiting_list_at.isoformat() if user.joined_waiting_list_at else None,
            early_access_granted_at=user.early_access_granted_at.isoformat() if user.early_access_granted_at else None,
            demo_requested=user.demo_requested,
            created_at=user.created_at.isoformat() if user.created_at else ""
        )
        for user in all_users
    ]


@router.post("/users/{user_id}/access")
async def update_user_access(
    user_id: str,
    request: GrantAccessRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Update a specific user's access status. (Admin only)"""
    
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get the user to update
    result = await db.execute(select(User).where(User.id == user_id))
    user_to_update = result.scalar_one_or_none()
    
    if not user_to_update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate access status
    valid_statuses = ["waiting", "full"]
    if request.access_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid access status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    # Update access status
    user_to_update.access_status = request.access_status
    if request.user_kind in ("content", "business"):
        user_to_update.user_kind = request.user_kind
    if request.access_status == "full" and not user_to_update.early_access_granted_at:
        user_to_update.early_access_granted_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(user_to_update)
    
    return {
        "message": f"User access updated to {request.access_status}",
        "user_id": str(user_to_update.id),
        "new_status": user_to_update.access_status
    }
