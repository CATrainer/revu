"""Instagram scraper using Basic Display API (if available) + web fallback."""
from __future__ import annotations

import os
import json
from typing import List, Optional
from uuid import UUID

import httpx
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from .base import PlatformClientBase, NormalizedMention


class InstagramClient(PlatformClientBase):
    PLATFORM = "instagram"
    DEFAULT_RATE = 80

    def __init__(self, session: AsyncSession, *, access_token: Optional[str] = None) -> None:
        super().__init__(session)
        self._token = access_token or os.getenv("IG_BASIC_ACCESS_TOKEN")

    async def _fetch_mentions_core(self, **kwargs) -> List[NormalizedMention]:
        # Mentions require either Graph API or scraping; placeholder returns empty.
        return []

    async def _fetch_profile_metrics_core(self, **kwargs):  # noqa: D401
        if not self._token:
            return {}
        # Basic Display token has limited fields; placeholder
        return {}

    async def _search_content_core(self, **kwargs) -> List[NormalizedMention]:
        query: str = kwargs["query"]
        limit: int = kwargs.get("limit", 30)
        # Very naive web scraping fallback
        url = f"https://www.instagram.com/explore/tags/{query.strip('#')}" if query.startswith("#") else f"https://www.instagram.com/{query}"  # noqa: E501
        html = await self._fetch_html(url)
        if not html:
            return []
        # Extract embedded JSON (window._sharedData) simplistic approach
        mentions: List[NormalizedMention] = []
        if "window._sharedData" in html:
            # Simplistic parse; real parsing would use regex & json.loads
            pass
        # Placeholder synthetic results
        for idx in range(min(limit, 5)):
            mentions.append(
                self.normalize(
                    platform=self.PLATFORM,
                    content_id=f"ig_fake_{idx}",
                    author_username=None,
                    content=f"Placeholder IG content {idx}",
                    url=url,
                    published_at=None,
                    engagement_metrics={},
                    raw={},
                )
            )
        return mentions

    async def _fetch_html(self, url: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient(timeout=30, headers={"User-Agent": "Mozilla/5.0"}) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning("IG fetch status={s}", s=resp.status_code)
                    return None
                return resp.text
        except Exception as e:  # noqa: BLE001
            logger.warning("IG fetch failed: {e}", e=str(e))
            return None
