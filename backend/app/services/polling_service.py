"""Polling service to control automatic comment fetching per channel.

Provides helpers to:
- list active channels from polling_config
- decide if a channel should be polled based on interval/last_polled
- fetch new comments using existing YouTube integration
- update last_polled timestamp
"""
from __future__ import annotations

import asyncio  # required import per spec (useful for future concurrent polling)
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.youtube_service import YouTubeService  # existing high-level service (for future use)
from app.services.sync_service import SyncService  # used to sync comments


class PollingService:
    """Controls channel polling decisions and actions."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_active_channels(self) -> List[Dict[str, Any]]:
        """Return polling-enabled channels with interval and last_polled_at.

        Returns a list of dicts: { channel_id: UUID, polling_interval_minutes: int, last_polled_at: datetime | None }
        """
        result = await self.session.execute(
            text(
                """
                SELECT channel_id, polling_interval_minutes, last_polled_at
                FROM polling_config
                WHERE polling_enabled = true
                """
            )
        )
        rows = result.fetchall()
        items: List[Dict[str, Any]] = []
        for r in rows:
            # r is a Row; access by position or key depending on driver
            channel_id = r[0]
            interval = int(r[1]) if r[1] is not None else 15
            last_polled = r[2]
            items.append(
                {
                    "channel_id": UUID(str(channel_id)),
                    "polling_interval_minutes": interval,
                    "last_polled_at": last_polled,
                }
            )
        return items

    async def fetch_new_comments(
        self,
        *,
        channel_id: UUID,
        video_id: str,
        last_checked: Optional[datetime] = None,
    ) -> int:
        """Use existing YouTube integration to fetch comments for a video.

        Notes:
        - `video_id` is the YouTube video_id (external). SyncService will upsert new comments.
        - `last_checked` is currently advisory; the sync avoids duplicates via ON CONFLICT DO NOTHING.
        Returns number of comments upserted as reported by SyncService.
        """
        service = SyncService(self.session, channel_id)
        # SyncService.sync_video_comments returns count of comments inserted for the given video
        count = await service.sync_video_comments(video_id)
        return int(count or 0)

    async def should_poll(self, *, channel_id: UUID) -> bool:
        """Check if enough time has elapsed since last poll based on interval.

        If last_polled_at is NULL or missing, returns True.
        """
        res = await self.session.execute(
            text(
                """
                SELECT polling_interval_minutes, last_polled_at
                FROM polling_config
                WHERE channel_id = :cid AND polling_enabled = true
                """
            ),
            {"cid": str(channel_id)},
        )
        row = res.first()
        if not row:
            return False
        interval_min = int(row[0]) if row[0] is not None else 15
        last_polled: Optional[datetime] = row[1]
        if last_polled is None:
            return True
        now = datetime.now(timezone.utc)
        due_after = last_polled + timedelta(minutes=interval_min)
        return now >= due_after

    async def update_last_polled(self, *, channel_id: UUID) -> None:
        """Update last_polled_at to now for a channel and touch updated_at."""
        await self.session.execute(
            text(
                """
                UPDATE polling_config
                SET last_polled_at = now(), updated_at = now()
                WHERE channel_id = :cid
                """
            ),
            {"cid": str(channel_id)},
        )
        # caller should commit
