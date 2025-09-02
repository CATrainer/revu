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

    # ---------- Conflict detection & validation ----------
    def find_conflicts(self, new_rule: Dict[str, Any], existing_rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze a new rule against existing rules to detect:
        - overlapping conditions (could target the same comments)
        - competing actions (e.g., delete vs generate on overlap)
        - suggest priority adjustments (more specific first)
        - loop risks (e.g., rules that may trigger on bot's own replies)
        - logic validation (invalid references, impossible expressions)

        Returns a report with keys: overlaps, warnings, priority_suggestions, loop_risks, logic_errors, ok.
        """
        report: Dict[str, Any] = {
            "overlaps": [],
            "warnings": [],
            "priority_suggestions": [],
            "loop_risks": [],
            "logic_errors": [],
            "ok": True,
        }

        # Validate new rule logic upfront
        logic_errors = self._validate_logic(new_rule)
        if logic_errors:
            report["logic_errors"] = logic_errors
            report["ok"] = False

        new_cons = self._constraints_from_rule(new_rule)
        new_actions = self._extract_action_types(new_rule)
        new_prio = self._get_priority(new_rule)
        new_specificity = self._specificity_score(new_rule)

        # Loop risk heuristics
        loop_risks = self._detect_loop_risks(new_rule, new_actions)
        if loop_risks:
            report["loop_risks"] = loop_risks
            report["ok"] = False

        for ex in existing_rules or []:
            ex_cons = self._constraints_from_rule(ex)
            if not self._constraints_overlap(new_cons, ex_cons):
                continue

            ex_actions = self._extract_action_types(ex)
            ex_prio = self._get_priority(ex)
            ex_specificity = self._specificity_score(ex)

            competing = self._actions_compete(new_actions, ex_actions)
            overlap_on = self._overlap_dimensions(new_cons, ex_cons)
            severity = "high" if competing else ("medium" if overlap_on else "low")

            report["overlaps"].append({
                "with_rule_id": ex.get("id") or ex.get("rule_id"),
                "name": ex.get("name"),
                "overlap_on": overlap_on,
                "actions": {"new": new_actions, "existing": ex_actions},
                "severity": severity,
            })

            if competing:
                # Suggest more specific first, else by a default action ordering (delete > flag > generate)
                preferred = self._prefer_action_order(new_actions, ex_actions)
                # Higher specificity should get higher priority (execute first)
                new_first = new_specificity > ex_specificity if new_specificity != ex_specificity else preferred == "new"
                if new_first and (new_prio is not None) and (ex_prio is not None) and new_prio <= ex_prio:
                    report["priority_suggestions"].append({
                        "suggestion": f"Increase priority of new rule above '{ex.get('name') or ex.get('id')}'.",
                        "new_rule_priority": ex_prio + 1,
                        "existing_rule_id": ex.get("id") or ex.get("rule_id"),
                        "rationale": "More specific or preferred action should execute first on overlapping comments.",
                    })
                elif (not new_first) and (new_prio is not None) and (ex_prio is not None) and new_prio >= ex_prio:
                    report["priority_suggestions"].append({
                        "suggestion": f"Lower priority of new rule below '{ex.get('name') or ex.get('id')}'.",
                        "new_rule_priority": max(0, ex_prio - 1),
                        "existing_rule_id": ex.get("id") or ex.get("rule_id"),
                        "rationale": "Less specific or non-preferred action should run later to avoid conflicts.",
                    })

            # General warning for any overlap with differing actions
            if competing:
                report["warnings"].append(
                    f"New rule may compete with '{ex.get('name') or ex.get('id')}' on overlapping comments."
                )

        # If any conflicts or errors, not ok
        if report["overlaps"] or report["logic_errors"] or report["loop_risks"]:
            report["ok"] = False

        return report

    # ----- helpers -----
    @staticmethod
    def _get_priority(rule: Dict[str, Any]) -> Optional[int]:
        pr = rule.get("priority")
        if pr is None and isinstance(rule.get("action"), dict):
            pr = rule.get("action", {}).get("priority")
        try:
            return int(pr) if pr is not None else None
        except Exception:
            return None

    @staticmethod
    def _extract_action_types(rule: Dict[str, Any]) -> List[str]:
        # Supports either 'actions': list or single 'action': dict
        acts: List[str] = []
        if isinstance(rule.get("actions"), list):
            for a in rule.get("actions") or []:
                t = (a or {}).get("type")
                if t:
                    acts.append(str(t))
        elif isinstance(rule.get("action"), dict):
            t = (rule.get("action") or {}).get("type")
            if t:
                acts.append(str(t))
        # Normalize to known set when possible
        norm = {
            "generate": "generate_response",
            "reply": "generate_response",
            "respond": "generate_response",
            "delete": "delete_comment",
            "flag": "flag_for_review",
        }
        out = [norm.get(a, a) for a in acts]
        return out or ["generate_response"]  # default

    @staticmethod
    def _prefer_action_order(new_actions: List[str], ex_actions: List[str]) -> str:
        # Fixed preference: delete > flag > generate
        order = {"delete_comment": 3, "flag_for_review": 2, "generate_response": 1}
        def score(acts: List[str]) -> int:
            return max((order.get(a, 0) for a in acts), default=0)
        n, e = score(new_actions), score(ex_actions)
        if n > e:
            return "new"
        if e > n:
            return "existing"
        return "tie"

    @staticmethod
    def _specificity_score(rule: Dict[str, Any]) -> int:
        # Rough heuristic: more conditions and stricter keyword constraints => higher specificity
        cons = rule.get("conditions") or []
        score = len(cons)
        for c in cons:
            if (c.get("type") or "").lower() == "keywords":
                any_w = len(c.get("any") or [])
                all_w = len(c.get("all") or [])
                none_w = len(c.get("none") or [])
                score += all_w * 2 + any_w + none_w
        return score

    @staticmethod
    def _constraints_from_rule(rule: Dict[str, Any]) -> Dict[str, Any]:
        """Extract a simplified constraint model for overlap checks."""
        cons = {
            "sentiment": None,               # str | None
            "subscriber": None,              # bool | None
            "length": (None, None),          # (min, max)
            "video_age": (None, None),       # (min_days, max_days)
            "keywords": {
                "any": set(),
                "all": set(),
                "none": set(),
            },
        }
        for c in rule.get("conditions") or []:
            t = (c.get("type") or "").lower()
            if t == "sentiment":
                v = (c.get("value") or "").lower().strip() or None
                cons["sentiment"] = v
            elif t == "subscriber_status":
                cons["subscriber"] = bool(c.get("value"))
            elif t == "comment_length":
                op = c.get("op", ">=")
                val = int(c.get("value", 0))
                mn, mx = cons["length"]
                if op == ">=":
                    mn = max(mn or val, val)
                elif op == ">":
                    mn = max(mn or (val + 1), val + 1)
                elif op == "<=":
                    mx = min(mx if mx is not None else val, val)
                elif op == "<":
                    mx = min(mx if mx is not None else (val - 1), val - 1)
                elif op == "==":
                    mn = max(mn or val, val)
                    mx = min(mx if mx is not None else val, val)
                cons["length"] = (mn, mx)
            elif t == "video_age":
                op = c.get("op", ">=")
                val = int(c.get("days", 0))
                mn, mx = cons["video_age"]
                if op == ">=":
                    mn = max(mn or val, val)
                elif op == ">":
                    mn = max(mn or (val + 1), val + 1)
                elif op == "<=":
                    mx = min(mx if mx is not None else val, val)
                elif op == "<":
                    mx = min(mx if mx is not None else (val - 1), val - 1)
                elif op == "==":
                    mn = max(mn or val, val)
                    mx = min(mx if mx is not None else val, val)
                cons["video_age"] = (mn, mx)
            elif t == "keywords":
                k = cons["keywords"]
                for w in (c.get("any") or []):
                    k["any"].add(str(w).lower())
                for w in (c.get("all") or []):
                    k["all"].add(str(w).lower())
                for w in (c.get("none") or []):
                    k["none"].add(str(w).lower())
        return cons

    @staticmethod
    def _intervals_intersect(a: Tuple[Optional[int], Optional[int]], b: Tuple[Optional[int], Optional[int]]) -> bool:
        a_min, a_max = a
        b_min, b_max = b
        # Convert None to -inf/inf
        a_min_v = -10**9 if a_min is None else a_min
        a_max_v = 10**9 if a_max is None else a_max
        b_min_v = -10**9 if b_min is None else b_min
        b_max_v = 10**9 if b_max is None else b_max
        return not (a_max_v < b_min_v or b_max_v < a_min_v)

    def _constraints_overlap(self, a: Dict[str, Any], b: Dict[str, Any]) -> bool:
        # Sentiment
        if a["sentiment"] and b["sentiment"] and a["sentiment"] != b["sentiment"]:
            return False
        # Subscriber
        if a["subscriber"] is not None and b["subscriber"] is not None and a["subscriber"] != b["subscriber"]:
            return False
        # Length, video_age intervals
        if not self._intervals_intersect(a["length"], b["length"]):
            return False
        if not self._intervals_intersect(a["video_age"], b["video_age"]):
            return False
        # Keywords contradictions: if either forbids other's required
        if (a["keywords"]["none"] & (b["keywords"]["all"] | b["keywords"]["any"])):
            return False
        if (b["keywords"]["none"] & (a["keywords"]["all"] | a["keywords"]["any"])):
            return False
        # Otherwise, possible overlap
        return True

    @staticmethod
    def _overlap_dimensions(a: Dict[str, Any], b: Dict[str, Any]) -> List[str]:
        dims = []
        if not (a["sentiment"] and b["sentiment"]) or a["sentiment"] == b["sentiment"]:
            dims.append("sentiment")
        if not (a["subscriber"] is not None and b["subscriber"] is not None and a["subscriber"] != b["subscriber"]):
            dims.append("subscriber_status")
        if True:
            dims.append("comment_length")
        if True:
            dims.append("video_age")
        dims.append("keywords")
        return dims

    @staticmethod
    def _actions_compete(a: List[str], b: List[str]) -> bool:
        a_set = set(a)
        b_set = set(b)
        # Consider delete vs generate/flag as competing, and flag vs generate as potentially competing
        if ("delete_comment" in a_set and ("generate_response" in b_set or "flag_for_review" in b_set)):
            return True
        if ("delete_comment" in b_set and ("generate_response" in a_set or "flag_for_review" in a_set)):
            return True
        if ("flag_for_review" in a_set and "generate_response" in b_set):
            return True
        if ("flag_for_review" in b_set and "generate_response" in a_set):
            return True
        return False

    @staticmethod
    def _detect_loop_risks(rule: Dict[str, Any], actions: List[str]) -> List[str]:
        risks: List[str] = []
        # Heuristic: if generating responses without explicit safeguard, warn
        if "generate_response" in actions:
            # Check for a condition that clearly excludes bot-authored comments (not currently a built-in),
            # so suggest adding one.
            risks.append("Rule generates replies but lacks an explicit safeguard to ignore bot-authored comments. Add a condition to exclude own replies.")
            # If keywords condition contains common reply words, warn about self-trigger loops.
            common_reply_tokens = {"thanks", "thank you", "glad", "we", "appreciate", "support"}
            for c in rule.get("conditions") or []:
                if (c.get("type") or "").lower() == "keywords":
                    any_set = {str(w).lower() for w in (c.get("any") or [])}
                    all_set = {str(w).lower() for w in (c.get("all") or [])}
                    if any_set & common_reply_tokens or all_set & common_reply_tokens:
                        risks.append("Keywords include common reply terms; generated messages may re-trigger this rule. Consider adding a 'none' list with those tokens or a self-author exclusion.")
                        break
        return risks

    @staticmethod
    def _validate_logic(rule: Dict[str, Any]) -> List[str]:
        errors: List[str] = []
        logic = rule.get("logic") or ""
        conditions = rule.get("conditions") or []
        n = len(conditions)
        if not logic:
            return errors  # default AND is acceptable
        # Token safety and parentheses balance
        if not re.fullmatch(r"[\d\s()ANDORNOTandornot]+", logic):
            errors.append("Logic contains invalid tokens; only digits, spaces, parentheses, AND/OR/NOT allowed.")
            return errors
        # Parentheses balance
        bal = 0
        for ch in logic:
            if ch == '(': bal += 1
            elif ch == ')': bal -= 1
            if bal < 0:
                errors.append("Unbalanced parentheses in logic.")
                break
        if bal != 0:
            errors.append("Unbalanced parentheses in logic.")
        # Index references must be within [1..n]
        for m in re.finditer(r"\d+", logic):
            i = int(m.group(0))
            if i < 1 or i > n:
                errors.append(f"Logic references condition {i} which does not exist (1..{n}).")
        return errors
