from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import os
import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.claude_service import ClaudeService
from app.utils.cache import async_ttl_cache


@dataclass
class EvaluationResult:
    matches: bool
    confidence: float
    matched_conditions: List[int]


class RuleEvaluator:
    """
    Evaluates automation rules against a comment with support for:
    - Built-in conditions: sentiment, subscriber_status, keywords, comment_length, video_age
    - AI condition via Claude (evaluate_ai_condition)
    - Custom boolean logic strings like "(1 AND 2) OR 3" to combine conditions
    - Returns (matches: bool, confidence: float, matched_conditions: list[int])
    - Caches AI evaluations to reduce API calls

    Expected `rule` shape (minimal contract):
      rule.conditions: list[dict]  # each has {type, id/index, ...}
      rule.custom_logic: Optional[str]  # e.g., "(1 AND 2) OR 3"
    `comment` shape (contract): dict with keys: text, author_subscribed (bool), created_at, video_published_at
    `context` shape: optional dict with channel_id, channel_name, video_title
    """

    def __init__(self, *, ai_ttl_seconds: float | None = None) -> None:
        self._claude = ClaudeService()
        # 10 minutes default TTL for AI eval caching
        self._ai_ttl = float(ai_ttl_seconds if ai_ttl_seconds is not None else float(os.getenv("AI_EVAL_TTL_SECONDS", "600")))

    # ---------- Built-in condition evaluators ----------
    @staticmethod
    def _eval_sentiment(comment: Dict[str, Any], cond: Dict[str, Any]) -> Tuple[bool, float]:
        # naive heuristic using provided sentiment tag on comment or simple keywords
        want = (cond.get("value") or "").lower()  # expected: positive|neutral|negative
        cm_sent = (comment.get("sentiment") or "").lower()
        if cm_sent:
            match = cm_sent == want
            return match, 0.9 if match else 0.2
        text = (comment.get("text") or "").lower()
        negative_words = ["hate", "terrible", "awful", "bad"]
        positive_words = ["love", "great", "awesome", "good", "thanks", "thank you"]
        if want == "negative" and any(w in text for w in negative_words):
            return True, 0.6
        if want == "positive" and any(w in text for w in positive_words):
            return True, 0.6
        if want == "neutral" and not any(w in text for w in negative_words + positive_words):
            return True, 0.5
        return False, 0.4

    @staticmethod
    def _eval_subscriber_status(comment: Dict[str, Any], cond: Dict[str, Any]) -> Tuple[bool, float]:
        required = bool(cond.get("value"))  # True means must be subscriber
        is_sub = bool(comment.get("author_subscribed"))
        return (is_sub == required), 0.8 if is_sub == required else 0.2

    @staticmethod
    def _eval_keywords(comment: Dict[str, Any], cond: Dict[str, Any]) -> Tuple[bool, float]:
        # cond: { any: [words], all: [words], none: [words] }
        text = (comment.get("text") or "").lower()
        any_words = [w.lower() for w in (cond.get("any") or [])]
        all_words = [w.lower() for w in (cond.get("all") or [])]
        none_words = [w.lower() for w in (cond.get("none") or [])]
        ok = True
        conf = 0.5
        if any_words:
            ok_any = any(w in text for w in any_words)
            ok = ok and ok_any
            conf += 0.2 if ok_any else -0.2
        if all_words:
            ok_all = all(w in text for w in all_words)
            ok = ok and ok_all
            conf += 0.2 if ok_all else -0.2
        if none_words:
            ok_none = not any(w in text for w in none_words)
            ok = ok and ok_none
            conf += 0.2 if ok_none else -0.2
        return ok, max(0.0, min(1.0, conf))

    @staticmethod
    def _eval_comment_length(comment: Dict[str, Any], cond: Dict[str, Any]) -> Tuple[bool, float]:
        # cond: { op: '>=|>|<=|<|==', value: int }
        text = comment.get("text") or ""
        length = len(text)
        op = cond.get("op", ">=")
        val = int(cond.get("value", 0))
        ops = {
            ">=": length >= val,
            ">": length > val,
            "<=": length <= val,
            "<": length < val,
            "==": length == val,
        }
        ok = bool(ops.get(op, False))
        return ok, 0.7 if ok else 0.3

    @staticmethod
    def _eval_video_age(comment: Dict[str, Any], cond: Dict[str, Any]) -> Tuple[bool, float]:
        # cond: { op, days: int } comparing comment.created_at vs video_published_at
        from datetime import datetime, timezone
        created = comment.get("created_at")
        video_pub = comment.get("video_published_at")
        if not created or not video_pub:
            return False, 0.4
        if isinstance(created, str):
            created = datetime.fromisoformat(created.replace("Z", "+00:00"))
        if isinstance(video_pub, str):
            video_pub = datetime.fromisoformat(video_pub.replace("Z", "+00:00"))
        age_days = (created - video_pub).days
        op = cond.get("op", ">=")
        val = int(cond.get("days", 0))
        ops = {
            ">=": age_days >= val,
            ">": age_days > val,
            "<=": age_days <= val,
            "<": age_days < val,
            "==": age_days == val,
        }
        ok = bool(ops.get(op, False))
        return ok, 0.7 if ok else 0.3

    # ---------- AI condition (cached) ----------
    @async_ttl_cache(ttl_seconds=float(os.getenv("AI_EVAL_TTL_SECONDS", "600")))
    async def evaluate_ai_condition(self, db: AsyncSession, comment: Dict[str, Any], prompt: str, *, channel_id: str, channel_name: str = "", video_title: str = "") -> Tuple[bool, float]:
        """
        Uses Claude to judge if the comment satisfies a complex condition.
        Returns (match: bool, confidence: float [0..1]). Cached by args.
        """
        # Compose a constrained prompt with yes/no and confidence.
        guidance = (
            "You are a classifier. Answer in strict JSON with keys: match (true/false) and confidence (0..1). "
            "Use the provided criteria to judge the comment."
        )
        full_prompt = (
            f"Criteria: {prompt}\n\n"
            f"Comment: {comment.get('text','')}\n"
            "Respond only in JSON."
        )
        text = await self._claude.generate_response(
            db=db,
            channel_id=channel_id,
            comment_text=full_prompt,
            channel_name=channel_name,
            video_title=video_title or "Rule AI Condition",
            from_cache=False,
        )
        # Best-effort parse
        match = False
        conf = 0.5
        if text:
            # Find JSON-like content
            try:
                import json
                m = re.search(r"\{.*\}", text, re.S)
                if m:
                    data = json.loads(m.group(0))
                    match = bool(data.get("match"))
                    conf = float(data.get("confidence", 0.5))
                else:
                    # fallback: keyword scan
                    low = text.lower()
                    match = "yes" in low or "true" in low
                    conf = 0.6 if match else 0.4
            except Exception:
                low = text.lower()
                match = "yes" in low or "true" in low
                conf = 0.6 if match else 0.4
        return match, max(0.0, min(1.0, conf))

    # ---------- Rule evaluation ----------
    async def evaluate_rule(self, db: AsyncSession, rule: Dict[str, Any], comment: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> EvaluationResult:
        """
        Evaluate all conditions and combine via AND/OR/custom logic.
        rule: expects keys 'conditions' (list of dicts) and optional 'logic' (string like "(1 AND 2) OR 3").
        condition dict: { id/index (implicit order), type, ...type-specific keys... }
        """
        conditions: List[Dict[str, Any]] = rule.get("conditions") or []
        logic_str: str = rule.get("logic") or ""

        # Evaluate conditions sequentially and gather results
        bools: List[bool] = []
        confidences: List[float] = []
        for idx, cond in enumerate(conditions, start=1):
            ctype = (cond.get("type") or "").lower()
            ok, conf = False, 0.5
            if ctype == "sentiment":
                ok, conf = self._eval_sentiment(comment, cond)
            elif ctype == "subscriber_status":
                ok, conf = self._eval_subscriber_status(comment, cond)
            elif ctype == "keywords":
                ok, conf = self._eval_keywords(comment, cond)
            elif ctype == "comment_length":
                ok, conf = self._eval_comment_length(comment, cond)
            elif ctype == "video_age":
                ok, conf = self._eval_video_age(comment, cond)
            elif ctype == "ai":
                prompt = cond.get("prompt") or ""
                ch_id = (context or {}).get("channel_id") or ""
                ch_name = (context or {}).get("channel_name") or ""
                v_title = (context or {}).get("video_title") or ""
                ok, conf = await self.evaluate_ai_condition(db, comment, prompt, channel_id=ch_id, channel_name=ch_name, video_title=v_title)
            else:
                # unknown condition type -> treat as non-match with low confidence
                ok, conf = False, 0.3
            bools.append(ok)
            confidences.append(conf)

        # Combine via logic
        matched_ids: List[int] = [i + 1 for i, b in enumerate(bools) if b]
        if not conditions:
            return EvaluationResult(matches=False, confidence=0.5, matched_conditions=[])

        result_bool = self._combine_logic(logic_str, bools)
        # Confidence: weighted average of matched confidences, else min of all
        conf_final = (
            sum(confidences[i - 1] for i in matched_ids) / max(1, len(matched_ids))
            if matched_ids
            else min(confidences) if confidences else 0.5
        )
        return EvaluationResult(matches=result_bool, confidence=round(conf_final, 3), matched_conditions=matched_ids)

    @staticmethod
    def _combine_logic(logic: str, bools: List[bool]) -> bool:
        """
        Supports logic strings like:
        - "" or None: default to AND of all
        - "AND"/"OR" words between numeric condition references
        - Parentheses for grouping
        Example: "(1 AND 2) OR 3". Indexes are 1-based.
        """
        if not logic:
            return all(bools)
        # Replace numbers with booleans
        expr = logic
        # Safety: allow only digits, spaces, parentheses, AND/OR/NOT
        if not re.fullmatch(r"[\d\s()ANDORNOTandornot]+", expr):
            # Fallback to AND
            return all(bools)
        # normalize spacing and case
        expr = expr.replace("and", "AND").replace("or", "OR").replace("not", "NOT")
        # Replace indexes with True/False
        def repl_num(m: re.Match[str]) -> str:
            i = int(m.group(0))
            return "True" if 1 <= i <= len(bools) and bools[i - 1] else "False"
        expr = re.sub(r"\d+", repl_num, expr)
        # Replace logical operators with python equivalents
        expr = re.sub(r"\bAND\b", " and ", expr)
        expr = re.sub(r"\bOR\b", " or ", expr)
        expr = re.sub(r"\bNOT\b", " not ", expr)
        # Evaluate safely with limited builtins
        try:
            return bool(eval(expr, {"__builtins__": {}}, {}))
        except Exception:
            return all(bools)
