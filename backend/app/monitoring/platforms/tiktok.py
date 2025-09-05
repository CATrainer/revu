"""TikTok scraper using Browserless (headless) HTML extraction skeleton."""
from __future__ import annotations

import os
import json
from typing import List, Optional
from uuid import UUID

import httpx
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from .base import PlatformClientBase, NormalizedMention


class TikTokClient(PlatformClientBase):
    PLATFORM = "tiktok"
    DEFAULT_RATE = 40

    def __init__(self, session: AsyncSession, *, browserless_key: Optional[str] = None) -> None:
        super().__init__(session)
        self._bl_key = browserless_key or os.getenv("BROWSERLESS_API_KEY")
        self._endpoint = os.getenv("BROWSERLESS_ENDPOINT", "https://chrome.browserless.io/content")

    async def _fetch_mentions_core(self, **kwargs) -> List[NormalizedMention]:
        # Not directly supported; treat as search for brand handle
        return []

    async def _fetch_profile_metrics_core(self, **kwargs):  # noqa: D401
        return {}

    async def _search_content_core(self, **kwargs) -> List[NormalizedMention]:
        query: str = kwargs["query"]
        limit: int = kwargs.get("limit", 30)
        if not self._bl_key:
            return []
        # Construct TikTok search URL
        url = f"https://www.tiktok.com/search?q={query}"  # simplistic
        html = await self._fetch_html(url)
        if not html:
            return []
        # Very naive parsing placeholder
        mentions: List[NormalizedMention] = []
        # Example: parse occurrences of data-id="<video id>" and caption markers (placeholder logic)
        # Real implementation would use a proper HTML parser & maybe embedded JSON extraction.
        snippets = html.split("data-e2e=\"search-video-item\"")[:limit]
        for idx, _ in enumerate(snippets):
            mentions.append(
                self.normalize(
                    platform=self.PLATFORM,
                    content_id=f"fake_{idx}",
                    author_username=None,
                    content=f"Extracted snippet {idx}",
                    url=url,
                    published_at=None,
                    engagement_metrics={},
                    raw={},
                )
            )
        return mentions[:limit]

    async def _fetch_html(self, target_url: str) -> Optional[str]:
        if not self._bl_key:
            return None
        payload = {"url": target_url, "waitForTimeout": 3000}
        headers = {"Cache-Control": "no-cache"}
        params = {"token": self._bl_key}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(self._endpoint, params=params, json=payload)
                if resp.status_code != 200:
                    logger.warning(
                        "Browserless non-200 status={s} body={b}", s=resp.status_code, b=resp.text[:200]
                    )
                    return None
                return resp.text
        except Exception as e:  # noqa: BLE001
            logger.warning("Browserless fetch failed: {e}", e=str(e))
            return None
