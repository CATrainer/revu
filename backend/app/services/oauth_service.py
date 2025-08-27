"""OAuth service for Google (YouTube) authorization flows."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import UUID

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.youtube import OAuthStateToken
from app.utils.youtube_utils import generate_oauth_state_token


GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"


class OAuthService:
    """Handles OAuth state and token exchange for Google APIs."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def generate_authorization_url(
        self,
        *,
        user_id: UUID,
        scopes: list[str],
        redirect_uri: Optional[str] = None,
        state_ttl_minutes: int = 10,
        access_type: str = "offline",
        include_granted_scopes: bool = True,
        prompt: str = "consent",
    ) -> tuple[str, str]:
        """Create an OAuth state token, persist it, and return the authorization URL and state.

        Returns (url, state)
        """
        state = generate_oauth_state_token()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=state_ttl_minutes)

        # Store state token
        token = OAuthStateToken(
            token=state,
            user_id=user_id,
            expires_at=expires_at,
            used=False,
        )
        self.session.add(token)
        await self.session.flush()

        client_id = settings.GOOGLE_CLIENT_ID
        redirect = redirect_uri or settings.GOOGLE_REDIRECT_URI or settings.OAUTH_REDIRECT_URI
        if not client_id or not redirect:
            raise ValueError("Google OAuth not configured: missing CLIENT_ID or REDIRECT_URI")

        from urllib.parse import urlencode

        params = {
            "client_id": client_id,
            "redirect_uri": redirect,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "access_type": access_type,
            "include_granted_scopes": str(include_granted_scopes).lower(),
            "prompt": prompt,
        }
        url = GOOGLE_OAUTH_AUTH_URL + "?" + urlencode(params)
        return url, state

    async def validate_state_token(self, state: str) -> Optional[OAuthStateToken]:
        """Check that the state token exists, is unexpired and unused."""
        q = select(OAuthStateToken).where(OAuthStateToken.token == state)
        result = await self.session.execute(q)
        row = result.scalars().first()
        if not row:
            return None
        now = datetime.now(timezone.utc)
        if row.used:
            return None
        if row.expires_at and row.expires_at < now:
            return None
        return row

    async def exchange_code_for_tokens(
        self,
        *,
        code: str,
        redirect_uri: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens."""
        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
        redirect = redirect_uri or settings.GOOGLE_REDIRECT_URI or settings.OAUTH_REDIRECT_URI
        if not all([client_id, client_secret, redirect]):
            raise ValueError("Google OAuth not configured: missing CLIENT_ID/SECRET or REDIRECT_URI")

        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(GOOGLE_OAUTH_TOKEN_URL, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
            resp.raise_for_status()
            payload = resp.json()
            return payload
