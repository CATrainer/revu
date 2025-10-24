"""
Onboarding endpoints for application-based signup flow.
"""

from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.application import Application
from app.models.user import User
from app.schemas.application import (
    AccountTypeSelect,
    ApplicationCreate,
    ApplicationResponse,
    CreatorApplicationData,
    AgencyApplicationData,
)

router = APIRouter()


@router.post("/account-type", response_model=dict)
async def set_account_type(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    data: AccountTypeSelect,
):
    """
    Set the account type for the user during onboarding.
    This is the first step after account creation.
    """
    # Check if user already has account_type set
    if current_user.account_type and current_user.account_type != 'legacy':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account type already set"
        )
    
    # Update account type
    current_user.account_type = data.account_type
    
    await db.commit()
    await db.refresh(current_user)
    
    logger.info(f"User {current_user.email} selected account type: {data.account_type}")
    
    return {
        "message": "Account type set successfully",
        "account_type": data.account_type,
        "next_step": f"/onboarding/{data.account_type}-application"
    }


@router.post("/creator-application", response_model=ApplicationResponse)
async def submit_creator_application(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    application_data: CreatorApplicationData,
):
    """
    Submit a creator application.
    """
    # Check if user has already submitted an application
    existing_app = await db.execute(
        select(Application).where(Application.user_id == current_user.id)
    )
    existing_application = existing_app.scalar_one_or_none()
    
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application already submitted"
        )
    
    # Check account type is creator
    if current_user.account_type != 'creator':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account type must be 'creator' to submit creator application"
        )
    
    # Create application
    application = Application(
        user_id=current_user.id,
        account_type='creator',
        application_data=application_data.model_dump(),
        submitted_at=datetime.now(timezone.utc),
        status='pending',
    )
    
    # Update user
    current_user.application_submitted_at = datetime.now(timezone.utc)
    current_user.approval_status = 'pending'
    
    db.add(application)
    await db.commit()
    await db.refresh(application)
    
    logger.info(f"Creator application submitted: {current_user.email}")
    
    # Send notification emails to admins
    from app.tasks.email import send_new_application_notification_to_admins
    try:
        send_new_application_notification_to_admins.delay(
            applicant_email=current_user.email,
            applicant_name=current_user.full_name or current_user.email.split('@')[0],
            account_type='creator',
            application_id=str(application.id)
        )
        logger.info(f"Admin notifications queued for creator application {application.id}")
    except Exception as e:
        logger.error(f"Failed to queue admin notifications: {e}")
    
    return application


@router.post("/agency-application", response_model=ApplicationResponse)
async def submit_agency_application(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    application_data: AgencyApplicationData,
):
    """
    Submit an agency application.
    """
    # Check if user has already submitted an application
    existing_app = await db.execute(
        select(Application).where(Application.user_id == current_user.id)
    )
    existing_application = existing_app.scalar_one_or_none()
    
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application already submitted"
        )
    
    # Check account type is agency
    if current_user.account_type != 'agency':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account type must be 'agency' to submit agency application"
        )
    
    # Create application
    application = Application(
        user_id=current_user.id,
        account_type='agency',
        application_data=application_data.model_dump(),
        submitted_at=datetime.now(timezone.utc),
        status='pending',
    )
    
    # Update user
    current_user.application_submitted_at = datetime.now(timezone.utc)
    current_user.approval_status = 'pending'
    
    db.add(application)
    await db.commit()
    await db.refresh(application)
    
    logger.info(f"Agency application submitted: {current_user.email} (HIGH PRIORITY)")
    
    # Send HIGH PRIORITY notification emails to admins
    from app.tasks.email import send_new_application_notification_to_admins
    try:
        send_new_application_notification_to_admins.delay(
            applicant_email=current_user.email,
            applicant_name=current_user.full_name or current_user.email.split('@')[0],
            account_type='agency',
            application_id=str(application.id)
        )
        logger.info(f"Admin notifications queued for agency application {application.id}")
    except Exception as e:
        logger.error(f"Failed to queue admin notifications: {e}")
    
    return application


@router.get("/status", response_model=dict)
async def get_onboarding_status(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current onboarding status for the user.
    """
    # Check if application exists
    app_query = await db.execute(
        select(Application).where(Application.user_id == current_user.id)
    )
    application = app_query.scalar_one_or_none()
    
    return {
        "account_type": current_user.account_type,
        "approval_status": current_user.approval_status,
        "application_submitted": current_user.application_submitted_at is not None,
        "application_submitted_at": current_user.application_submitted_at,
        "approved_at": current_user.approved_at,
        "rejected_at": current_user.rejected_at,
        "has_application": application is not None,
        "application_status": application.status if application else None,
    }
