"""YouTube Data API v3 client wrapper using googleapiclient."""
from __future__ import annotations

import json
from typing import Any, Dict, Iterable, List, Optional

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials

from app.core.config import settings
from app.utils.errors import InvalidTokenError, QuotaExceededError


GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"


class YouTubeAPIClient:
    """Thin wrapper over googleapiclient for common YouTube operations."""

    def __init__(
        self,
        *,
        access_token: str,
        refresh_token: Optional[str] = None,
        scopes: Optional[List[str]] = None,
    ) -> None:
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValueError("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in settings")

        self.creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri=GOOGLE_OAUTH_TOKEN_URL,
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=scopes or ["https://www.googleapis.com/auth/youtube.readonly"],
        )
        # cache_discovery False avoids writing to file system in serverless envs
        self.service = build("youtube", "v3", credentials=self.creds, cache_discovery=False)
        from app.utils.logging import get_logger
        from app.monitoring.metrics import record_youtube_api_call
        self.log = get_logger("youtube.client")
        self._record_youtube_api_call = record_youtube_api_call

    # ---- Channels ----
    def get_channel_info(self, channel_id: str) -> Dict[str, Any]:
        """Return channel info for a given channel ID (snippet, statistics, contentDetails)."""
        request = self.service.channels().list(
            part="snippet,statistics,contentDetails",
            id=channel_id,
            maxResults=1,
        )
        return self._execute(request)

    def get_channel_uploads_playlist_id(self, channel_id: str) -> Optional[str]:
        """Return the uploads playlist ID for the given channel, or None if not found."""
        request = self.service.channels().list(part="contentDetails", id=channel_id, maxResults=1)
        data = self._execute(request)
        items = data.get("items", [])
        if not items:
            return None
        return items[0].get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")

    # ---- Playlists ----
    def list_playlist_videos(
        self,
        *,
        playlist_id: str,
        page_token: Optional[str] = None,
        max_results: int = 50,
    ) -> Dict[str, Any]:
        """List videos in a playlist (returns the raw API response with nextPageToken)."""
        max_results = max(1, min(50, max_results))
        request = self.service.playlistItems().list(
            part="snippet,contentDetails",
            playlistId=playlist_id,
            pageToken=page_token,
            maxResults=max_results,
        )
        return self._execute(request)

    # ---- Videos ----
    def get_video_details(
        self,
        video_ids: Iterable[str],
        *,
        part: str = "snippet,contentDetails,statistics",
        chunk_size: int = 50,
    ) -> List[Dict[str, Any]]:
        """Batch fetch details for multiple video IDs (chunked by 50). Returns aggregated items list."""
        ids = [vid for vid in video_ids if vid]
        if not ids:
            return []
        items: List[Dict[str, Any]] = []
        for i in range(0, len(ids), chunk_size):
            batch = ids[i : i + chunk_size]
            request = self.service.videos().list(part=part, id=",".join(batch), maxResults=len(batch))
            resp = self._execute(request)
            items.extend(resp.get("items", []))
        return items

    # ---- Comments ----
    def list_video_comments(
        self,
        *,
        video_id: str,
        page_token: Optional[str] = None,
        max_results: int = 100,
        order: str = "time",
        fetch_replies: bool = False,
    ) -> Dict[str, Any]:
        """List top-level comment threads on a video.

        Returns raw API response including nextPageToken. Set fetch_replies=True to include first-page replies inline.
        """
        max_results = max(1, min(100, max_results))
        part = "snippet,replies" if fetch_replies else "snippet"
        request = self.service.commentThreads().list(
            part=part,
            videoId=video_id,
            pageToken=page_token,
            maxResults=max_results,
            textFormat="plainText",
            order=order,
        )
        return self._execute(request)

    def list_comment_replies(
        self,
        *,
        parent_comment_id: str,
        page_token: Optional[str] = None,
        max_results: int = 100,
    ) -> Dict[str, Any]:
        """List replies for a given parent (top-level) comment ID."""
        max_results = max(1, min(100, max_results))
        request = self.service.comments().list(
            part="snippet",
            parentId=parent_comment_id,
            pageToken=page_token,
            maxResults=max_results,
            textFormat="plainText",
        )
        return self._execute(request)

    def post_comment_reply(self, *, parent_comment_id: str, text: str) -> Dict[str, Any]:
        """Post a reply to a top-level comment. Returns the created comment resource."""
        body = {
            "snippet": {
                "parentId": parent_comment_id,
                "textOriginal": text,
            }
        }
        request = self.service.comments().insert(part="snippet", body=body)
        return self._execute(request)

    # ---- Internal helpers ----
    def _execute(self, request):
        """Execute a googleapiclient request and map well-known errors to our exceptions."""
        op = getattr(request, "methodId", None) or "unknown"
        import time
        t0 = time.perf_counter()
        try:
            resp = request.execute()
            dt = time.perf_counter() - t0
            self.log.info("YouTube API call ok", extra={"operation": op, "duration_s": dt})
            self._record_youtube_api_call(op, "ok", dt)
            return resp
        except HttpError as e:
            dt = time.perf_counter() - t0
            self.log.error("YouTube API HttpError", extra={"operation": op, "duration_s": dt, "status": getattr(e, 'status_code', None) or getattr(getattr(e, 'resp', None), 'status', None)})
            self._record_youtube_api_call(op, "HttpError", dt)
            self._handle_http_error(e)

    def _handle_http_error(self, e: HttpError) -> None:
        status = getattr(e, "status_code", None)
        # Fall back to older attribute path if needed
        if status is None and hasattr(e, "resp") and hasattr(e.resp, "status"):
            status = e.resp.status  # type: ignore[attr-defined]

        reasons: List[str] = []
        try:
            # e.content may be bytes; parse reasons if present
            content = getattr(e, "content", None)
            if content and isinstance(content, (bytes, bytearray)):
                payload = json.loads(content.decode("utf-8", errors="ignore"))
            elif isinstance(content, str):
                payload = json.loads(content)
            else:
                payload = {}

            if isinstance(payload, dict):
                err = payload.get("error") or {}
                errs = err.get("errors") or []
                for item in errs:
                    reason = item.get("reason")
                    if reason:
                        reasons.append(reason)
        except Exception:
            # Best-effort parse; ignore failures
            pass

        reason_set = set(r.lower() for r in reasons)
        if status in (401, 403) and (
            "invalidcredentials" in reason_set
            or "autherror" in reason_set
            or "insufficientpermissions" in reason_set
        ):
            raise InvalidTokenError("Invalid or expired YouTube OAuth credentials.")

        if status == 403 and (
            "quotaexceeded" in reason_set
            or "dailylimitexceeded" in reason_set
            or "ratelimitedexceeded" in reason_set
            or "userratelimitedexceeded" in reason_set
        ):
            raise QuotaExceededError("YouTube Data API quota exceeded.")

        # If not mapped, re-raise the original error for upstream handling
        raise e
