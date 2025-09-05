"""Abstract / foundational utilities for platform scraper clients.

Responsibilities provided here:
 - Abstract method definitions: fetch_mentions, fetch_profile_metrics, search_content
 - Rate limiting via simple leaky bucket (requests per window)
 - Exponential backoff & retry for transient errors
 - Common normalization to a canonical mention schema:
     {platform, content_id, author_username, content, url, published_at, engagement_metrics}

Concrete platform classes should implement the abstract *_core methods and rely on
`_safe_call` wrapper for network I/O to uniformly handle retries & logging.
"""
from __future__ import annotations

import asyncio
import math
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from uuid import UUID

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class NormalizedMention:
    platform: str
    content_id: str
    author_username: Optional[str]
    content: str
    url: Optional[str]
    published_at: Optional[str]  # ISO 8601 string
    engagement_metrics: Dict[str, Any]
    raw: Dict[str, Any]


class RateLimiter:
    """Simple per-instance rate limiter.

    Args:
        rate: allowed requests per window
        window: seconds window
    """

    def __init__(self, rate: int, window: float = 60.0) -> None:
        self.rate = max(rate, 1)
        self.window = window
        self.allowance = self.rate
        self.last_check = time.monotonic()

    async def acquire(self) -> None:
        while True:
            current = time.monotonic()
            time_passed = current - self.last_check
            self.last_check = current
            self.allowance += time_passed * (self.rate / self.window)
            if self.allowance > self.rate:
                self.allowance = self.rate
            if self.allowance >= 1.0:
                self.allowance -= 1.0
                return
            # Need to wait
            wait_for = (1.0 - self.allowance) * (self.window / self.rate)
            await asyncio.sleep(wait_for)


class PlatformClientBase(ABC):
    """Abstract base class for platform scrapers."""

    PLATFORM = "base"
    DEFAULT_RATE = 60  # req/min

    def __init__(self, session: AsyncSession, *, rate: Optional[int] = None) -> None:
        self.session = session
        self.rate_limiter = RateLimiter(rate or self.DEFAULT_RATE)

    # ---------------- Public API -----------------
    async def fetch_mentions(self, user_id: UUID, *, limit: int = 50) -> List[NormalizedMention]:
        return await self._safe_call(self._fetch_mentions_core, user_id=user_id, limit=limit)

    async def fetch_profile_metrics(self, user_id: UUID) -> Dict[str, Any]:
        return await self._safe_call(self._fetch_profile_metrics_core, user_id=user_id)

    async def search_content(self, query: str, *, limit: int = 50) -> List[NormalizedMention]:
        return await self._safe_call(self._search_content_core, query=query, limit=limit)

    # ---------------- Abstract core methods (implemented by subclasses) ---------
    @abstractmethod
    async def _fetch_mentions_core(self, **kwargs) -> List[NormalizedMention]:  # pragma: no cover - abstract
        ...

    @abstractmethod
    async def _fetch_profile_metrics_core(self, **kwargs) -> Dict[str, Any]:  # pragma: no cover - abstract
        ...

    @abstractmethod
    async def _search_content_core(self, **kwargs) -> List[NormalizedMention]:  # pragma: no cover - abstract
        ...

    # ---------------- Helpers -----------------
    async def _safe_call(self, func, **kwargs):  # type: ignore[no-untyped-def]
        max_retries = 5
        base_delay = 0.5
        for attempt in range(1, max_retries + 1):
            await self.rate_limiter.acquire()
            try:
                return await func(**kwargs)
            except Exception as e:  # noqa: BLE001
                retryable = self._is_retryable(e)
                logger.warning(
                    "{platform} call failed attempt={attempt} retryable={retryable} error={err}",
                    platform=self.PLATFORM,
                    attempt=attempt,
                    retryable=retryable,
                    err=str(e),
                )
                if not retryable or attempt == max_retries:
                    raise
                delay = base_delay * math.pow(2, attempt - 1) + (0.05 * attempt)
                await asyncio.sleep(delay)

    def _is_retryable(self, e: Exception) -> bool:  # noqa: D401
        msg = str(e).lower()
        retry_signals = ["timeout", "temporarily", "rate", "429", "unavailable", "reset"]
        return any(s in msg for s in retry_signals)

    # Normalization utility
    @staticmethod
    def normalize(
        *,
        platform: str,
        content_id: str,
        author_username: Optional[str],
        content: str,
        url: Optional[str],
        published_at: Optional[str],
        engagement_metrics: Optional[Dict[str, Any]] = None,
        raw: Optional[Dict[str, Any]] = None,
    ) -> NormalizedMention:
        return NormalizedMention(
            platform=platform,
            content_id=content_id,
            author_username=author_username,
            content=content,
            url=url,
            published_at=published_at,
            engagement_metrics=engagement_metrics or {},
            raw=raw or {},
        )

