from __future__ import annotations

"""ClaudeService: thin wrapper around Anthropic client for generating YouTube comment replies,
with analytics logging and daily metrics updates.
"""

import os
import math
import time
from datetime import datetime, timezone, date
from typing import Optional, Dict, Any

try:
    from anthropic import Anthropic, APIError  # type: ignore
except Exception:  # ImportError or other runtime import issues
    Anthropic = None  # type: ignore
    APIError = Exception  # type: ignore

from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger
from app.utils.reliability import async_retry, CircuitBreaker


PRICE_USD_PER_MTOKENS: Dict[str, Dict[str, float]] = {
    # Defaults; can be overridden via env if needed
    # model: { 'input': usd_per_mtok, 'output': usd_per_mtok }
    "claude-3-5-sonnet-latest": {"input": float(os.getenv("CLAUDE35_SONNET_INPUT_USD_PER_MTOK", 3.0)),
                                  "output": float(os.getenv("CLAUDE35_SONNET_OUTPUT_USD_PER_MTOK", 15.0))},
}


def _estimate_tokens(text_val: str) -> int:
    """Rough token estimate: ~4 chars per token (English heuristic)."""
    if not text_val:
        return 0
    return max(1, math.ceil(len(text_val) / 4))


def _calc_cost_usd(model: str, tokens_in: int, tokens_out: int) -> float:
    p = PRICE_USD_PER_MTOKENS.get(model) or PRICE_USD_PER_MTOKENS["claude-3-5-sonnet-latest"]
    cost_in = (tokens_in / 1_000_000.0) * p["input"]
    cost_out = (tokens_out / 1_000_000.0) * p["output"]
    return round(cost_in + cost_out, 6)


