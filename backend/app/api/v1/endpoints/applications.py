"""
Applications admin endpoints for managing user applications.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_admin_user
from app.models.application import Application, AdminNotificationSettings
from app.models.user import User
from app.schemas.application import (
    ApplicationApprove,
    ApplicationListResponse,
    ApplicationReject,
    ApplicationResponse,
    ApplicationUpdate,
    AdminNotificationSettingsCreate,
    AdminNotificationSettingsResponse,
    AdminNotificationSettingsUpdate,
)

router = APIRouter()


@router.get("/pending", response_model=List[ApplicationListResponse])
async def get_pending_applications(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get all pending applications (admin only).
    """
    query = (
        select(Application, User)
        .join(User, Application.user_id == User.id)
        .where(Application.status == 'pending')
    )
    
    if account_type in ['creator', 'agency']:
        query = query.where(Application.account_type == account_type)
    
    query = query.order_by(Application.submitted_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    applications_with_users = result.all()
    
    return [
        ApplicationListResponse(
            id=app.id,
            user_id=app.user_id,
            user_email=user.email,
            user_full_name=user.full_name,
            account_type=app.account_type,
            status=app.status,
            submitted_at=app.submitted_at,
            created_at=app.created_at,
        )
        for app, user in applications_with_users
    ]


@router.get("/approved", response_model=List[ApplicationListResponse])
async def get_approved_applications(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get all approved applications (admin only).
    """
    query = (
        select(Application, User)
        .join(User, Application.user_id == User.id)
        .where(Application.status == 'approved')
        .order_by(Application.reviewed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    applications_with_users = result.all()
    
    return [
        ApplicationListResponse(
            id=app.id,
            user_id=app.user_id,
            user_email=user.email,
            user_full_name=user.full_name,
            account_type=app.account_type,
            status=app.status,
            submitted_at=app.submitted_at,
            created_at=app.created_at,
        )
        for app, user in applications_with_users
    ]


@router.get("/rejected", response_model=List[ApplicationListResponse])
async def get_rejected_applications(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get all rejected applications (admin only).
    """
    query = (
        select(Application, User)
        .join(User, Application.user_id == User.id)
        .where(Application.status == 'rejected')
        .order_by(Application.reviewed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    applications_with_users = result.all()
    
    return [
        ApplicationListResponse(
            id=app.id,
            user_id=app.user_id,
            user_email=user.email,
            user_full_name=user.full_name,
            account_type=app.account_type,
            status=app.status,
            submitted_at=app.submitted_at,
            created_at=app.created_at,
        )
        for app, user in applications_with_users
    ]


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    application_id: UUID,
):
    """
    Get a specific application by ID (admin only).
    """
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    return application


@router.patch("/{application_id}/notes", response_model=ApplicationResponse)
async def update_application_notes(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    application_id: UUID,
    update_data: ApplicationUpdate,
):
    """
    Update admin notes for an application (admin only).
    """
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if update_data.admin_notes is not None:
        application.admin_notes = update_data.admin_notes
    
    await db.commit()
    await db.refresh(application)
    
    logger.info(f"Admin notes updated for application {application_id} by {current_user.email}")
    
    return application


@router.post("/{application_id}/approve", response_model=ApplicationResponse)
async def approve_application(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    application_id: UUID,
    approve_data: ApplicationApprove,
):
    """
    Approve an application (admin only).
    """
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if application.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application is already {application.status}"
        )
    
    # Get the user
    user_result = await db.execute(
        select(User).where(User.id == application.user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update application
    application.status = 'approved'
    application.reviewed_at = datetime.now(timezone.utc)
    application.reviewed_by = current_user.id
    
    # Update user
    user.approval_status = 'approved'
    user.approved_at = datetime.now(timezone.utc)
    user.approved_by = current_user.id
    user.access_status = 'full'  # Grant access for backward compatibility
    
    await db.commit()
    await db.refresh(application)
    await db.refresh(user)
    
    logger.info(f"Application {application_id} approved by {current_user.email} for user {user.email}")
    
    # Send approval email to user
    if approve_data.send_email:
        from app.tasks.email import send_application_approved_email
        try:
            send_application_approved_email.delay(
                user_email=user.email,
                user_name=user.full_name or user.email.split('@')[0],
                account_type=application.account_type
            )
            logger.info(f"Approval email queued for {user.email}")
        except Exception as e:
            logger.error(f"Failed to queue approval email for {user.email}: {e}")
    
    return application


@router.post("/{application_id}/reject", response_model=ApplicationResponse)
async def reject_application(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    application_id: UUID,
    reject_data: ApplicationReject,
):
    """
    Reject an application (admin only).
    """
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if application.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application is already {application.status}"
        )
    
    # Get the user
    user_result = await db.execute(
        select(User).where(User.id == application.user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update application
    application.status = 'rejected'
    application.reviewed_at = datetime.now(timezone.utc)
    application.reviewed_by = current_user.id
    if reject_data.reason:
        application.admin_notes = reject_data.reason
    
    # Update user
    user.approval_status = 'rejected'
    user.rejected_at = datetime.now(timezone.utc)
    user.rejected_by = current_user.id
    if reject_data.reason:
        user.rejection_reason = reject_data.reason
    
    await db.commit()
    await db.refresh(application)
    await db.refresh(user)
    
    logger.info(f"Application {application_id} rejected by {current_user.email} for user {user.email}")
    
    # Send rejection email to user
    if reject_data.send_email:
        from app.tasks.email import send_application_rejected_email
        try:
            send_application_rejected_email.delay(
                user_email=user.email,
                user_name=user.full_name or user.email.split('@')[0],
                account_type=application.account_type,
                rejection_reason=reject_data.reason
            )
            logger.info(f"Rejection email queued for {user.email}")
        except Exception as e:
            logger.error(f"Failed to queue rejection email for {user.email}: {e}")
    
    return application


# Admin notification settings endpoints
@router.get("/admin/notification-settings", response_model=List[AdminNotificationSettingsResponse])
async def get_notification_settings(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get all admin notification settings (admin only).
    """
    result = await db.execute(select(AdminNotificationSettings))
    settings = result.scalars().all()
    
    return settings


@router.post("/admin/notification-settings", response_model=AdminNotificationSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_notification_settings(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    settings_data: AdminNotificationSettingsCreate,
):
    """
    Create admin notification settings (admin only).
    """
    # Check if email already exists
    existing = await db.execute(
        select(AdminNotificationSettings).where(AdminNotificationSettings.email == settings_data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification settings for this email already exist"
        )
    
    settings = AdminNotificationSettings(
        email=settings_data.email,
        notification_types=settings_data.notification_types,
        added_by=current_user.id,
        added_at=datetime.now(timezone.utc),
    )
    
    db.add(settings)
    await db.commit()
    await db.refresh(settings)
    
    logger.info(f"Admin notification settings created for {settings_data.email} by {current_user.email}")
    
    return settings


@router.delete("/admin/notification-settings/{settings_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_settings(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_admin_user),
    settings_id: UUID,
):
    """
    Delete admin notification settings (admin only).
    """
    result = await db.execute(
        select(AdminNotificationSettings).where(AdminNotificationSettings.id == settings_id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification settings not found"
        )
    
    await db.delete(settings)
    await db.commit()
    
    logger.info(f"Admin notification settings deleted for {settings.email} by {current_user.email}")
    
    return None
