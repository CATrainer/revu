"""Reddit scraper implementation using PRAW (skeleton)."""
from __future__ import annotations

import os
from typing import List, Optional
from uuid import UUID

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

try:  # PRAW optional
    import praw  # type: ignore
except Exception:  # noqa: BLE001
    praw = None  # type: ignore

from .base import PlatformClientBase, NormalizedMention


class RedditClient(PlatformClientBase):
    PLATFORM = "reddit"
    DEFAULT_RATE = 120

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self._client = None
        if praw:
            try:
                self._client = praw.Reddit(
                    client_id=os.getenv("REDDIT_CLIENT_ID"),
                    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
                    user_agent=os.getenv("REDDIT_USER_AGENT", "revu-monitor/0.1"),
                )
            except Exception:  # noqa: BLE001
                logger.exception("Failed to init PRAW client")

    async def _fetch_mentions_core(self, **kwargs) -> List[NormalizedMention]:
        # Searching username mentions across all subreddits via pushshift reddit API would be ideal; here fallback to site-wide search
        handle = await self._lookup_handle(kwargs["user_id"]) or ""
        if not handle or not self._client:
            return []
        query = f"{handle}"  # simple search
        return await self._search_all(query=query, limit=kwargs.get("limit", 50))

    async def _fetch_profile_metrics_core(self, **kwargs):  # noqa: D401
        # Reddit user metrics require authenticated user context; placeholder only
        return {}

    async def _search_content_core(self, **kwargs) -> List[NormalizedMention]:
        return await self._search_all(query=kwargs["query"], limit=kwargs.get("limit", 50))

    async def _search_all(self, *, query: str, limit: int) -> List[NormalizedMention]:
        if not self._client:
            return []
        collected: List[NormalizedMention] = []
        try:
            for submission in self._client.subreddit("all").search(query, limit=limit):  # type: ignore[attr-defined]
                if len(collected) >= limit:
                    break
                nm = self.normalize(
                    platform=self.PLATFORM,
                    content_id=str(submission.id),
                    author_username=getattr(submission.author, "name", None),
                    content=submission.title or submission.selftext or "",
                    url=f"https://www.reddit.com{submission.permalink}",
                    published_at=str(getattr(submission, "created_utc", "")),
                    engagement_metrics={
                        "score": getattr(submission, "score", None),
                        "num_comments": getattr(submission, "num_comments", None),
                    },
                    raw={"subreddit": getattr(submission.subreddit, "display_name", None)},
                )
                collected.append(nm)
                # Comments thread
                submission.comments.replace_more(limit=0)  # type: ignore[call-arg]
                for c in submission.comments[:5]:  # shallow subset to avoid explosion
                    if len(collected) >= limit:
                        break
                    nm_c = self.normalize(
                        platform=self.PLATFORM,
                        content_id=str(c.id),
                        author_username=getattr(c.author, "name", None),
                        content=getattr(c, "body", ""),
                        url=f"https://www.reddit.com{getattr(submission, 'permalink', '')}{c.id}",
                        published_at=str(getattr(c, "created_utc", "")),
                        engagement_metrics={"score": getattr(c, "score", None)},
                        raw={"parent_id": getattr(c, "parent_id", None)},
                    )
                    collected.append(nm_c)
                if len(collected) >= limit:
                    break
        except Exception as e:  # noqa: BLE001
            logger.warning("Reddit search failed: {e}", e=str(e))
        return collected[:limit]

    async def _lookup_handle(self, user_id: UUID) -> Optional[str]:  # noqa: D401
        return None
