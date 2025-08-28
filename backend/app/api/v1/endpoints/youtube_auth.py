"""YouTube OAuth flow and connection management endpoints."""
from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.models.youtube import OAuthStateToken
from app.repository.youtube_connection import YouTubeConnectionRepository
from app.services.oauth_service import OAuthService
from app.services.token_manager import TokenManager
from app.services.youtube_api_wrapper import YouTubeAPIWrapper


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
    frontend_base = (settings.FRONTEND_URL or "").rstrip("/") or "https://repruv.co.uk"
    if error:
        # Redirect back to dashboard with error
        return RedirectResponse(url=f"{frontend_base}/dashboard?connected=0&error={error}", status_code=302)
    if not code or not state:
        return RedirectResponse(url=f"{frontend_base}/dashboard?connected=0&error=missing_code_or_state", status_code=302)

    oauth = OAuthService(db)
    valid = await oauth.validate_state_token(state)
    if not valid:
        return RedirectResponse(url=f"{frontend_base}/dashboard?connected=0&error=invalid_or_expired_state", status_code=302)

    # Exchange code for tokens
    try:
        token_payload = await oauth.exchange_code_for_tokens(code=code)
    except Exception as e:
        return RedirectResponse(url=f"{frontend_base}/dashboard?connected=0&error=token_exchange_failed", status_code=302)

    access_token = token_payload.get("access_token")
    refresh_token = token_payload.get("refresh_token")
    expires_in = token_payload.get("expires_in")
    if not access_token or not expires_in:
        return RedirectResponse(url=f"{frontend_base}/dashboard?connected=0&error=invalid_token_response", status_code=302)

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

    # Attempt to fetch and store the authenticated channel's id and name
    try:
        api = YouTubeAPIWrapper(db, conn.id)
        me = await api.get_my_channel()
        if me:
            channel_id = me.get("id")
            channel_name = (me.get("snippet") or {}).get("title")
            if channel_id or channel_name:
                await repo.set_channel_metadata(connection_id=conn.id, channel_id=channel_id, channel_name=channel_name)
    except Exception:
        # Non-fatal: leave channel fields null; sync will guard and can be retried after reconnect
        pass

    # Mark state token as used
    valid.used = True
    await db.commit()
    await db.refresh(conn)

    # Redirect to dashboard with success and connection id
    return RedirectResponse(
        url=f"{frontend_base}/dashboard?connected=1&connection_id={conn.id}",
        status_code=302,
    )


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
