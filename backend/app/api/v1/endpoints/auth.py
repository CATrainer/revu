"""
Authentication endpoints.

This module handles user authentication including login,
logout, token refresh, and password management.
"""

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Request
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from app.core.supabase import get_supabase_auth
from app.schemas.auth import (
    PasswordReset,
    PasswordResetRequest,
    Token,
    TokenRefresh,
    UserSignup,
)
from app.schemas.user import User, UserCreate, DemoRequest
from app.models.user import User as UserModel
from app.services.auth import AuthService
from app.services.user import UserService
from app.services.demo_data import DemoDataService
# from app.tasks.email import send_welcome_email  # DISABLED: Post-launch, no automated emails

router = APIRouter()


@router.post("/signup", response_model=User, status_code=status.HTTP_201_CREATED)
async def signup(
    *,
    db: AsyncSession = Depends(get_async_session),
    user_in: UserSignup,
) -> Any:
    """
    Create new user account with application-based approval workflow.
    
    New users start with pending status and must:
    1. Select account type (creator/agency)
    2. Submit application
    3. Wait for admin approval

    Args:
        db: Database session
        user_in: User signup data

    Returns:
        User: Created user object

    Raises:
        HTTPException: If email already registered
    """
    user_service = UserService(db)

    # Check if user exists
    existing_user = await user_service.get_by_email(email=user_in.email)
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user with pending approval
    user = await user_service.create(
        user_create=UserCreate(
            email=user_in.email,
            password=user_in.password,
            full_name=user_in.full_name,
        )
    )
    
    # Initialize user for approval workflow
    user.access_status = "pending"  # Legacy field for backward compatibility
    user.user_kind = "content"  # Default kind
    user.has_account = True
    user.approval_status = "pending"  # Must complete application and get approved
    user.account_type = None  # Will be set during onboarding
    
    await db.commit()
    await db.refresh(user)

    logger.info(f"New user created (pending approval): {user.email}")
    
    return user


