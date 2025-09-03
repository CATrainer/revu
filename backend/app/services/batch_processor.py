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
from datetime import datetime, timezone, timedelta
import os
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.utils.reliability import async_retry
from sqlalchemy import text as sql_text
from app.utils import debug_log
from app.services import system_state


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

    # ---- Configuration helpers ----
    def get_batch_size(self) -> int:
        """Determine batch size dynamically.

        - In TESTING_MODE, use max(BATCH_SIZE_MIN, SAFETY_CHECK_BATCH_MIN) but never exceed 5
        - Otherwise default to 5 (API limit we chose earlier)
        """
        testing = os.getenv("TESTING_MODE", "false").lower() == "true"
        if testing:
            try:
                bmin = int(os.getenv("BATCH_SIZE_MIN", "1"))
            except Exception:
                bmin = 1
            try:
                smin = int(os.getenv("SAFETY_CHECK_BATCH_MIN", "2"))
            except Exception:
                smin = 2
            size = max(1, min(5, max(bmin, smin)))
            return size
        return 5

    async def _get_last_batch_time(self) -> datetime | None:
        """Return most recent last_batch_processed_at across the queue."""
        res = await self.session.execute(
            text("""
                SELECT MAX(last_batch_processed_at)
                FROM comments_queue
            """)
        )
        return res.scalar()

    async def _oldest_pending_age_seconds(self) -> int:
        res = await self.session.execute(
            text(
                """
                SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at)))::int
                FROM comments_queue
                WHERE status = 'pending'
                """
            )
        )
        val = res.scalar()
        return int(val or 0)

    async def _pending_count(self) -> int:
        res = await self.session.execute(
            text("SELECT COUNT(1) FROM comments_queue WHERE status = 'pending'")
        )
        return int(res.scalar() or 0)

    async def should_process_batch(self) -> tuple[bool, str]:
        """Decide if a batch should be processed now.

        Returns (should_process, reason)
        - reason in {"size", "timeout_oldest", "timeout_last_batch", "no"}
        """
        # env controls
        try:
            wait_max = int(os.getenv("BATCH_WAIT_MAX_SECONDS", "120"))
        except Exception:
            wait_max = 120
        size_min = 0
        try:
            size_min = int(os.getenv("BATCH_SIZE_MIN", "1"))
        except Exception:
            size_min = 1

        pending = await self._pending_count()
        if pending <= 0:
            return False, "no"

        if pending >= max(1, size_min):
            return True, "size"

        oldest_age = await self._oldest_pending_age_seconds()
        if oldest_age >= max(1, wait_max):
            return True, "timeout_oldest"

        last_batch = await self._get_last_batch_time()
        if not last_batch:
            # if we've never processed, allow after a grace period of 5 minutes
            # but also allow immediate when at least one pending exists
            return True, "timeout_last_batch"
        if datetime.now(timezone.utc) - last_batch > timedelta(minutes=5):
            return True, "timeout_last_batch"

        return False, "no"

    async def get_wait_time(self) -> int:
        """Compute recommended wait time (seconds) until next batch check.

        Rules:
        1) Return 0 if batch minimum is reached.
        2) In testing mode: cap at 30s for any pending comments.
        3) In production: graduated waits
           - 60s for 3+ pending (but under minimum)
           - 180s for 1-2 pending
           - 300s for 0 pending
        4) Subtract age of oldest pending comment to avoid long waits.
        5) Off-peak hours (22:00–06:00 UTC): be more aggressive (50% of baseline, min 5s).
        """
        # Config
        testing = os.getenv("TESTING_MODE", "false").lower() == "true"
        try:
            size_min = int(os.getenv("BATCH_SIZE_MIN", "1"))
        except Exception:
            size_min = 1

        pending = await self._pending_count()

        # 1) If batch min reached, no wait
        if pending >= max(1, size_min):
            return 0

        oldest_age = await self._oldest_pending_age_seconds() if pending > 0 else 0

        # Determine baseline
        if testing:
            # 2) Testing: max 30s when anything pending (or 30s otherwise)
            base = 30 if pending > 0 else 30
        else:
            # 3) Production graduated waits
            if pending >= 3:
                base = 60
            elif pending >= 1:
                base = 180
            else:
                base = 300

            # 5) Off-peak adjustment (22:00–06:00 UTC)
            now = datetime.now(timezone.utc)
            hour = now.hour
            if hour >= 22 or hour < 6:
                base = max(5, int(base * 0.5))

        # 4) Adjust by how long the oldest item has already waited
        wait = max(0, int(base - oldest_age))
        return wait

    async def get_pending_comments(self, limit: int = 5) -> List[QueueItem]:
        """Return up to `limit` pending comments ordered by priority desc, then created_at asc."""
        res = await self.session.execute(
            text(
                """
                SELECT id, comment_id, COALESCE(content, ''), classification, COALESCE(priority, 0)
                FROM comments_queue
                WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= now())
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
        max_batch = self.get_batch_size()
        for _, arr in groups.items():
            for i in range(0, len(arr), max_batch):
                batches.append(arr[i : i + max_batch])
        if os.getenv("TESTING_MODE", "false").lower() == "true":
            try:
                debug_log.add(
                    "batch.groups",
                    {
                        "pending": len(items),
                        "groups": len(groups),
                        "batches": len(batches),
                        "batch_size": max_batch,
                    },
                )
            except Exception:
                pass
        return batches

    async def process_batch(self, items: List[QueueItem]) -> List[Dict[str, Any]]:
        """Call the batch-generate endpoint for up to 5 items and return results."""
        if not items:
            return []
        # Global pause guard
        try:
            if await system_state.is_paused(self.session):
                logger.warning("System paused; skipping batch of {} items", len(items))
                return [{"comment_id": it.comment_id, "error": "paused"} for it in items]
        except Exception:
            pass
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
        async def _call_once():
            async with httpx.AsyncClient(timeout=30.0) as client:
                return await client.post(url, json=payload)

        def _should_retry(e: BaseException) -> bool:
            import httpx  # type: ignore
            if isinstance(e, httpx.HTTPStatusError):
                code = e.response.status_code
                return code in (429, 500, 502, 503, 504)
            return isinstance(e, httpx.TransportError)

        try:
            resp = await async_retry(
                lambda: _call_once(),
                retries=3,
                base_delay=0.5,
                max_delay=4.0,
                should_retry=lambda e: _should_retry(e),
            )
            if resp.status_code != 200:
                try:
                    # log to error_logs
                    await self.session.execute(
                        sql_text(
                            """
                            INSERT INTO error_logs (service_name, operation, error_code, message, context, created_at)
                            VALUES ('batch_processor', 'batch-generate', :code, :msg, :ctx, now())
                            """
                        ),
                        {
                            "code": int(resp.status_code),
                            "msg": "non_200_response",
                            "ctx": {"ids": ids, "body": payload},
                        },
                    )
                    await self.session.commit()
                except Exception:
                    try:
                        await self.session.rollback()
                    except Exception:
                        pass
                logger.error("Batch endpoint failed: {} - {}", resp.status_code, getattr(resp, 'text', ''))
                return [{"comment_id": cid, "error": f"http_{resp.status_code}"} for cid in ids]
            data = resp.json()
            items_out = data.get("items", []) if isinstance(data, dict) else []
            return items_out
        except Exception as e:
            logger.exception("Batch call exception: {}", e)
            try:
                await self.session.execute(
                    sql_text(
                        """
                        INSERT INTO error_logs (service_name, operation, error_code, message, context, created_at)
                        VALUES ('batch_processor', 'batch-generate', 0, :msg, :ctx, now())
                        """
                    ),
                    {"msg": str(e), "ctx": {"ids": ids}},
                )
                await self.session.commit()
            except Exception:
                try:
                    await self.session.rollback()
                except Exception:
                    pass
            return [{"comment_id": cid, "error": "exception"} for cid in ids]

    async def run_batch_cycle(self, *, max_batches: int = 20, delay_seconds: float = 2.0) -> int:
        """Process all pending comments in grouped batches respecting rate limits.

        Returns number of comments successfully processed.
        """
        processed = 0
        batches_run = 0
        while batches_run < max_batches:
            should, reason = await self.should_process_batch()
            if not should:
                break

            pending = await self.get_pending_comments(limit=50)
            if not pending:
                break
            groups = self.group_comments(pending)
            if not groups:
                break
            for group in groups:
                # Only process up to configured size at a time
                subset = group[: self.get_batch_size()]
                if os.getenv("TESTING_MODE", "false").lower() == "true":
                    debug_log.add(
                        "batch.process.start",
                        {"size": len(subset), "reason": reason, "ids": [it.comment_id for it in subset]},
                    )
                results = await self.process_batch(subset)
                # Mark last_batch_processed_at for attempted items (track timing even if individual calls fail)
                try:
                    ids = [it.queue_id for it in subset]
                    if ids:
                        # Build a VALUES list for uuid ids
                        values = ",".join([f"(CAST(:id{i} AS uuid))" for i in range(len(ids))])
                        params = {f"id{i}": str(v) for i, v in enumerate(ids)}
                        await self.session.execute(
                            text(
                                f"""
                                UPDATE comments_queue cq
                                SET last_batch_processed_at = now()
                                FROM (VALUES {values}) AS v(id)
                                WHERE cq.id = v.id
                                """
                            ),
                            params,
                        )
                        await self.session.commit()
                except Exception:
                    try:
                        await self.session.rollback()
                    except Exception:
                        pass
                # Count successes
                for r in results:
                    if isinstance(r, dict) and r.get("response_text"):
                        processed += 1
                if os.getenv("TESTING_MODE", "false").lower() == "true":
                    debug_log.add(
                        "batch.process.done",
                        {"size": len(subset), "processed": processed, "results": len(results)},
                    )
                batches_run += 1
                # Delay between batches to respect rate limits
                await asyncio.sleep(delay_seconds)
                if batches_run >= max_batches:
                    break
        logger.info("Batch cycle complete: processed={} batches={} (trigger={})", processed, batches_run, reason)
        return processed
