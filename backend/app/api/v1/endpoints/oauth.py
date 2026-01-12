"""
OAuth authentication endpoints.

Handles OAuth flows for Google and Instagram via Supabase.
"""

import secrets
from datetime import timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.core.security import create_access_token, create_refresh_token
from app.core.supabase import get_supabase_auth
from app.schemas.user import UserCreate
from app.services.user import UserService

router = APIRouter()


@router.get("/google")
async def google_oauth_redirect():
    """
    Initiate Google OAuth flow.
    
    Redirects user to Supabase's Google OAuth authorization page.
    After successful auth, user is redirected to /auth/callback.
    """
    supabase_auth = get_supabase_auth()
    
    # Callback URL where Supabase will redirect after OAuth
    callback_url = f"{settings.FRONTEND_URL}/auth/callback"
    
    oauth_url = supabase_auth.get_oauth_url("google", callback_url)
    
    if not oauth_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth not configured"
        )
    
    logger.info(f"Redirecting to Google OAuth: {oauth_url}")
    return RedirectResponse(url=oauth_url)


@router.get("/instagram")
async def instagram_oauth_redirect():
    """
    Initiate Instagram OAuth flow.
    
    Redirects user to Supabase's Instagram OAuth authorization page.
    After successful auth, user is redirected to /auth/callback.
    
    Note: Instagram OAuth requires additional setup in Supabase dashboard
    and a Facebook Developer account.
    """
    supabase_auth = get_supabase_auth()
    
    # Callback URL where Supabase will redirect after OAuth
    callback_url = f"{settings.FRONTEND_URL}/auth/callback"
    
    # Instagram uses Facebook's OAuth - provider name in Supabase is 'facebook'
    # for Instagram Basic Display API, or 'instagram' if configured separately
    oauth_url = supabase_auth.get_oauth_url("instagram", callback_url)
    
    if not oauth_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Instagram OAuth not configured"
        )
    
    logger.info(f"Redirecting to Instagram OAuth: {oauth_url}")
    return RedirectResponse(url=oauth_url)


@router.post("/callback")
async def oauth_callback(
    *,
    db: AsyncSession = Depends(get_async_session),
    access_token: str,
    refresh_token: Optional[str] = None,
) -> Any:
    """
    Handle OAuth callback from Supabase.
    
    This endpoint is called by the frontend after receiving tokens from Supabase.
    It creates or links the user account in our database.
    
    Args:
        access_token: Supabase access token from OAuth
        refresh_token: Supabase refresh token (optional)
        
    Returns:
        dict: Our app's access and refresh tokens, plus user info
    """
    supabase_auth = get_supabase_auth()
    user_service = UserService(db)
    
    # Get user info from Supabase token
    supabase_user = await supabase_auth.get_user_from_token(access_token)
    
    if not supabase_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OAuth token"
        )
    
    email = supabase_user.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by OAuth provider"
        )
    
    # Check if user exists in our database
    existing_user = await user_service.get_by_email(email=email)
    
    if existing_user:
        # User exists - log them in
        logger.info(f"OAuth login for existing user: {email}")
        user = existing_user
    else:
        # New user - create account
        logger.info(f"Creating new user from OAuth: {email}")
        
        # Extract name from OAuth metadata
        metadata = supabase_user.get("metadata", {})
        full_name = metadata.get("full_name") or metadata.get("name") or email.split("@")[0]
        
        # Create user with a random password (OAuth users authenticate via provider)
        # The password is never used but required by the UserCreate schema
        random_password = secrets.token_urlsafe(32)
        user = await user_service.create(
            user_create=UserCreate(
                email=email,
                password=random_password,
                full_name=full_name,
            )
        )
        
        # Set up for approval workflow (same as regular signup)
        user.access_status = "pending"
        user.user_kind = "content"
        user.has_account = True
        user.approval_status = "pending"
        user.account_type = None  # Will be set during onboarding
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"New OAuth user created (pending approval): {email}")
    
    # Create our app's tokens
    app_access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    app_refresh_token = create_refresh_token(
        subject=str(user.id),
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    
    return {
        "access_token": app_access_token,
        "refresh_token": app_refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "account_type": user.account_type,
            "approval_status": user.approval_status,
            "is_new_user": existing_user is None,
        }
    }


@router.get("/providers")
async def get_available_providers():
    """
    Get list of available OAuth providers.
    
    Returns:
        dict: Available OAuth providers and their status
    """
    # Check which providers are configured
    # This is based on Supabase configuration
    return {
        "providers": [
            {
                "id": "google",
                "name": "Google",
                "enabled": True,  # Google is typically always available in Supabase
            },
            {
                "id": "instagram", 
                "name": "Instagram",
                "enabled": True,  # Requires additional Supabase setup
            },
        ]
    }
