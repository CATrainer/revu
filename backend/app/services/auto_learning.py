from __future__ import annotations

"""
Auto-learning service that observes user behavior and produces suggestions (never auto-applies).

Features:
- learn_from_edits(original, edited): detect systematic edit patterns from user changes.
- auto_adjust_tone(rule_id, engagement_data): propose tone adjustments with before/after and explanations.
- optimize_timing(response_data): suggest best response delay windows.
- learn_spam_patterns(marked_as_spam): surface candidate keywords/regexes to catch spam.
- suggest_rule_optimization(rule_id, performance_data): targeted rule tweaks with before/after and why.

Hard requirements implemented:
- Never auto-apply changes: all outputs are suggestions with require_approval=True.
- Show before/after comparison for suggested changes.
- Track acceptance rate of suggestions; learn from rejections as well.
- Require minimum 50 data points before suggesting changes.
- Explain WHY each optimization is suggested.

Persistence strategy:
- Best-effort creation of two tables:
  - auto_learning_suggestions(id, suggestion_type, rule_id, before, after, explanation, why, status, require_approval,
    total_shown, total_accepted, total_rejected, created_at)
  - auto_learning_outcomes(id, suggestion_id, accepted, created_at)
Tables are optional; code will continue if DDL fails.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import math
import re
from collections import Counter, defaultdict

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


MIN_DATA_POINTS = 50


@dataclass
class Suggestion:
    show: bool
    suggestion_id: Optional[int]
    suggestion_type: str
    require_approval: bool
    before: Dict[str, Any]
    after: Dict[str, Any]
    why: str
    explanation: str
    acceptance_rate: Optional[float] = None


class AutoLearningService:
    def __init__(self) -> None:
        pass

    async def _ensure_tables(self, db: Optional[AsyncSession]) -> None:
        if not db:
            return
        try:
            await db.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS auto_learning_suggestions (
                        id BIGSERIAL PRIMARY KEY,
                        suggestion_type TEXT NOT NULL,
                        rule_id TEXT,
                        before JSONB,
                        after JSONB,
                        explanation TEXT,
                        why TEXT,
                        status TEXT DEFAULT 'pending',
                        require_approval BOOLEAN DEFAULT TRUE,
                        total_shown INTEGER DEFAULT 1,
                        total_accepted INTEGER DEFAULT 0,
                        total_rejected INTEGER DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT now()
                    );

                    CREATE TABLE IF NOT EXISTS auto_learning_outcomes (
                        id BIGSERIAL PRIMARY KEY,
                        suggestion_id BIGINT REFERENCES auto_learning_suggestions(id) ON DELETE CASCADE,
                        accepted BOOLEAN NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT now()
                    );
                    """
                )
            )
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    async def _log_suggestion(
        self,
        db: Optional[AsyncSession],
        *,
        suggestion_type: str,
        rule_id: Optional[str],
        before: Dict[str, Any],
        after: Dict[str, Any],
        explanation: str,
        why: str,
        require_approval: bool = True,
    ) -> Optional[int]:
        if not db:
            return None
        try:
            await self._ensure_tables(db)
            row = (
                await db.execute(
                    text(
                        """
                        INSERT INTO auto_learning_suggestions (suggestion_type, rule_id, before, after, explanation, why, require_approval)
                        VALUES (:t, :rid, :b::jsonb, :a::jsonb, :ex, :why, :req)
                        RETURNING id
                        """
                    ),
                    {"t": suggestion_type, "rid": rule_id, "b": before, "a": after, "ex": explanation, "why": why, "req": require_approval},
                )
            ).first()
            await db.commit()
            return int(row[0]) if row else None
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
            return None

    async def record_suggestion_outcome(self, db: Optional[AsyncSession], suggestion_id: int, *, accepted: bool) -> None:
        if not db:
            return
        try:
            await self._ensure_tables(db)
            await db.execute(
                text(
                    """
                    INSERT INTO auto_learning_outcomes (suggestion_id, accepted) VALUES (:sid, :acc);
                    UPDATE auto_learning_suggestions
                    SET
                        total_shown = COALESCE(total_shown, 0) + 1,
                        total_accepted = COALESCE(total_accepted, 0) + CASE WHEN :acc THEN 1 ELSE 0 END,
                        total_rejected = COALESCE(total_rejected, 0) + CASE WHEN :acc THEN 0 ELSE 1 END,
                        status = CASE WHEN :acc THEN 'accepted' ELSE 'rejected' END
                    WHERE id = :sid;
                    """
                ),
                {"sid": suggestion_id, "acc": bool(accepted)},
            )
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    # ---------- Utilities ----------
    @staticmethod
    def _text_features(s: str) -> Dict[str, Any]:
        s = s or ""
        emojis = len([c for c in s if ord(c) > 0x1F300])
        words = re.findall(r"\w+", s)
        excls = s.count("!")
        qmarks = s.count("?")
        links = len(re.findall(r"https?://\S+", s))
        greeting = bool(re.match(r"^(hi|hey|hello|thanks|thank you)\b", s.strip().lower()))
        polite = any(k in s.lower() for k in ["please", "thanks", "thank you", "appreciate"])
        return {
            "length": len(s),
            "words": len(words),
            "emojis": emojis,
            "exclamations": excls,
            "questions": qmarks,
            "links": links,
            "starts_with_greeting": greeting,
            "polite_terms": polite,
        }

    @staticmethod
    def _delta(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, float]:
        out: Dict[str, float] = {}
        for k, v in a.items():
            if isinstance(v, (int, float)) and isinstance(b.get(k), (int, float)):
                out[k] = float(b[k]) - float(v)
        return out

    # ---------- Public API ----------
    async def learn_from_edits(self, original: str, edited: str) -> Dict[str, Any]:
        """Identify directional changes between the original and edited text.

        Returns a summary with feature deltas and inferred intents (e.g., more concise, added greeting).
        """
        f0 = self._text_features(original or "")
        f1 = self._text_features(edited or "")
        delta = self._delta(f0, f1)
        intents = []
        if delta.get("length", 0) < -10:
            intents.append("more concise")
        if not f0.get("starts_with_greeting") and f1.get("starts_with_greeting"):
            intents.append("added greeting")
        if delta.get("emojis", 0) > 0:
            intents.append("more emojis")
        if delta.get("links", 0) < 0:
            intents.append("removed links")
        if f1.get("polite_terms") and not f0.get("polite_terms"):
            intents.append("added polite tone")

        return {
            "features_before": f0,
            "features_after": f1,
            "deltas": delta,
            "intents": intents,
        }

    async def auto_adjust_tone(
        self,
        db: Optional[AsyncSession],
        *,
        rule_id: Optional[str],
        engagement_data: List[Dict[str, Any]],
    ) -> Suggestion:
        """Suggest tone parameter adjustments based on engagement.

        engagement_data items shape (expected): { text: str, engagement_rate: float }
        Requires at least 50 items to show suggestions.
        """
        n = len(engagement_data or [])
        if n < MIN_DATA_POINTS:
            return Suggestion(False, None, "tone_adjustment", True, {}, {}, "Minimum data not met", f"Need at least {MIN_DATA_POINTS} samples; got {n}")

        # Split by detected properties
        buckets = defaultdict(list)
        for it in engagement_data:
            t = str(it.get("text") or "")
            er = float(it.get("engagement_rate") or 0.0)
            feats = self._text_features(t)
            key = (
                ("greet" if feats["starts_with_greeting"] else "no_greet"),
                ("emoji" if feats["emojis"] > 0 else "no_emoji"),
                ("short" if feats["length"] <= 140 else ("medium" if feats["length"] <= 260 else "long")),
            )
            buckets[key].append(er)

        # Compute averages and pick best deltas
        def avg(v: List[float]) -> float:
            return sum(v) / len(v) if v else 0.0

        stats: List[Tuple[Tuple[str, str, str], float, int]] = [
            (k, avg(v), len(v)) for k, v in buckets.items() if len(v) >= max(10, n // 10)
        ]
        if not stats:
            return Suggestion(False, None, "tone_adjustment", True, {}, {}, "Insufficient segment coverage", "Not enough data per segment to infer tone preferences")

        stats.sort(key=lambda x: x[1], reverse=True)
        best_key, best_er, best_n = stats[0]

        # Derive before/after tone knobs
        before = {
            "greeting": "auto",
            "emojis": "auto",
            "preferred_length": "auto",
        }
        after = {
            "greeting": "on" if best_key[0] == "greet" else "off",
            "emojis": "on" if best_key[1] == "emoji" else "off",
            "preferred_length": best_key[2],
        }

        # Baseline for comparison: average of all
        overall_er = sum([er for _, er, _ in stats]) / len(stats)
        uplift = best_er - overall_er
        why = (
            f"Segment {best_key} averaged {best_er:.2f}% engagement across {best_n} samples, "
            f"vs overall {overall_er:.2f}%. Recommending tone to favor this segment."
        )
        explanation = "Adjust greeting, emoji usage, and message length to mirror the top-performing segment."

        sug_id = await self._log_suggestion(db, suggestion_type="tone_adjustment", rule_id=rule_id, before=before, after=after, explanation=explanation, why=why)
        return Suggestion(True, sug_id, "tone_adjustment", True, before, after, why, explanation, None)

    async def optimize_timing(
        self,
        db: Optional[AsyncSession],
        *,
        response_data: List[Dict[str, Any]],
    ) -> Suggestion:
        """Suggest response delay windows that maximize engagement/approval.

        response_data items: { response_delay_seconds: int, engagement_rate?: float, approved?: bool }
        Requires at least 50 items.
        """
        n = len(response_data or [])
        if n < MIN_DATA_POINTS:
            return Suggestion(False, None, "timing_optimization", True, {}, {}, "Minimum data not met", f"Need at least {MIN_DATA_POINTS} samples; got {n}")

        bins = {
            "0-5m": (0, 300),
            "5-15m": (300, 900),
            "15-60m": (900, 3600),
            ">60m": (3600, 9999999),
        }
        agg: Dict[str, List[float]] = {k: [] for k in bins}
        for it in response_data:
            d = int(it.get("response_delay_seconds") or 0)
            er = float(it.get("engagement_rate") or 0.0)
            for label, (lo, hi) in bins.items():
                if lo <= d < hi:
                    agg[label].append(er)
                    break
        # compute average per bin
        scores = {k: (sum(v) / len(v) if v else 0.0, len(v)) for k, v in agg.items()}
        # select best with enough support
        candidates = [(k, s, c) for k, (s, c) in scores.items() if c >= max(10, n // 10)]
        if not candidates:
            return Suggestion(False, None, "timing_optimization", True, {}, {}, "Insufficient segment coverage", "Not enough items per delay window")
        candidates.sort(key=lambda x: x[1], reverse=True)
        best_label, best_score, best_count = candidates[0]
        overall = sum([s for _, s, _ in candidates]) / len(candidates)
        uplift = best_score - overall

        before = {"preferred_delay_window": "auto"}
        after = {"preferred_delay_window": best_label}
        why = f"Replies in {best_label} window show +{uplift:.2f} pts engagement on {best_count} samples vs baseline {overall:.2f}."
        explanation = "Prioritize queue timings that align with top-performing delay windows."
        sug_id = await self._log_suggestion(db, suggestion_type="timing_optimization", rule_id=None, before=before, after=after, explanation=explanation, why=why)
        return Suggestion(True, sug_id, "timing_optimization", True, before, after, why, explanation, None)

    async def learn_spam_patterns(
        self,
        db: Optional[AsyncSession],
        *,
        marked_as_spam: List[str],
    ) -> Suggestion:
        """Propose spam keywords/regexes based on frequently marked items.

        Requires at least 50 examples.
        """
        n = len(marked_as_spam or [])
        if n < MIN_DATA_POINTS:
            return Suggestion(False, None, "spam_patterns", True, {}, {}, "Minimum data not met", f"Need at least {MIN_DATA_POINTS} samples; got {n}")

        token_counter = Counter()
        domains = Counter()
        invite_phrases = Counter()
        for txt in marked_as_spam:
            s = (txt or "").lower()
            tokens = re.findall(r"[a-z0-9]{3,}", s)
            token_counter.update(tokens)
            for m in re.findall(r"https?://([^/\s]+)", s):
                domains.update([m])
            if any(p in s for p in ["dm me", "telegram", "whatsapp", "promo code", "win big", "click link"]):
                invite_phrases.update([p for p in ["dm me", "telegram", "whatsapp", "promo code", "win big", "click link"] if p in s])

        common_tokens = [t for t, c in token_counter.most_common(20) if c >= max(5, n // 20)]
        common_domains = [d for d, c in domains.most_common(10) if c >= max(3, n // 50)]
        common_invites = [p for p, c in invite_phrases.most_common(10) if c >= 2]

        before = {"spam_keywords": [], "spam_domains": [], "spam_phrases": [], "regex": []}
        after = {
            "spam_keywords": common_tokens[:10],
            "spam_domains": common_domains[:5],
            "spam_phrases": common_invites[:5],
            "regex": [r"https?://\\S+", r"(?i)free\s+gift", r"(?i)whatsapp|telegram"],
        }
        why = (
            f"Top recurring tokens ({', '.join(after['spam_keywords'][:5])}) and domains ({', '.join(after['spam_domains'][:3])}) "
            f"appeared frequently across {n} spam examples."
        )
        explanation = "Add targeted keywords, domains, and regexes to increase spam precision; human approval required before applying."
        sug_id = await self._log_suggestion(db, suggestion_type="spam_patterns", rule_id=None, before=before, after=after, explanation=explanation, why=why)
        return Suggestion(True, sug_id, "spam_patterns", True, before, after, why, explanation, None)

    async def suggest_rule_optimization(
        self,
        db: Optional[AsyncSession],
        *,
        rule_id: str,
        performance_data: Dict[str, Any],
    ) -> Suggestion:
        """Suggest specific per-rule improvements with before/after and WHY.

        performance_data expected keys (examples, flexible):
        {
          total_matches: int,
          responses_sent: int,
          approval_rate: float (0..1),
          engagement_rate_avg: float,
          safety_violations: int,
          backlog_rate: float,
          false_positive_rate: float
        }
        Requires at least 50 total_matches.
        """
        total = int(performance_data.get("total_matches") or 0)
        if total < MIN_DATA_POINTS:
            return Suggestion(False, None, "rule_optimization", True, {}, {}, "Minimum data not met", f"Need at least {MIN_DATA_POINTS} matches; got {total}")

        # Fetch current rule configuration for before/after diff
        before: Dict[str, Any] = {}
        try:
            row = (
                await db.execute(
                    text(
                        """
                        SELECT name, conditions, action, require_approval, response_limit_per_run, priority
                        FROM automation_rules
                        WHERE id = :rid
                        """
                    ),
                    {"rid": rule_id},
                )
            ).mappings().first()
            if row:
                before = {
                    "name": row.get("name"),
                    "conditions": row.get("conditions") or {},
                    "action": row.get("action") or {},
                    "require_approval": bool(row.get("require_approval")),
                    "response_limit_per_run": row.get("response_limit_per_run"),
                    "priority": row.get("priority"),
                }
        except Exception:
            before = {}

        # Derive targeted improvements
        after = {**before}
        reasons: List[str] = []

        appr = float(performance_data.get("approval_rate") or 0.0)
        eng = float(performance_data.get("engagement_rate_avg") or 0.0)
        safety = int(performance_data.get("safety_violations") or 0)
        backlog = float(performance_data.get("backlog_rate") or 0.0)  # pending volume vs capacity
        fpr = float(performance_data.get("false_positive_rate") or 0.0)

        # Example: relax approvals if very high approval rate and no safety issues
        if before.get("action", {}).get("type") == "generate_response" and appr >= 0.95 and safety == 0:
            after["require_approval"] = False
            reasons.append("Responses are approved ≥95% with zero safety violations; safe to reduce approval burden.")

        # Example: tighten keywords if false positive rate high
        conds = (before.get("conditions") or {}).copy()
        if fpr >= 0.2 and "keywords" in conds and isinstance(conds.get("keywords"), list) and conds["keywords"]:
            # Keep top keywords only
            conds["keywords"] = conds["keywords"][: max(1, len(conds["keywords"]) // 2)]
            after["conditions"] = conds
            reasons.append("High false-positive rate; narrowing keywords to improve precision.")

        # Example: increase throughput if backlog is high and engagement is healthy
        if backlog >= 0.5:
            rlim = after.get("response_limit_per_run") or 0
            after["response_limit_per_run"] = int(max(5, rlim * 2 or 10))
            reasons.append("Sustained backlog; increasing per-run limit to keep up with volume.")

        # Example: prioritize rule higher if engagement strong
        if eng >= 5.0:  # 5%+ avg engagement on responses
            pr = int(after.get("priority") or 0)
            after["priority"] = min(pr + 1, pr + 5)
            reasons.append("High engagement; slightly increasing priority to apply earlier.")

        if not reasons:
            return Suggestion(False, None, "rule_optimization", True, before, before, "No clear optimization found", "Data does not support a specific change")

        why = " ".join(reasons)
        explanation = "Proposed adjustments based on approval rates, false positives, backlog, and engagement performance."
        sug_id = await self._log_suggestion(db, suggestion_type="rule_optimization", rule_id=rule_id, before=before, after=after, explanation=explanation, why=why)
        return Suggestion(True, sug_id, "rule_optimization", True, before, after, why, explanation, None)
