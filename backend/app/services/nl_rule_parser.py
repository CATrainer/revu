from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import json
import os

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.claude_service import ClaudeService


RULE_SCHEMA_HINT = {
    "conditions": {
        "classification": "optional string (e.g., question, feedback, spam)",
        "keywords": ["optional list of strings"],
        "author_status": "optional string: owner|subscriber|new|any",
    },
    "action": {
        "type": "generate_response|delete_comment|flag_for_review",
        "config": {
            "template": "optional string",
            "max_length": "optional int"
        }
    },
    "limits": {
        "per_minute": "optional int",
        "per_hour": "optional int",
        "per_day": "optional int",
        "per_video": "optional int",
        "concurrent": "optional int"
    },
    "require_approval": "optional bool",
    "timing": {
        "timezone": "optional IANA tz name (e.g., America/Los_Angeles)",
        "days_of_week": "optional list of ints 0..6 (Mon=0)",
        "hours": "optional list of {start:int,end:int} in local time",
        "delay_seconds": {"min": "int", "max": "int"}
    },
    "scope": {
        "video_age_days": {"min": "int", "max": "int"}
    }
}

COMMON_PATTERNS = [
    {
        "name": "Respond to questions with helpful reply",
        "nl": "When a comment is a question, reply helpfully within 2 sentences.",
        "rule": {
            "conditions": {"classification": "question"},
            "action": {"type": "generate_response", "config": {"max_length": 240}},
            "limits": {"per_minute": 5, "per_hour": 50},
        },
    },
    {
        "name": "Flag likely spam",
        "nl": "If comment mentions giveaway or free crypto, flag for review.",
        "rule": {
            "conditions": {"keywords": ["giveaway", "free crypto", "airdrop"]},
            "action": {"type": "flag_for_review"},
            "limits": {"per_minute": 30},
        },
    },
    {
        "name": "Hide toxic comments",
        "nl": "Delete negative or insulting comments.",
        "rule": {
            "conditions": {"classification": "toxic"},
            "action": {"type": "delete_comment"},
            "limits": {"per_minute": 10, "per_hour": 100},
        },
    },
]


@dataclass
class ParseResult:
    rule: Dict[str, Any]
    improvements: Optional[List[str]] = None


class NaturalLanguageRuleParser:
    """
    Converts natural language instructions into a structured automation rule.
    - parse_user_input(text): asks Claude to produce structured JSON matching RULE_SCHEMA_HINT
    - suggest_improvements(rule): asks Claude to suggest optimizations or safer defaults
    - validate_rule(rule): basic schema validation for required/allowed fields
    """

    def __init__(self) -> None:
        self._claude = ClaudeService()

    async def parse_user_input(self, db: AsyncSession, *, channel_id: str, text_input: str) -> ParseResult:
        system = (
            "You convert natural language rule requests into STRICT JSON for an automation system. "
            "Output only JSON, no prose. Use fields present in the provided schema."
        )
        examples = {
            "schema": RULE_SCHEMA_HINT,
            "patterns": COMMON_PATTERNS,
        }
        prompt = (
            "Given the following examples and schema, convert the user's instruction into a rule.\n"
            f"User instruction: {text_input}\n\n"
            "Return a JSON with keys: conditions, action, limits, timing, scope, require_approval."
        )
        # Reuse ClaudeService for reliability and logging
        raw = await self._claude.generate_response(
            db=db,
            channel_id=channel_id,
            comment_text=json.dumps({"examples": examples, "prompt": prompt}),
            channel_name="",
            video_title="NL Rule Parser",
        )
        rule: Dict[str, Any] = {}
        if raw:
            try:
                # Extract any JSON object in the output
                m = __import__("re").search(r"\{.*\}", raw, __import__("re").S)
                if m:
                    rule = json.loads(m.group(0))
            except Exception:
                rule = {}
        # Validate and coerce
        rule = self._validate_rule(rule)
        return ParseResult(rule=rule)

    async def suggest_improvements(self, db: AsyncSession, *, channel_id: str, rule: Dict[str, Any]) -> List[str]:
        system = (
            "You analyze automation rules and suggest safe, efficient improvements in a bullet list."
        )
        prompt = (
            "Review the rule JSON and suggest improvements (limits, safer actions, clear timing windows, templates).\n"
            f"Rule: {json.dumps(rule)}\n"
            "Return a JSON array of strings with recommendations."
        )
        raw = await self._claude.generate_response(
            db=db,
            channel_id=channel_id,
            comment_text=prompt,
            channel_name="",
            video_title="NL Rule Suggestions",
        )
        tips: List[str] = []
        if raw:
            try:
                m = __import__("re").search(r"\[.*\]", raw, __import__("re").S)
                if m:
                    tips = json.loads(m.group(0))
            except Exception:
                tips = []
        return tips

    # ---------- validation ----------
    def _validate_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        allowed_actions = {"generate_response", "delete_comment", "flag_for_review"}
        r: Dict[str, Any] = {}
        r["conditions"] = self._sanitize_conditions(rule.get("conditions") or {})
        action = rule.get("action") or {}
        atype = str(action.get("type") or "generate_response")
        if atype not in allowed_actions:
            atype = "generate_response"
        r["action"] = {"type": atype, "config": action.get("config") or {}}
        # numeric limits
        r["limits"] = {k: int(v) for k, v in (rule.get("limits") or {}).items() if self._is_int_like(v)}
        # timing structure
        timing = rule.get("timing") or {}
        tz = timing.get("timezone") or "UTC"
        days = [int(d) for d in (timing.get("days_of_week") or []) if self._is_int_like(d) and 0 <= int(d) <= 6]
        hours = []
        for rng in timing.get("hours") or []:
            try:
                start = int(rng.get("start", 0))
                end = int(rng.get("end", 24))
                if 0 <= start <= 24 and 0 <= end <= 24 and start <= end:
                    hours.append({"start": start, "end": end})
            except Exception:
                pass
        delay = timing.get("delay_seconds") or {}
        delay_sane = {"min": max(0, int(delay.get("min", 0))), "max": max(0, int(delay.get("max", 0)))}
        if delay_sane["max"] < delay_sane["min"]:
            delay_sane["max"] = delay_sane["min"]
        r["timing"] = {"timezone": tz, "days_of_week": days, "hours": hours, "delay_seconds": delay_sane}
        # scope
        scope = rule.get("scope") or {}
        vage = scope.get("video_age_days") or {}
        r["scope"] = {"video_age_days": {"min": int(vage.get("min", 0)), "max": int(vage.get("max", 10**9))}}
        # approval
        r["require_approval"] = bool(rule.get("require_approval", False))
        return r

    def _sanitize_conditions(self, c: Dict[str, Any]) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        cls = c.get("classification")
        if isinstance(cls, str) and cls:
            out["classification"] = cls.strip().lower()
        kws = c.get("keywords") or []
        if isinstance(kws, list):
            out["keywords"] = [str(x).strip() for x in kws if str(x).strip()]
        astatus = c.get("author_status")
        if isinstance(astatus, str) and astatus.lower() in {"owner", "subscriber", "new", "any"}:
            out["author_status"] = astatus.lower()
        return out

    @staticmethod
    def _is_int_like(v: Any) -> bool:
        try:
            int(v)
            return True
        except Exception:
            return False
