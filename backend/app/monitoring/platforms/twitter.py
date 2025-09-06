"""Twitter scraper implementation using Tweepy (skeleton)."""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

try:  # Tweepy optional; code should degrade gracefully if missing at runtime
    import tweepy  # type: ignore
except Exception:  # noqa: BLE001
    tweepy = None  # type: ignore

from .base import PlatformClientBase, NormalizedMention


class TwitterClient(PlatformClientBase):
    PLATFORM = "twitter"
    DEFAULT_RATE = 300  # generous placeholder

    def __init__(self, session: AsyncSession, *, bearer_token: Optional[str] = None) -> None:
        super().__init__(session)
        self._bearer = bearer_token or os.getenv("TWITTER_BEARER_TOKEN")
        self._client = None
        if tweepy and self._bearer:
            try:
                self._client = tweepy.Client(bearer_token=self._bearer, wait_on_rate_limit=True)
            except Exception:  # noqa: BLE001
                logger.exception("Failed instantiating Tweepy client")

    # ---------------- Core implementations -----------------
    async def _fetch_mentions_core(self, **kwargs) -> List[NormalizedMention]:
        user_id: UUID = kwargs["user_id"]
        if not self._client:
            logger.warning("Tweepy not configured; returning empty mentions")
            return []
        # For a real implementation: map internal user_id -> twitter handle/access tokens.
        # Placeholder: use a test username stored in users table if needed.
        handle = await self._lookup_handle(user_id)
        if not handle:
            return []
        query = f"@{handle} -is:retweet"
        return await self._search(query=query, limit=kwargs.get("limit", 50))

    async def _fetch_profile_metrics_core(self, **kwargs) -> Dict[str, Any]:
        if not self._client:
            return {}
        # Placeholder: would call get_user with expansions for public_metrics
        try:
            # user = self._client.get_user(username="example", user_fields=["public_metrics"])
            # metrics = user.data.public_metrics
            metrics = {"followers": 0, "following": 0, "tweet_count": 0, "listed_count": 0}
            return metrics
        except Exception as e:  # noqa: BLE001
            logger.warning("profile metrics fetch failed: {e}", e=str(e))
            return {}

    async def _search_content_core(self, **kwargs) -> List[NormalizedMention]:
        query: str = kwargs["query"]
        limit: int = kwargs.get("limit", 50)
        return await self._search(query=query, limit=limit)

    # ---------------- Internal helpers -----------------
    async def _search(self, *, query: str, limit: int) -> List[NormalizedMention]:
        if not self._client:
            return []
        collected: List[NormalizedMention] = []
        next_token = None
        page_size = min(100, max(10, limit))
        while len(collected) < limit:
            try:
                resp = self._client.search_recent_tweets(
                    query=query,
                    max_results=min(100, page_size),
                    tweet_fields=["public_metrics", "created_at", "entities", "author_id"],
                    expansions=["author_id"],
                    next_token=next_token,
                )
            except Exception as e:  # noqa: BLE001
                if "rate limit" in str(e).lower():
                    raise
                logger.warning("Twitter search error: {e}", e=str(e))
                break
            if not resp or not resp.data:
                break
            users_index: Dict[str, Any] = {}
            try:
                if resp.includes and "users" in resp.includes:
                    users_index = {u.id: u for u in resp.includes["users"]}
            except Exception:  # noqa: BLE001
                users_index = {}
            for t in resp.data:
                if len(collected) >= limit:
                    break
                metrics = getattr(t, "public_metrics", {}) or {}
                author_obj = users_index.get(getattr(t, "author_id", ""))
                username = getattr(author_obj, "username", None) if author_obj else None
                nm = self.normalize(
                    platform=self.PLATFORM,
                    content_id=str(t.id),
                    author_username=username,
                    content=getattr(t, "text", ""),
                    url=f"https://twitter.com/{username}/status/{t.id}" if username else None,
                    published_at=str(getattr(t, "created_at", "")),
                    engagement_metrics={
                        "retweets": metrics.get("retweet_count"),
                        "replies": metrics.get("reply_count"),
                        "likes": metrics.get("like_count"),
                        "quotes": metrics.get("quote_count"),
                    },
                    raw={"entities": getattr(t, "entities", {})},
                )
                collected.append(nm)
            meta = getattr(resp, "meta", {})
            next_token = meta.get("next_token") if isinstance(meta, dict) else None
            if not next_token:
                break
        return collected

    async def _lookup_handle(self, user_id: UUID) -> Optional[str]:
        # Placeholder: map internal user id to stored twitter handle
        return None