class ClaudeService:
    """Service for generating brief, friendly YouTube comment responses via Claude."""

    def __init__(self) -> None:
        # Prefer env var directly; fall back to settings for convenience in local/dev
        api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
        if not api_key:
            logger.warning("CLAUDE_API_KEY not set; ClaudeService will return None for generations")
        if Anthropic is None:
            logger.warning("anthropic SDK not installed; ClaudeService disabled")
            self.client = None
        else:
            self.client = Anthropic(api_key=api_key) if api_key else None
        # Simple process-level circuit breaker for Claude
        self._breaker = CircuitBreaker(threshold=int(os.getenv("CLAUDE_CB_THRESHOLD", "5")),
                                       cooldown=float(os.getenv("CLAUDE_CB_COOLDOWN", "60")),
                                       half_open_max=1)

    async def generate_response(
        self,
        *,
        db: AsyncSession,
        channel_id: str,
        comment_text: str,
        channel_name: str,
        video_title: str,
        from_cache: bool = False,
    ) -> Optional[str]:
        """Generate a short, friendly YouTube comment reply and log analytics.

        Returns the model text or None on error.
        """
        if not self.client:
            return None

        # Circuit breaker short-circuit
        if not self._breaker.allow_request():
            logger.warning("Claude circuit open; short-circuiting request")
            # Log as error event but without making an API call
            await self._log_error(db,
                                  service="claude",
                                  op="messages.create",
                                  code=503,
                                  message="circuit_open",
                                  context={"channel_id": channel_id, "from_cache": from_cache})
            return None

    # Compose a concise, safe prompt
        system_prompt = (
            "You are a helpful assistant writing brief, friendly, and professional replies to YouTube comments. "
            "Keep replies under 2 sentences, positive, and aligned with the creator's tone. Avoid emojis unless appropriate."
        )
        user_prompt = (
            f"Channel: {channel_name}\n"
            f"Video: {video_title}\n"
            f"Original comment: {comment_text}\n\n"
            "Write a succinct reply that acknowledges the commenter and is helpful where possible."
        )

        # Track latency and usage
        started = time.perf_counter()
        status_code = 0
        tokens_in = 0
        tokens_out = 0
        model_used = getattr(settings, "CLAUDE_MODEL", None) or os.getenv("CLAUDE_MODEL") or "claude-3-5-sonnet-latest"
        def _call_sync():
            return self.client.messages.create(  # type: ignore[union-attr]
                model=model_used,
                max_tokens=getattr(settings, "CLAUDE_MAX_TOKENS", None) or int(os.getenv("CLAUDE_MAX_TOKENS", "200")),
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                temperature=0.3,
            )

        def _should_retry(e: BaseException) -> bool:
            # Retry anthropic APIError 429/5xx and generic transient errors
            code = getattr(e, "status_code", None)
            if isinstance(e, Exception) and code in (429, 500, 502, 503, 504):
                return True
            return False

        try:
            # Prefer configured model; fallback to a widely available latest model name
            resp = await async_retry(
                lambda: _run_in_thread(_call_sync),
                retries=int(os.getenv("CLAUDE_MAX_RETRIES", "3")),
                base_delay=float(os.getenv("CLAUDE_RETRY_BASE_DELAY", "0.5")),
                max_delay=float(os.getenv("CLAUDE_RETRY_MAX_DELAY", "6.0")),
                should_retry=_should_retry,
            )
            # Anthropic responses contain content blocks; extract first text block
            content = resp.content if hasattr(resp, "content") else None
            if isinstance(content, list) and content:
                # Each block may be a dict-like with {type: 'text', text: '...'}
                first = content[0]
                text = getattr(first, "text", None) or (first.get("text") if isinstance(first, dict) else None)
                result_text = text or None
            # Some SDK versions expose .output_text on responses
            if not content:
                text_attr = getattr(resp, "output_text", None)
                result_text = text_attr or None

            # Estimate tokens
            tokens_in = _estimate_tokens(system_prompt) + _estimate_tokens(user_prompt)
            tokens_out = _estimate_tokens(result_text or "")
            status_code = 200

            self._breaker.record_success()
            return result_text
        except APIError as e:  # anthropic-specific error
            logger.error(f"Claude APIError: {e}")
            status_code = getattr(e, "status_code", 500) or 500
            result_text = None
            self._breaker.record_failure()
            await self._log_error(db, service="claude", op="messages.create", code=status_code, message=str(e),
                                  context={"channel_id": channel_id})
            return None
        except Exception as e:  # generic fallback
            logger.exception(f"Claude generation failed: {e}")
            status_code = 500
            result_text = None
            self._breaker.record_failure()
            await self._log_error(db, service="claude", op="messages.create", code=500, message=str(e),
                                  context={"channel_id": channel_id})
            return None
        finally:
            # Always log usage when an API call was attempted
            try:
                latency_ms = int((time.perf_counter() - started) * 1000)
                cost = _calc_cost_usd(model_used, tokens_in, tokens_out) if status_code == 200 else 0.0
                await db.execute(
                    text(
                        """
                        INSERT INTO api_usage_log (
                          service_name, endpoint, model, tokens_input, tokens_output, tokens_total,
                          estimated_cost_usd, latency_ms, status_code, metadata, created_at
                        )
                        VALUES (:svc, :ep, :model, :tin, :tout, :ttot, :cost, :lat, :status, :meta, now())
                        """
                    ),
                    {
                        "svc": "claude",
                        "ep": "messages.create",
                        "model": model_used,
                        "tin": tokens_in or None,
                        "tout": tokens_out or None,
                        "ttot": (tokens_in + tokens_out) or None,
                        "cost": cost,
                        "lat": latency_ms,
                        "status": status_code,
                        "meta": {
                            "from_cache": bool(from_cache),
                            "channel_id": channel_id,
                            "video_title": video_title,
                        },
                    },
                )
                await db.commit()
            except Exception:  # don't break main flow due to logging
                logger.exception("Failed to log api_usage for Claude call")

            # Increment daily metrics for generations (only on success and not from cache)
            try:
                if status_code == 200 and not from_cache:
                    await ClaudeService.increment_metrics(db, channel_id=channel_id, delta_generated=1)
            except Exception:
                logger.exception("Failed to update response_metrics after Claude generation")

    async def _log_error(self, db: AsyncSession, *, service: str, op: str, code: Optional[int], message: str, context: Optional[Dict[str, Any]] = None) -> None:
        try:
            await db.execute(
                text(
                    """
                    INSERT INTO error_logs (service_name, operation, error_code, message, context, created_at)
                    VALUES (:svc, :op, :code, :msg, :ctx, now())
                    """
                ),
                {"svc": service, "op": op, "code": code, "msg": message, "ctx": context or {}},
            )
            await db.commit()
        except Exception:
            logger.exception("Failed to write error_logs entry")

# Small helper to run sync function in a thread for async_retry
import asyncio
async def _run_in_thread(fn):
    return await asyncio.to_thread(fn)

    @staticmethod
    async def increment_metrics(
        db: AsyncSession,
        *,
        channel_id: str,
        delta_generated: int = 0,
        delta_cache_hits: int = 0,
        delta_comments: int = 0,
        delta_posted: int = 0,
    ) -> None:
        stats_date = datetime.now(timezone.utc).date()
        try:
            await db.execute(
                text(
                    """
                    INSERT INTO response_metrics (channel_id, stats_date, total_comments, responses_generated, responses_posted, cache_hits, created_at, updated_at)
                    VALUES (:cid, :d, :tc, :rg, :rp, :ch, now(), now())
                    ON CONFLICT (channel_id, stats_date)
                    DO UPDATE SET
                        total_comments = response_metrics.total_comments + EXCLUDED.total_comments,
                        responses_generated = response_metrics.responses_generated + EXCLUDED.responses_generated,
                        responses_posted = response_metrics.responses_posted + EXCLUDED.responses_posted,
                        cache_hits = response_metrics.cache_hits + EXCLUDED.cache_hits,
                        updated_at = now()
                    """
                ),
                {
                    "cid": str(channel_id),
                    "d": stats_date,
                    "tc": int(delta_comments),
                    "rg": int(delta_generated),
                    "rp": int(delta_posted),
                    "ch": int(delta_cache_hits),
                },
            )
            await db.commit()
        except Exception:
            logger.exception("Failed to upsert into response_metrics")
