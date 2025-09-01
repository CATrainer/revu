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
from loguru import logger


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

    async def poll_channel_comments(self, *, channel_id: UUID) -> int:
        """Poll recent videos for new comments and enqueue them for AI processing.

        Steps:
        1) Determine last_polled_at from polling_config.
        2) Get the channel's recent videos.
        3) For each video, sync comments from YouTube and then insert unseen comments into comments_queue with status='pending'.
        4) Update last_polled_at.
        5) Return the number of new comments enqueued.

        Note: Caller is responsible for committing the transaction.
        """
        total_enqueued = 0
        try:
            # 1) Load last_polled_at for channel
            res = await self.session.execute(
                text(
                    """
                    SELECT last_polled_at
                    FROM polling_config
                    WHERE channel_id = :cid AND polling_enabled = true
                    """
                ),
                {"cid": str(channel_id)},
            )
            row = res.first()
            last_checked: Optional[datetime] = row[0] if row else None
            logger.info("Polling comments for channel {cid}; last_checked={ts}", cid=str(channel_id), ts=str(last_checked))

            # 2) Ensure recent videos are present via YouTube integration, then get recent videos
            try:
                sync = SyncService(self.session, channel_id)
                synced_videos = await sync.sync_new_videos(last_checked)
                logger.debug(
                    "Synced {n} new videos for channel {cid} before polling comments",
                    n=int(synced_videos or 0),
                    cid=str(channel_id),
                )
            except Exception:
                logger.exception("Failed syncing recent videos for channel {cid}", cid=str(channel_id))

            # Now read from DB (limit to latest 50 by published date)
            vids_res = await self.session.execute(
                text(
                    """
                    SELECT id, video_id, published_at
                    FROM youtube_videos
                    WHERE channel_id = :cid
                    ORDER BY COALESCE(published_at, now()) DESC
                    LIMIT 50
                    """
                ),
                {"cid": str(channel_id)},
            )
            videos = vids_res.fetchall()

            # 3) For each video: sync and enqueue new comments
            for v in videos:
                try:
                    video_uuid = v[0]  # internal UUID
                    youtube_video_id = v[1]  # external string id

                    # Ensure we have latest comments for this video
                    await self.fetch_new_comments(channel_id=channel_id, video_id=youtube_video_id, last_checked=last_checked)

                    # Insert unseen comments into comments_queue
                    # Criteria: comments for this video with published_at >= last_checked (if provided)
                    insert_sql = text(
                        """
                        WITH new_comments AS (
                            SELECT yc.comment_id, yc.author_name, yc.author_channel_id, yc.content
                            FROM youtube_comments yc
                            WHERE yc.video_id = :vid
                              AND (:last_checked IS NULL OR yc.published_at IS NULL OR yc.published_at >= :last_checked)
                              AND NOT EXISTS (
                                  SELECT 1 FROM comments_queue cq WHERE cq.comment_id = yc.comment_id
                              )
                        )
                        INSERT INTO comments_queue (
                            channel_id, video_id, comment_id, author_name, author_channel_id, content, status, priority, created_at
                        )
                        SELECT :cid, :vid, nc.comment_id, nc.author_name, nc.author_channel_id, nc.content, 'pending', 0, now()
                        FROM new_comments nc
                        RETURNING id
                        """
                    )
                    insert_res = await self.session.execute(
                        insert_sql,
                        {"cid": str(channel_id), "vid": str(video_uuid), "last_checked": last_checked},
                    )
                    inserted_rows = insert_res.fetchall()
                    added = len(inserted_rows)
                    total_enqueued += added
                    if added:
                        logger.debug("Enqueued {n} new comments for video {vid}", n=added, vid=youtube_video_id)
                except Exception:
                    logger.exception("Failed polling/enqueue for video {vid} (channel {cid})", vid=v[1], cid=str(channel_id))
                    # continue with next video

            # 4) Update last_polled_at
            await self.update_last_polled(channel_id=channel_id)

            logger.info("Polling complete for channel {cid}; enqueued={n}", cid=str(channel_id), n=total_enqueued)
            return total_enqueued
        except Exception:
            logger.exception("Polling failed for channel {cid}", cid=str(channel_id))
            return total_enqueued
