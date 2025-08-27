"""Repository for YouTubeConnection entities (async SQLAlchemy)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube import YouTubeConnection


class YouTubeConnectionRepository:
    """Data access methods for YouTubeConnection."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_connection(
        self,
        *,
        user_id: UUID,
        channel_id: Optional[str] = None,
        channel_name: Optional[str] = None,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        token_expires_at: Optional[datetime] = None,
        connection_status: str = "active",
    ) -> YouTubeConnection:
        """Create and persist a new YouTubeConnection."""
        conn = YouTubeConnection(
            user_id=user_id,
            channel_id=channel_id,
            channel_name=channel_name,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
            connection_status=connection_status,
        )
        self.session.add(conn)
        await self.session.flush()  # ensure ID is generated
        await self.session.refresh(conn)
        return conn

    async def get_user_connections(self, user_id: UUID) -> Sequence[YouTubeConnection]:
        """Return all connections for a user (most recent first)."""
        stmt = (
            select(YouTubeConnection)
            .where(YouTubeConnection.user_id == user_id)
            .order_by(YouTubeConnection.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_connection_by_channel_id(self, channel_id: str) -> Optional[YouTubeConnection]:
        """Return a connection by external YouTube channel_id."""
        stmt = select(YouTubeConnection).where(YouTubeConnection.channel_id == channel_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def update_tokens(
        self,
        *,
        connection_id: UUID,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        token_expires_at: Optional[datetime] = None,
    ) -> Optional[YouTubeConnection]:
        """Update tokens and expiry for a connection and return the updated row."""
        values: dict = {"updated_at": datetime.utcnow()}
        if access_token is not None:
            values["access_token"] = access_token
        if refresh_token is not None:
            values["refresh_token"] = refresh_token
        if token_expires_at is not None:
            values["token_expires_at"] = token_expires_at

        stmt = (
            update(YouTubeConnection)
            .where(YouTubeConnection.id == connection_id)
            .values(**values)
            .returning(YouTubeConnection)
        )
        result = await self.session.execute(stmt)
        updated = result.scalars().first()
        return updated

    async def update_connection_status(
        self,
        *,
        connection_id: UUID,
        status: str,
        last_synced_at: Optional[datetime] = None,
    ) -> Optional[YouTubeConnection]:
        """Update connection_status (and optionally last_synced_at)."""
        values: dict = {"connection_status": status, "updated_at": datetime.utcnow()}
        if last_synced_at is not None:
            values["last_synced_at"] = last_synced_at

        stmt = (
            update(YouTubeConnection)
            .where(YouTubeConnection.id == connection_id)
            .values(**values)
            .returning(YouTubeConnection)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def delete_connection(self, connection_id: UUID) -> bool:
        """Delete a connection by ID. Returns True if a row was deleted."""
        stmt = delete(YouTubeConnection).where(YouTubeConnection.id == connection_id)
        result = await self.session.execute(stmt)
        # result.rowcount is not reliable in all dialects; fetch affected via returning could be used
        return bool(result.rowcount and result.rowcount > 0)
