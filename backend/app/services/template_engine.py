from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.services.claude_service import ClaudeService


# Simple allowed variables; extend as needed
ALLOWED_VARS = {
    "username",
    "channel_name",
    "video_title",
    "video_type",
    "comment_text",
    "date",
}

# Conditional blocks: {% if var %}...{% endif %}
COND_IF_RE = re.compile(r"\{\%\s*if\s+([a-zA-Z0-9_\.]+)\s*\%\}(.*?)\{\%\s*endif\s*\%\}", re.S)
# Variable tokens like {user.name} or {username}
VAR_RE = re.compile(r"\{([a-zA-Z0-9_\.]+)\}")


@dataclass
class RenderResult:
    text: str
    variables_used: List[str]


class TemplateEngine:
    """
    - parse_template(template, context): variable replacement, nested keys, and conditionals
    - get_contextual_suggestion(comment, video): AI suggestion to enrich reply
    - select_template(rule, comment_classification): DB + defaults selection policy
    - validate_template(template): ensure only allowed variables are used
    - track performance: write to response_templates/ab_test_results tables
    """

    def __init__(self) -> None:
        self._ai = ClaudeService()

    # 1) Parse with variables and simple conditionals
    def parse_template(self, template: str, context: Dict[str, Any]) -> RenderResult:
        def resolve(path: str) -> Any:
            # Support nested e.g. user.name
            cur: Any = context
            for part in path.split("."):
                if isinstance(cur, dict) and part in cur:
                    cur = cur[part]
                else:
                    return None
            return cur

        # First handle conditionals
        def repl_cond(m: re.Match[str]) -> str:
            var = m.group(1)
            body = m.group(2)
            val = resolve(var)
            return body if val else ""

        out = COND_IF_RE.sub(repl_cond, template)
        used: List[str] = []

        # Then handle variables
        def repl_var(m: re.Match[str]) -> str:
            var = m.group(1)
            used.append(var)
            val = resolve(var)
            if val is None:
                return ""
            if isinstance(val, (int, float)):
                return str(val)
            return str(val)

        out = VAR_RE.sub(repl_var, out)
        return RenderResult(text=out.strip(), variables_used=used)

    # 2) AI suggestion to add to or influence the template
    async def get_contextual_suggestion(
        self,
        db: AsyncSession,
        *,
        channel_id: str,
        comment: Dict[str, Any],
        video: Dict[str, Any],
    ) -> Optional[str]:
        prompt = (
            "Provide a short suggestion (<= 1 sentence) to improve a YouTube reply based on comment and video context.\n"
            f"Comment: {comment.get('text','')}\n"
            f"Video title: {video.get('title','')} | Type: {video.get('type','')}\n"
            "Return just the sentence without quotes."
        )
        return await self._ai.generate_response(
            db=db,
            channel_id=channel_id,
            comment_text=prompt,
            channel_name=str(video.get("channel_name", "")),
            video_title=str(video.get("title", "Template Suggestion")),
        )

    # 3) Select best template (defaults + channel overrides + rule-specific)
    async def select_template(
        self,
        db: AsyncSession,
        *,
        rule: Dict[str, Any],
        comment_classification: str,
        channel_id: Optional[str] = None,
    ) -> Optional[str]:
        # Rule-level template takes precedence
        t = (((rule or {}).get("action") or {}).get("config") or {}).get("template")
        if isinstance(t, str) and t.strip():
            return t
        # Channel-specific templates from response_templates
        template = await self._load_channel_template(db, classification=comment_classification, channel_id=channel_id)
        if template:
            return template
        # Fallback defaults (reuse template_responses pool)
        try:
            from app.services.template_responses import TEMPLATES
            pool = TEMPLATES.get(comment_classification, [])
            if pool:
                import random
                return random.choice(pool)
        except Exception:
            pass
        return None

    async def _load_channel_template(self, db: AsyncSession, *, classification: str, channel_id: Optional[str]) -> Optional[str]:
        if not channel_id:
            return None
        # Heuristic: select most-used or highest performance_score
        q = text(
            """
            SELECT template_text
            FROM response_templates
            WHERE (variables->>'classification') = :cls OR :cls IS NULL
            ORDER BY performance_score DESC NULLS LAST, usage_count DESC NULLS LAST
            LIMIT 1
            """
        )
        try:
            row = (await db.execute(q, {"cls": classification})).first()
            return row[0] if row else None
        except Exception:
            return None

    # 4) Validate template variables
    def validate_template(self, template: str) -> Tuple[bool, List[str]]:
        vars_found = set(VAR_RE.findall(template))
        invalid = [v for v in vars_found if v.split(".")[0] not in ALLOWED_VARS]
        return (len(invalid) == 0), invalid

    # 6) Track performance and usage
    async def track_template_usage(
        self,
        db: AsyncSession,
        *,
        template_id: Optional[str],
        rule_id: Optional[str],
        comment_id: Optional[str],
        engagement: Optional[Dict[str, Any]] = None,
    ) -> None:
        try:
            if template_id:
                await db.execute(
                    text("UPDATE response_templates SET usage_count = usage_count + 1 WHERE id = :tid"),
                    {"tid": template_id},
                )
            if engagement is not None:
                await db.execute(
                    text(
                        """
                        INSERT INTO ab_test_results (rule_id, variant_id, comment_id, engagement_metrics, created_at)
                        VALUES (:rid, :vid, :cid, :metrics::jsonb, now())
                        """
                    ),
                    {
                        "rid": rule_id,
                        "vid": template_id or "default",
                        "cid": comment_id,
                        "metrics": engagement or {},
                    },
                )
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

