"""High-level YouTube API wrapper with retries, quota tracking, and auto token refresh.

This wrapper coordinates TokenManager (async) with the synchronous YouTubeAPIClient.
It ensures a valid access token before each call, retries on transient errors with
exponential backoff, and tracks estimated quota usage per operation.
"""
from __future__ import annotations

import asyncio
import random
from typing import Any, Dict, List, Optional
from uuid import UUID

from googleapiclient.errors import HttpError
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.token_manager import TokenManager
from app.services.youtube_client import YouTubeAPIClient
from app.utils.errors import InvalidTokenError, QuotaExceededError
from app.utils.youtube_utils import calculate_api_quota_cost


# Scopes
READONLY_SCOPES: List[str] = ["https://www.googleapis.com/auth/youtube.readonly"]
WRITE_SCOPES: List[str] = ["https://www.googleapis.com/auth/youtube.force-ssl"]


class YouTubeAPIWrapper:
    """A resilient, quota-aware wrapper around YouTubeAPIClient.

    Usage: instantiate per YouTube connection and call the high-level methods below.
    """

    def __init__(
        self,
        session: AsyncSession,
        connection_id: UUID,
        *,
        max_retries: int = 3,
        base_delay: float = 0.5,
        max_delay: float = 8.0,
    ) -> None:
        self.session = session
        self.connection_id = connection_id
        self.token_manager = TokenManager(session)
        self.max_retries = max(0, int(max_retries))
        self.base_delay = max(0.0, float(base_delay))
        self.max_delay = max(self.base_delay, float(max_delay))
        self._quota_by_op: Dict[str, int] = {}
        self._quota_total = 0

    # ---- Quota tracking ----
    def quota_snapshot(self) -> Dict[str, Any]:
        return {
            "total": self._quota_total,
            "by_operation": dict(self._quota_by_op),
        }

    def reset_quota(self) -> None:
        self._quota_by_op.clear()
        self._quota_total = 0

    def _track_quota(self, operation: str) -> None:
        cost = int(calculate_api_quota_cost(operation))
        self._quota_total += cost
        self._quota_by_op[operation] = self._quota_by_op.get(operation, 0) + cost

    # ---- Internal runner with retries/backoff/token refresh ----
    async def _run(self, operation: str, scopes: List[str], call_fn) -> Any:
        attempts = 0
        delay = self.base_delay

        while True:
            # Ensure we have a valid token before each attempt
            access_token = await self.token_manager.get_valid_token(self.connection_id)
            client = YouTubeAPIClient(access_token=access_token, scopes=scopes)

            try:
                # Execute the blocking API call in a worker thread to avoid blocking the event loop
                result = await asyncio.to_thread(call_fn, client)
                self._track_quota(operation)
                return result

            except InvalidTokenError:
                # Attempt a forced refresh once per loop iteration
                if attempts >= self.max_retries:
                    raise
                await self.token_manager.refresh_access_token(self.connection_id)
                attempts += 1
                continue

            except QuotaExceededError:
                # Do not retry on quota exceeded
                raise

            except HttpError as e:
                status = getattr(e, "status_code", None)
                if status is None and hasattr(e, "resp") and hasattr(e.resp, "status"):
                    status = e.resp.status  # type: ignore[attr-defined]

                if status in (429, 500, 503) and attempts < self.max_retries:
                    await asyncio.sleep(delay + random.uniform(0, max(0.0, delay / 2)))
                    delay = min(delay * 2.0, self.max_delay)
                    attempts += 1
                    continue
                raise

            except Exception:
                # Retry generic transient failures a few times
                if attempts < self.max_retries:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2.0, self.max_delay)
                    attempts += 1
                    continue
                raise

    # ---- High-level methods (mirror YouTubeAPIClient) ----
    async def get_channel_info(self, channel_id: str) -> Dict[str, Any]:
        return await self._run(
            operation="channels.list",
            scopes=READONLY_SCOPES,
            call_fn=lambda c: c.get_channel_info(channel_id),
        )

    async def get_channel_uploads_playlist_id(self, channel_id: str) -> Optional[str]:
        return await self._run(
            operation="channels.list",
            scopes=READONLY_SCOPES,
            call_fn=lambda c: c.get_channel_uploads_playlist_id(channel_id),
        )

    async def get_my_channel(self) -> Optional[Dict[str, Any]]:
        return await self._run(
            operation="channels.list",
            scopes=READONLY_SCOPES,
            call_fn=lambda c: c.get_my_channel(),
        )

    async def list_playlist_videos(
        self,
        *,
        playlist_id: str,
        page_token: Optional[str] = None,
        max_results: int = 50,
    ) -> Dict[str, Any]:
        return await self._run(
            operation="playlistItems.list",
            scopes=READONLY_SCOPES,
            call_fn=lambda c: c.list_playlist_videos(
                playlist_id=playlist_id,
                page_token=page_token,
                max_results=max_results,
            ),
        )

    async def get_video_details(
        self,
        video_ids: List[str],
        *,
        part: str = "snippet,contentDetails,statistics",
        chunk_size: int = 50,
    ) -> List[Dict[str, Any]]:
        return await self._run(
            operation="videos.list",
            scopes=READONLY_SCOPES,
            call_fn=lambda c: c.get_video_details(
                video_ids, part=part, chunk_size=chunk_size
            ),
        )

    async def list_video_comments(
        self,
        *,
        video_id: str,
        page_token: Optional[str] = None,
        max_results: int = 100,
        order: str = "time",
        fetch_replies: bool = False,
    ) -> Dict[str, Any]:
        return await self._run(
            operation="commentThreads.list",
            scopes=WRITE_SCOPES,
            call_fn=lambda c: c.list_video_comments(
                video_id=video_id,
                page_token=page_token,
                max_results=max_results,
                order=order,
                fetch_replies=fetch_replies,
            ),
        )

    async def list_comment_replies(
        self,
        *,
        parent_comment_id: str,
        page_token: Optional[str] = None,
        max_results: int = 100,
    ) -> Dict[str, Any]:
        return await self._run(
            operation="comments.list",
            scopes=WRITE_SCOPES,
            call_fn=lambda c: c.list_comment_replies(
                parent_comment_id=parent_comment_id,
                page_token=page_token,
                max_results=max_results,
            ),
        )

    async def post_comment_reply(self, *, parent_comment_id: str, text: str) -> Dict[str, Any]:
        return await self._run(
            operation="comments.insert",
            scopes=WRITE_SCOPES,
            call_fn=lambda c: c.post_comment_reply(parent_comment_id=parent_comment_id, text=text),
        )
