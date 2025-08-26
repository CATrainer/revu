"""Platform API simulator for demo mode.

Provides mock implementations of YouTube, Instagram, and TikTok endpoints
with lightweight rate limiting and periodic comment generation.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Any

from loguru import logger


@dataclass
class RateLimit:
    limit: int
    window_seconds: int


class _RateLimiter:
    def __init__(self):
        self.calls: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, rl: RateLimit) -> bool:
        now = time.time()
        d = self.calls[key]
        # purge old
        while d and now - d[0] > rl.window_seconds:
            d.popleft()
        if len(d) >= rl.limit:
            return False
        d.append(now)
        return True


class PlatformSimulator:
    """Simulates a subset of platform APIs.

    Note: This keeps state in-memory per-process. For multi-worker deployments,
    replace with Redis-backed store if needed.
    """

    def __init__(self):
        self._rl = _RateLimiter()
        self._state: dict[str, list[dict[str, Any]]] = defaultdict(list)  # content_id -> comments

    # ---- YouTube ----
    def youtube_comments_list(self, video_id: str, page_token: str | None = None) -> dict[str, Any]:
        self._enforce("yt:comments", RateLimit(60, 60))
        comments = self._state.get(video_id, [])
        items = [
            {
                "kind": "youtube#commentThread",
                "snippet": {
                    "topLevelComment": {
                        "snippet": {
                            "authorDisplayName": c["author"],
                            "authorProfileImageUrl": c["avatar"],
                            "textDisplay": c["text"],
                            "likeCount": c.get("likes", 0),
                            "publishedAt": c.get("published_at"),
                        }
                    }
                },
            }
            for c in comments
        ]
        return {"kind": "youtube#commentThreadListResponse", "items": items, "nextPageToken": None}

    def youtube_channels_list(self, channel_id: str) -> dict[str, Any]:
        self._enforce("yt:channels", RateLimit(30, 60))
        return {
            "kind": "youtube#channelListResponse",
            "items": [
                {
                    "id": channel_id,
                    "statistics": {
                        "viewCount": "12345678",
                        "subscriberCount": "892000",
                        "hiddenSubscriberCount": False,
                        "videoCount": "540",
                    },
                }
            ],
        }

    def youtube_videos_list(self, video_id: str) -> dict[str, Any]:
        self._enforce("yt:videos", RateLimit(60, 60))
        return {
            "kind": "youtube#videoListResponse",
            "items": [
                {
                    "id": video_id,
                    "statistics": {
                        "viewCount": "350000",
                        "likeCount": "12000",
                        "commentCount": str(len(self._state.get(video_id, []))),
                    },
                }
            ],
        }

    # ---- Instagram Graph (simplified) ----
    def instagram_media_comments(self, media_id: str) -> dict[str, Any]:
        self._enforce("ig:comments", RateLimit(100, 60))
        comments = self._state.get(media_id, [])
        data = [
            {"id": f"c_{i}", "text": c["text"], "username": c["author"], "like_count": c.get("likes", 0)}
            for i, c in enumerate(comments)
        ]
        return {"data": data}

    def instagram_user_insights(self, user_id: str) -> dict[str, Any]:
        self._enforce("ig:insights", RateLimit(30, 60))
        return {"data": [{"name": "followers_count", "period": "lifetime", "values": [{"value": 487000}]}]}

    def instagram_account_metrics(self, user_id: str) -> dict[str, Any]:
        self._enforce("ig:metrics", RateLimit(30, 60))
        return {"followers_count": 487000, "media_count": 1324}

    # ---- TikTok (simplified) ----
    def tiktok_video_comments(self, video_id: str) -> dict[str, Any]:
        self._enforce("tt:comments", RateLimit(80, 60))
        comments = self._state.get(video_id, [])
        return {
            "cursor": 0,
            "has_more": False,
            "comments": [
                {"cid": f"c_{i}", "text": c["text"], "digg_count": c.get("likes", 0), "user": {"nickname": c["author"]}}
                for i, c in enumerate(comments)
            ],
        }

    def tiktok_creator_metrics(self, user_id: str) -> dict[str, Any]:
        self._enforce("tt:metrics", RateLimit(30, 60))
        return {"follower_count": 620000, "avg_views": 410000}

    # ---- Helpers ----
    def _enforce(self, key: str, rl: RateLimit) -> None:
        if not self._rl.check(key, rl):
            logger.debug(f"Rate limit hit for {key}")
            raise RuntimeError("Rate limit exceeded (simulated)")

    def seed_comments(self, content_id: str, comments: list[dict[str, Any]]) -> None:
        self._state[content_id].extend(comments)

    def set_comments(self, content_id: str, comments: list[dict[str, Any]]) -> None:
        self._state[content_id] = list(comments)

    def get_comment_count(self, content_id: str) -> int:
        return len(self._state.get(content_id, []))