@router.post("/login", response_model=Token)
async def login(
    *,
    db: AsyncSession = Depends(get_async_session),
    request: Request,
) -> Any:
    """
    OAuth2 compatible token login.

    Args:
        db: Database session
        form_data: OAuth2 form with username (email) and password

    Returns:
        Token: Access and refresh tokens

    Raises:
        HTTPException: If credentials are invalid
    """
    user_service = UserService(db)

    # Authenticate user
    # Accept either application/x-www-form-urlencoded (preferred) or JSON
    email: str | None = None
    password: str | None = None

    try:
        content_type = request.headers.get("content-type", "").lower()
        if "application/json" in content_type:
            body = await request.json()
            email = body.get("email") or body.get("username")
            password = body.get("password")
        else:
            # Fallback to parsing form-encoded body without python-multipart
            raw = (await request.body()).decode("utf-8")
            from urllib.parse import parse_qs
            parsed = parse_qs(raw)
            # parse_qs returns lists
            email = (parsed.get("username") or parsed.get("email") or [None])[0]
            password = (parsed.get("password") or [None])[0]
    except Exception as e:
        logger.error(f"Failed to parse login request body: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request body")

    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")

    try:
        user = await user_service.authenticate(
            email=email,
            password=password,
        )
    except Exception as e:
        logger.error(f"Login authentication error for {email}: {e}")
        # Avoid leaking internals; return generic 400
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Login failed")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Create tokens
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(
        subject=str(user.id),
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    logger.info(f"User logged in: {user.email}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


    # Note: demo-login removed in production revamp


@router.post("/refresh", response_model=Token)
async def refresh_token(
    *,
    db: AsyncSession = Depends(get_async_session),
    token_data: TokenRefresh,
) -> Any:
    """
    Refresh access token using refresh token.

    Args:
        db: Database session
        token_data: Refresh token data

    Returns:
        Token: New access and refresh tokens

    Raises:
        HTTPException: If refresh token is invalid
    """
    auth_service = AuthService(db)

    try:
        # Verify and decode refresh token
        user_id = await auth_service.verify_refresh_token(token_data.refresh_token)

        # Create new tokens
        access_token = create_access_token(
            subject=user_id,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        refresh_token = create_refresh_token(
            subject=user_id,
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: UserModel = Depends(get_current_user),
) -> Any:
    """
    Get current user information.

    Args:
        current_user: Current authenticated user

    Returns:
        User: Current user object
    """
    # Manually convert SQLAlchemy model to Pydantic schema
    return User(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        company_name=current_user.company_name,
        industry=current_user.industry,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login_at=current_user.last_login_at,
        access_status=current_user.access_status,
        user_kind=current_user.user_kind,
        account_type=current_user.account_type,
        approval_status=current_user.approval_status,
        application_submitted_at=current_user.application_submitted_at,
        approved_at=current_user.approved_at,
        approved_by=current_user.approved_by,
        rejected_at=current_user.rejected_at,
        rejected_by=current_user.rejected_by,
        rejection_reason=current_user.rejection_reason,
        joined_waiting_list_at=current_user.joined_waiting_list_at,
        early_access_granted_at=current_user.early_access_granted_at,
        demo_requested=current_user.demo_requested,
        demo_requested_at=current_user.demo_requested_at,
        demo_scheduled_at=current_user.demo_scheduled_at,
        demo_completed=current_user.demo_completed,
        demo_completed_at=current_user.demo_completed_at,
        company_size=current_user.company_size,
        current_solution=current_user.current_solution,
        demo_prep_notes=current_user.demo_prep_notes,
        follow_up_reminders=current_user.follow_up_reminders,
        user_qualification_notes=current_user.user_qualification_notes,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Logout current user.

    Note: This is mainly for audit logging since JWT tokens
    are stateless. The client should discard the token.

    Args:
        current_user: Current authenticated user
    """
    logger.info(f"User logged out: {current_user.email}")
    # In a production app, you might want to:
    # 1. Add the token to a blacklist in Redis
    # 2. Update last_logout timestamp
    # 3. Clear any server-side session data
    return None


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    *,
    db: AsyncSession = Depends(get_async_session),
    email_in: PasswordResetRequest,
) -> Any:
    """
    Send password reset email.

    Args:
        db: Database session
        email_in: Email to send reset link to

    Returns:
        Message indicating email was sent (always succeeds for security)
    """
    auth_service = AuthService(db)

    # Always return success to prevent email enumeration
    await auth_service.send_password_reset_email(email_in.email)

    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=User)
async def reset_password(
    *,
    db: AsyncSession = Depends(get_async_session),
    reset_data: PasswordReset,
) -> Any:
    """
    Reset password using token from email.

    Args:
        db: Database session
        reset_data: Reset token and new password

    Returns:
        User: Updated user object

    Raises:
        HTTPException: If token is invalid or expired
    """
    logger.info(f"Password reset attempt with token length: {len(reset_data.token)}")
    logger.info(f"Password length: {len(reset_data.new_password)}")
    
    auth_service = AuthService(db)

    try:
        user = await auth_service.reset_password(
            token=reset_data.token,
            new_password=reset_data.new_password,
        )
        logger.info(f"Password reset successful for: {user.email}")
        return user
    except Exception as e:
        logger.error(f"Password reset failed with error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset failed: {str(e)}",
        )


@router.post("/request-demo")
async def request_demo(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    demo_request: DemoRequest,
) -> Any:
    """
    Request a demo call.

    Args:
        db: Database session
        current_user: Current authenticated user
        demo_request: Demo request data

    Returns:
        dict: Success message

    Raises:
        HTTPException: If demo already requested
    """
    if current_user.demo_requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo already requested",
        )
    
    user_service = UserService(db)
    
    # Mark user as having requested demo
    from datetime import datetime
    current_user.demo_requested = True
    current_user.demo_requested_at = datetime.utcnow()
    await db.commit()
    await db.refresh(current_user)
    
    logger.info(f"Demo requested by user: {current_user.email}")
    
    # Here you could also send a notification to your team
    # or integrate with a calendar booking system
    
    return {"message": "Demo request received successfully"}


@router.get("/me/access-status")
async def get_my_access_status(
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get current user's access status.

    Args:
        current_user: Current authenticated user

    Returns:
        dict: User access status info
    """
    return {
        "access_status": current_user.access_status,
        "user_kind": getattr(current_user, "user_kind", None),
        "can_access_dashboard": current_user.can_access_dashboard,
        "joined_waiting_list_at": current_user.joined_waiting_list_at,
        "early_access_granted_at": current_user.early_access_granted_at,
        "demo_requested": current_user.demo_requested,
        "demo_requested_at": current_user.demo_requested_at,
    }
