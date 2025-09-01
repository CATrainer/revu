"""Batch processing service for grouping and generating replies in batches.

Features:
- get_pending_comments(limit=5): fetch 'pending' comments ordered by priority desc, then created_at asc
- group_comments(comments): group similar comments by classification and length bucket
- process_batch(group): call /api/ai/batch-generate with up to 5 comment_ids
- run_batch_cycle(): iterate pending comments, batch and process with delays

Assumptions:
- comments_queue schema: id (uuid), comment_id (str), content (text), classification (str), priority (int), status (str), created_at (timestamp)
- FastAPI app provides /api/ai/batch-generate endpoint implemented in ai router

Note: This module focuses on DB + HTTP orchestration. It avoids coupling to internal endpoint code.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


@dataclass
class QueueItem:
    queue_id: str
    comment_id: str
    content: str
    classification: Optional[str]
    priority: int


class BatchProcessor:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_pending_comments(self, limit: int = 5) -> List[QueueItem]:
        """Return up to `limit` pending comments ordered by priority desc, then created_at asc."""
        res = await self.session.execute(
            text(
                """
                SELECT id, comment_id, COALESCE(content, ''), classification, COALESCE(priority, 0)
                FROM comments_queue
                WHERE status = 'pending'
                ORDER BY priority DESC, created_at ASC
                LIMIT :lim
                """
            ),
            {"lim": int(limit)},
        )
        items: List[QueueItem] = []
        for r in res.fetchall():
            items.append(
                QueueItem(
                    queue_id=str(r[0]),
                    comment_id=str(r[1]),
                    content=str(r[2] or ""),
                    classification=(r[3] if r[3] is not None else None),
                    priority=int(r[4] or 0),
                )
            )
        return items

    @staticmethod
    def _length_bucket(text_val: str) -> str:
        n = len(text_val or "")
        if n < 40:
            return "short"
        if n < 120:
            return "medium"
        return "long"

    def group_comments(self, items: List[QueueItem]) -> List[List[QueueItem]]:
        """Group by (classification, length_bucket)."""
        groups: Dict[Tuple[Optional[str], str], List[QueueItem]] = {}
        for it in items:
            key = (it.classification, self._length_bucket(it.content))
            groups.setdefault(key, []).append(it)
        # return batches of up to 5 in each group
        batches: List[List[QueueItem]] = []
        for _, arr in groups.items():
            for i in range(0, len(arr), 5):
                batches.append(arr[i : i + 5])
        return batches

    async def process_batch(self, items: List[QueueItem]) -> List[Dict[str, Any]]:
        """Call the batch-generate endpoint for up to 5 items and return results."""
        if not items:
            return []
        ids = [it.comment_id for it in items][:5]

        # Use the local app endpoint; in-process call would be nicer but we avoid tight coupling.
        # We'll perform a direct SQLAlchemy-friendly approach: emulate HTTP via httpx if available.
        import os
        base_url = getattr(settings, "PUBLIC_API_BASE", None) or os.getenv("PUBLIC_API_BASE") or "http://localhost:8000"

        try:
            import httpx  # type: ignore
        except Exception:
            logger.error("httpx is not installed; cannot call batch endpoint")
            return [{"comment_id": cid, "error": "http_client_missing"} for cid in ids]

        payload = {"comment_ids": ids}
        url = f"{base_url}/api/ai/batch-generate"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code != 200:
                    logger.error("Batch endpoint failed: {} - {}", resp.status_code, resp.text)
                    return [{"comment_id": cid, "error": f"http_{resp.status_code}"} for cid in ids]
                data = resp.json()
                items_out = data.get("items", []) if isinstance(data, dict) else []
                return items_out
        except Exception as e:
            logger.exception("Batch call exception: {}", e)
            return [{"comment_id": cid, "error": "exception"} for cid in ids]

    async def run_batch_cycle(self, *, max_batches: int = 20, delay_seconds: float = 2.0) -> int:
        """Process all pending comments in grouped batches respecting rate limits.

        Returns number of comments successfully processed.
        """
        processed = 0
        batches_run = 0
        while batches_run < max_batches:
            pending = await self.get_pending_comments(limit=50)
            if not pending:
                break
            groups = self.group_comments(pending)
            if not groups:
                break
            for group in groups:
                # Only process up to 5 at a time
                subset = group[:5]
                results = await self.process_batch(subset)
                # Count successes
                for r in results:
                    if isinstance(r, dict) and r.get("response_text"):
                        processed += 1
                batches_run += 1
                # Delay between batches to respect rate limits
                await asyncio.sleep(delay_seconds)
                if batches_run >= max_batches:
                    break
        logger.info("Batch cycle complete: processed={} batches={}", processed, batches_run)
        return processed
