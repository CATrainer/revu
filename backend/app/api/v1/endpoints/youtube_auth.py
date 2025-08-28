"""YouTube OAuth flow and connection management endpoints."""
from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.youtube import OAuthStateToken
from app.repository.youtube_connection import YouTubeConnectionRepository
from app.services.oauth_service import OAuthService
from app.services.token_manager import TokenManager


router = APIRouter()


@router.get("/connect/initiate")
async def initiate_oauth(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    scopes: Optional[str] = Query(
        default="https://www.googleapis.com/auth/youtube.readonly",
        description="Space-separated list of Google OAuth scopes",
    ),
) -> dict[str, Any]:
    """Start OAuth flow; returns a redirect URL and state token."""
    oauth = OAuthService(db)
    scope_list = [s for s in (scopes or "").split(" ") if s]
    url, state = await oauth.generate_authorization_url(
        user_id=current_user.id,
        scopes=scope_list,
    )
    return {"redirect_url": url, "state": state}


@router.get("/connect/callback")
async def oauth_callback(
    *,
    db: AsyncSession = Depends(get_async_session),
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
) -> dict[str, Any]:
    """Handle OAuth callback unauthenticated using the state->user mapping.

    This endpoint intentionally does not require an authenticated user because Google redirects
    the browser directly here without the client's Authorization header. We tie the callback to
    the initiating user using the stored state token.
    """
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code or state")

    oauth = OAuthService(db)
    valid = await oauth.validate_state_token(state)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired state token")

    # Exchange code for tokens
    try:
        token_payload = await oauth.exchange_code_for_tokens(code=code)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Token exchange failed: {e}")

    access_token = token_payload.get("access_token")
    refresh_token = token_payload.get("refresh_token")
    expires_in = token_payload.get("expires_in")
    if not access_token or not expires_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token response from Google")

    # Create connection row for the user associated to the state token and store tokens (encrypted)
    repo = YouTubeConnectionRepository(db)
    conn = await repo.create_connection(user_id=valid.user_id)

    manager = TokenManager(db)
    await manager.store_tokens(
        connection_id=conn.id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(expires_in),
    )

    # Mark state token as used
    valid.used = True
    await db.commit()
    await db.refresh(conn)

    return {"connection_id": str(conn.id), "status": "connected"}


@router.delete("/connections/{connection_id}")
async def delete_connection(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID,
) -> dict[str, Any]:
    """Delete a YouTube connection for the current user."""
    repo = YouTubeConnectionRepository(db)
    # Ensure connection belongs to the user
    conns = await repo.get_user_connections(current_user.id)
    if not any(c.id == connection_id for c in conns):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    deleted = await repo.delete_connection(connection_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found or already deleted")
    await db.commit()
    return {"deleted": True}


@router.get("/connections")
async def list_connections(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """List the current user's YouTube connections."""
    repo = YouTubeConnectionRepository(db)
    conns = await repo.get_user_connections(current_user.id)
    return [
        {
            "id": str(c.id),
            "channel_id": c.channel_id,
            "channel_name": c.channel_name,
            "status": c.connection_status,
            "last_synced_at": c.last_synced_at,
        }
        for c in conns
    ]
