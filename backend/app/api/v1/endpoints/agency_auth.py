"""
Agency authentication endpoints.

Handles agency signup and agency-specific auth operations.
"""

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.core.security import create_access_token, create_refresh_token
from app.schemas.agency import AgencySignupRequest, AgencySignupResponse
from app.schemas.user import UserCreate
from app.services.agency_service import AgencyService
from app.services.user import UserService
from app.tasks.email import send_agency_signup_admin_notification

router = APIRouter()


@router.post("/signup", response_model=AgencySignupResponse, status_code=status.HTTP_201_CREATED)
async def agency_signup(
    *,
    db: AsyncSession = Depends(get_async_session),
    signup_data: AgencySignupRequest,
) -> Any:
    """
    Create a new agency account.

    This creates:
    1. A new user account (agency owner)
    2. A new agency
    3. Links the user as agency owner

    Agencies are auto-approved but an email notification is sent to admins.

    Args:
        db: Database session
        signup_data: Agency signup data

    Returns:
        AgencySignupResponse: User ID, agency ID, and auth tokens

    Raises:
        HTTPException: If email already registered
    """
    user_service = UserService(db)
    agency_service = AgencyService(db)

    # Check if user exists
    existing_user = await user_service.get_by_email(email=signup_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user account
    user = await user_service.create(
        user_create=UserCreate(
            email=signup_data.email,
            password=signup_data.password,
            full_name=signup_data.full_name,
        )
    )

    # Set user as agency type, auto-approved
    user.account_type = "agency"
    user.approval_status = "approved"  # Agencies are auto-approved
    user.access_status = "full"  # Legacy field
    user.user_kind = "content"  # Legacy field
    user.has_account = True

    await db.commit()
    await db.refresh(user)

    # Create the agency
    agency = await agency_service.create_agency(
        name=signup_data.agency_name,
        owner_id=user.id,
        website=signup_data.website,
    )

    # Create auth tokens
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(
        subject=str(user.id),
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    logger.info(f"Agency signup complete: {signup_data.agency_name} (user={user.email})")

    # Send admin notification (async task)
    try:
        send_agency_signup_admin_notification.delay(
            agency_name=signup_data.agency_name,
            owner_email=user.email,
            owner_name=signup_data.full_name,
        )
    except Exception as e:
        # Don't fail signup if email notification fails
        logger.error(f"Failed to queue agency signup notification: {e}")

    return AgencySignupResponse(
        user_id=user.id,
        agency_id=agency.id,
        agency_slug=agency.slug,
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/complete-signup", response_model=AgencySignupResponse)
async def complete_agency_signup(
    *,
    db: AsyncSession = Depends(get_async_session),
    signup_data: AgencySignupRequest,
) -> Any:
    """
    Complete agency signup for an existing user.

    This is used when an existing user (e.g., creator) wants to
    create an agency account.

    NOTE: This endpoint is for future use. Currently, we require
    a fresh signup for agencies.

    Args:
        db: Database session
        signup_data: Agency signup data (only agency_name, website used)

    Raises:
        HTTPException: Not implemented yet
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Converting existing accounts to agency accounts is not yet supported",
    )
