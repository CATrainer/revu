from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.claude_service import ClaudeService
from app.services.safety_validator import schedule_safety_check, evaluate_delete_criteria
from app.services.template_engine import TemplateEngine
from app.services.ab_testing import ABTestingService
from app.services.youtube_service import YouTubeService


@dataclass
class ExecContext:
    channel_id: str
    video_id: str
    comment_id: str
    comment_text: str
    classification: Optional[str] = None
    author_channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    video_title: Optional[str] = None


class ActionExecutor:
    """
    Executes rule actions with human-like pacing, rate limiting, and logging.

    Logs to rule_executions(rule_id, comment_id, video_id, triggered_at, conditions, action, ab_variant, user_context, execution_time_ms).
    """

    def __init__(self) -> None:
        self._claude = ClaudeService()
        self._templ = TemplateEngine()
        self._ab = ABTestingService()
        self._yt = YouTubeService()
        # basic token bucket per-channel for rate limiting
        self._rate: Dict[str, Dict[str, Any]] = {}

    # 4 & 5) human-like delays and rate limiting
    async def _human_delay(self, *, base_min: float = 0.8, base_max: float = 2.0) -> None:
        await asyncio.sleep(random.uniform(base_min, base_max))

    def _allow(self, channel_id: str, *, per_minute: int = 30) -> bool:
        bucket = self._rate.setdefault(channel_id, {"window": int(time.time() // 60), "count": 0})
        now_window = int(time.time() // 60)
        if bucket["window"] != now_window:
            bucket["window"] = now_window
            bucket["count"] = 0
        if bucket["count"] >= per_minute:
            return False
        bucket["count"] += 1
        return True

    async def _log_rule_execution(
        self,
        db: AsyncSession,
        *,
        rule_id: Optional[str],
        ex: ExecContext,
        action: Dict[str, Any],
        ab_variant: Optional[str],
        conditions: Optional[Dict[str, Any]] = None,
        user_context: Optional[Dict[str, Any]] = None,
        started_ms: Optional[float] = None,
    ) -> None:
        try:
            took_ms = int(((time.time() * 1000) - started_ms)) if started_ms else None
            await db.execute(
                text(
                    """
                    INSERT INTO rule_executions (rule_id, comment_id, video_id, triggered_at, conditions, action, ab_variant, user_context, execution_time_ms)
                    VALUES (:rid, :cid, :vid, now(), :conds::jsonb, :act::jsonb, :var, :uctx::jsonb, :ms)
                    """
                ),
                {
                    "rid": rule_id,
                    "cid": ex.comment_id,
                    "vid": ex.video_id,
                    "conds": conditions or {},
                    "act": action or {},
                    "var": ab_variant,
                    "uctx": user_context or {},
                    "ms": took_ms,
                },
            )
            await db.commit()
        except Exception:
            logger.exception("Failed to log rule execution")
            try:
                await db.rollback()
            except Exception:
                pass

    # 1) generate and queue response
    async def execute_respond(
        self,
        db: AsyncSession,
        *,
        rule: Dict[str, Any],
        ex: ExecContext,
        context: Dict[str, Any],
    ) -> bool:
        start_ms = time.time() * 1000
        if not self._allow(ex.channel_id):
            logger.warning("Rate limited; skipping respond for {}", ex.comment_id)
            return False
        await self._human_delay()

        # Choose AB variant/template
        variant = self._ab.select_variant(rule)
        template = await self._templ.select_template(
            db,
            rule=rule,
            comment_classification=(ex.classification or ""),
            channel_id=ex.channel_id,
        )
        # Render with context
        render = self._templ.parse_template(template or "", {
            "username": context.get("username"),
            "channel_name": ex.channel_name,
            "video_title": ex.video_title,
            "video_type": context.get("video_type"),
            "comment_text": ex.comment_text,
            "date": context.get("date"),
        })
        text_out = render.text if render.text else template or ""

        # Generate varied response for uniqueness
        varied = await self._claude.generate_varied_response(
            base_template=text_out,
            context={"username": context.get("username"), "video_title": ex.video_title, "comment": ex.comment_text},
            previous_responses=[],
            style=((rule.get("action") or {}).get("config") or {}).get("style", "friendly"),
            custom_instructions=((rule.get("action") or {}).get("config") or {}).get("custom_instructions"),
            db=db,
            channel_id=ex.channel_id,
        )
        final_text = (varied or text_out).strip()

        # Upsert into comments_queue and ai_responses flow via existing endpoint logic
        # Mark queue row as processing and insert ai_responses after safety check schedule
        # Here, we just schedule safety check directly similar to /api/ai path
        try:
            await schedule_safety_check(db, queue_id=ex.comment_id, response_text=final_text, original_comment=ex.comment_text)
        except Exception:
            logger.exception("Failed to schedule safety check for {}", ex.comment_id)
            return False

        await self._ab.track_result(db, rule_id=str(rule.get("id")) if rule.get("id") else None or "", variant_id=variant, comment_id=ex.comment_id, metrics={"impressions": 1})
        await self._log_rule_execution(db, rule_id=str(rule.get("id") or ""), ex=ex, action=(rule.get("action") or {}), ab_variant=variant, conditions=(rule.get("conditions") or {}), user_context=context, started_ms=start_ms)
        return True

    # 2) delete comment via YouTube API (gated by AI delete criteria)
    async def execute_delete(self, db: AsyncSession, *, rule: Dict[str, Any], ex: ExecContext) -> bool:
        start_ms = time.time() * 1000
        if not self._allow(ex.channel_id, per_minute=15):
            logger.warning("Rate limited; skipping delete for {}", ex.comment_id)
            return False
        await self._human_delay(base_min=1.0, base_max=2.5)

        # Evaluate deletion criteria with AI and safeguards
        criteria = ((rule.get("action") or {}).get("config") or {}).get("delete_criteria") or ((rule.get("action") or {}).get("ai_criteria"))
        decision = await evaluate_delete_criteria(
            {
                "id": ex.comment_id,
                "comment_id": ex.comment_id,
                "text": ex.comment_text,
                "author_channel_id": ex.author_channel_id,
            },
            criteria or {},
        )

        # Optionally persist moderation decision log
        try:
            await db.execute(
                text(
                    """
                    INSERT INTO moderation_logs (comment_id, action, decision, decided_at)
                    VALUES (:cid, 'delete_evaluate', :decision::jsonb, now())
                    """
                ),
                {"cid": ex.comment_id, "decision": decision},
            )
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

        if not decision.get("recommended_delete", False):
            logger.info(
                "Delete skipped cid={} conf={} thr={} legit={} reason={}",
                ex.comment_id,
                round(float(decision.get("confidence", 0.0)), 3),
                round(float(decision.get("threshold", 0.0)), 3),
                bool(decision.get("legitimate")),
                decision.get("reason"),
            )
            # Still log rule execution as a no-op action
            await self._log_rule_execution(db, rule_id=str(rule.get("id") or ""), ex=ex, action=(rule.get("action") or {}), ab_variant=None, conditions=(rule.get("conditions") or {}), user_context=None, started_ms=start_ms)
            return False

        ok = False
        try:
            ok = await self._yt.delete_comment(channel_id=ex.channel_id, youtube_comment_id=ex.comment_id)
        except Exception:
            logger.exception("YouTube delete failed for {}", ex.comment_id)
            ok = False

        await self._log_rule_execution(db, rule_id=str(rule.get("id") or ""), ex=ex, action=(rule.get("action") or {}), ab_variant=None, conditions=(rule.get("conditions") or {}), user_context=None, started_ms=start_ms)
        return ok

    # 3) flag for manual review
    async def execute_flag(self, db: AsyncSession, *, rule: Dict[str, Any], ex: ExecContext) -> bool:
        start_ms = time.time() * 1000
        if not self._allow(ex.channel_id, per_minute=60):
            return False
        await self._human_delay(base_min=0.5, base_max=1.5)
        try:
            await db.execute(
                text("UPDATE comments_queue SET status = 'needs_review', updated_at = now() WHERE comment_id = :cid"),
                {"cid": ex.comment_id},
            )
            await db.commit()
            await self._log_rule_execution(db, rule_id=str(rule.get("id") or ""), ex=ex, action=(rule.get("action") or {}), ab_variant=None, conditions=(rule.get("conditions") or {}), user_context=None, started_ms=start_ms)
            return True
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
            return False
