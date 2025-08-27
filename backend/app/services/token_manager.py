"""Token management service for YouTube OAuth tokens.

Responsibilities:
- Determine expiration
- Refresh access tokens via Google OAuth token endpoint
- Get valid (refresh if needed) access token
- Store tokens encrypted in the database
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID

import httpx
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.youtube import YouTubeConnection
from app.repository.youtube_connection import YouTubeConnectionRepository
from app.utils.crypto_utils import encrypt_token, decrypt_token
from app.utils.errors import TokenRefreshError, InvalidTokenError


GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"


class TokenManager:
    """Manage encrypted storage and refreshing of OAuth tokens."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = YouTubeConnectionRepository(session)

    @staticmethod
    def is_token_expired(expires_at: Optional[datetime], skew_seconds: int = 60) -> bool:
        """Return True if token is expired or about to expire within skew.

        If expires_at is None, treat as expired.
        """
        if not expires_at:
            return True
        now = datetime.now(timezone.utc)
        # Ensure expires_at is aware
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return now >= (expires_at - timedelta(seconds=skew_seconds))

    async def _load_connection(self, connection_id: UUID) -> Optional[YouTubeConnection]:
        result = await self.session.execute(
            select(YouTubeConnection).where(YouTubeConnection.id == connection_id)
        )
        return result.scalars().first()

    def _maybe_decrypt(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return value
        try:
            return decrypt_token(value)
        except Exception:
            # Might be stored in plaintext (legacy). Use as-is.
            return value

    async def refresh_access_token(self, connection_id: UUID) -> Tuple[str, datetime]:
        """Use refresh_token to obtain a new access_token and persist it (encrypted).

        Returns (access_token, expires_at)
        """
        conn = await self._load_connection(connection_id)
        if not conn:
            raise TokenRefreshError("Connection not found")

        if not conn.refresh_token:
            raise TokenRefreshError("No refresh token available")

        refresh_token_plain = self._maybe_decrypt(conn.refresh_token)
        if not refresh_token_plain:
            raise TokenRefreshError("Invalid refresh token")

        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
        if not client_id or not client_secret:
            raise TokenRefreshError("Google OAuth not configured: missing CLIENT_ID/SECRET")

        data = {
            "grant_type": "refresh_token",
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token_plain,
        }

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                GOOGLE_OAUTH_TOKEN_URL,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if resp.status_code != 200:
                logger.error(f"Token refresh failed: {resp.status_code} {resp.text}")
                raise TokenRefreshError("Failed to refresh access token")
            payload = resp.json()

        access_token = payload.get("access_token")
        expires_in = payload.get("expires_in")
        new_refresh_token = payload.get("refresh_token")  # sometimes present

        if not access_token or not expires_in:
            raise TokenRefreshError("Invalid refresh response from Google")

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

        # Encrypt and store
        enc_access = encrypt_token(access_token)
        enc_refresh = encrypt_token(new_refresh_token) if new_refresh_token else None

        await self.repo.update_tokens(
            connection_id=connection_id,
            access_token=enc_access,
            refresh_token=enc_refresh,
            token_expires_at=expires_at,
        )

        return access_token, expires_at

    async def get_valid_token(self, connection_id: UUID) -> str:
        """Return a non-expired access token; refresh if necessary.

        Will decrypt stored tokens transparently.
        """
        conn = await self._load_connection(connection_id)
        if not conn:
            raise InvalidTokenError("Connection not found")

        if self.is_token_expired(conn.token_expires_at):
            access_token, _ = await self.refresh_access_token(connection_id)
            return access_token

        if not conn.access_token:
            # If no access token but not expired date (unlikely), try refresh
            access_token, _ = await self.refresh_access_token(connection_id)
            return access_token

        access_token_plain = self._maybe_decrypt(conn.access_token)
        if not access_token_plain:
            # Try to refresh if decryption fails
            access_token, _ = await self.refresh_access_token(connection_id)
            return access_token

        return access_token_plain

    async def store_tokens(
        self,
        *,
        connection_id: UUID,
        access_token: str,
        refresh_token: Optional[str],
        expires_in: int,
    ) -> None:
        """Encrypt and persist tokens and expiration on the connection."""
        if not access_token:
            raise InvalidTokenError("access_token is required")
        if expires_in is None:
            raise InvalidTokenError("expires_in is required")

        enc_access = encrypt_token(access_token)
        enc_refresh = encrypt_token(refresh_token) if refresh_token else None
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

        await self.repo.update_tokens(
            connection_id=connection_id,
            access_token=enc_access,
            refresh_token=enc_refresh,
            token_expires_at=expires_at,
        )
