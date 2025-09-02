from __future__ import annotations

import json
import re
import uuid
import difflib
from collections import Counter
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class EditPattern:
    type: str  # e.g., tone/length/specificity
    count: int


class AutomationLearningService:
    """
    Learns from user edits to improve rules and templates.
    Stores edits in table `user_edits` with lightweight metrics for analysis.
    """

    async def _ensure_tables(self, db: AsyncSession) -> None:
        await db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_edits (
                  id VARCHAR PRIMARY KEY,
                  rule_id UUID NULL,
                  response_id VARCHAR NULL,
                  template_id VARCHAR NULL,
                  original_text TEXT NOT NULL,
                  edited_text TEXT NOT NULL,
                  metrics JSONB NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS ix_user_edits_rule ON user_edits(rule_id);
                CREATE INDEX IF NOT EXISTS ix_user_edits_template ON user_edits(template_id);
                CREATE INDEX IF NOT EXISTS ix_user_edits_response ON user_edits(response_id);
                """
            )
        )

    # 6) Identify common edit types (tone, length, specificity)
    @staticmethod
    def detect_edit_types(original: str, edited: str) -> List[str]:
        types: List[str] = []
        # Length change
        if len(edited) != len(original):
            types.append("length")
        # Tone heuristics
        tone_signals_added = ["please", "thank", "thanks", "appreciate", "would you", "could you", ":)", "🙏", "!" ]
        tone_signals_removed = ["!!!", "ALL CAPS", "! !", "?!"]
        o_low, e_low = original.lower(), edited.lower()
        added_polite = any(s in e_low and s not in o_low for s in tone_signals_added)
        removed_harsh = any(s in original and s not in edited for s in tone_signals_removed)
        caps_reduction = sum(1 for c in original if c.isupper()) > sum(1 for c in edited if c.isupper())
        if added_polite or removed_harsh or caps_reduction:
            types.append("tone")
        # Specificity heuristics: more numbers/links/quotes
        url_re = re.compile(r"https?://|www\.")
        nums_o = len(re.findall(r"\d", original))
        nums_e = len(re.findall(r"\d", edited))
        urls_o = len(url_re.findall(original))
        urls_e = len(url_re.findall(edited))
        quotes_o = original.count('"') + original.count("'")
        quotes_e = edited.count('"') + edited.count("'")
        if (nums_e > nums_o) or (urls_e > urls_o) or (quotes_e > quotes_o):
            types.append("specificity")
        return types

    @staticmethod
    def _diff_ratio(a: str, b: str) -> float:
        return difflib.SequenceMatcher(a=a, b=b).ratio()

    @staticmethod
    def _top_tokens_from_diff(original: str, edited: str, *, added: bool, top_n: int = 10) -> List[Tuple[str, int]]:
        # Token-level additions/removals using ndiff
        toks_added: Counter[str] = Counter()
        toks_removed: Counter[str] = Counter()
        for token in difflib.ndiff(original.split(), edited.split()):
            if token.startswith("+ "):
                toks_added[token[2:]] += 1
            elif token.startswith("- "):
                toks_removed[token[2:]] += 1
        c = toks_added if added else toks_removed
        # Filter out trivial tokens
        items = [(t, n) for t, n in c.items() if len(t) >= 3]
        items.sort(key=lambda x: x[1], reverse=True)
        return items[:top_n]

    # 1) Track user edits
    async def record_edit(
        self,
        db: AsyncSession,
        *,
        original: str,
        edited: str,
        rule_id: Optional[str] = None,
        response_id: Optional[str] = None,
        template_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        await self._ensure_tables(db)
        types = self.detect_edit_types(original, edited)
        metrics = {
            "types": types,
            "length_delta": len(edited) - len(original),
            "diff_ratio": self._diff_ratio(original, edited),
            "meta": meta or {},
        }
        row_id = str(uuid.uuid4())
        await db.execute(
            text(
                """
                INSERT INTO user_edits (id, rule_id, response_id, template_id, original_text, edited_text, metrics, created_at)
                VALUES (:id, :rid, :resp, :tid, :o, :e, :m::jsonb, now())
                """
            ),
            {
                "id": row_id,
                "rid": rule_id,
                "resp": response_id,
                "tid": template_id,
                "o": original,
                "e": edited,
                "m": json.dumps(metrics),
            },
        )
        await db.commit()
        return {"saved": True, "id": row_id, "types": types, "metrics": metrics}

    # 2) Analyze edits for a rule to find patterns
    async def analyze_edits(self, db: AsyncSession, *, rule_id: str) -> Dict[str, Any]:
        await self._ensure_tables(db)
        rows = (
            await db.execute(
                text(
                    """
                    SELECT original_text, edited_text, metrics
                    FROM user_edits
                    WHERE rule_id = :rid
                    ORDER BY created_at DESC
                    LIMIT 1000
                    """
                ),
                {"rid": rule_id},
            )
        ).mappings().all()
        if not rows:
            return {"total": 0, "edit_types": {}, "avg_length_delta": 0.0, "top_added": [], "top_removed": []}

        type_counter: Counter[str] = Counter()
        total_len_delta = 0
        added_counter: Counter[str] = Counter()
        removed_counter: Counter[str] = Counter()
        for r in rows:
            o = r.get("original_text") or ""
            e = r.get("edited_text") or ""
            m = r.get("metrics") or {}
            for t in (m.get("types") or []):
                type_counter[str(t)] += 1
            total_len_delta += int(m.get("length_delta", len(e) - len(o)))
            for tok, n in self._top_tokens_from_diff(o, e, added=True, top_n=20):
                added_counter[tok] += n
            for tok, n in self._top_tokens_from_diff(o, e, added=False, top_n=20):
                removed_counter[tok] += n

        top_added = added_counter.most_common(10)
        top_removed = removed_counter.most_common(10)
        return {
            "total": len(rows),
            "edit_types": dict(type_counter),
            "avg_length_delta": (total_len_delta / max(1, len(rows))),
            "top_added": top_added,
            "top_removed": top_removed,
        }

    # 3) Suggest improvements to rules based on patterns
    async def suggest_rule_improvements(self, db: AsyncSession, *, rule_id: str) -> Dict[str, Any]:
        analysis = await self.analyze_edits(db, rule_id=rule_id)
        suggestions: List[str] = []
        types = analysis.get("edit_types", {})
        total = max(1, int(analysis.get("total", 0)))
        # thresholds
        tone_rate = types.get("tone", 0) / total
        length_rate = types.get("length", 0) / total
        spec_rate = types.get("specificity", 0) / total
        if tone_rate >= 0.25:
            suggestions.append("Adjust response tone to be more polite/empathetic. Consider adding greetings or thanks.")
        if length_rate >= 0.25:
            if analysis.get("avg_length_delta", 0) < 0:
                suggestions.append("Make responses more concise by default; reduce redundant phrases.")
            else:
                suggestions.append("Provide slightly more context in responses; add clarifying details.")
        if spec_rate >= 0.25:
            suggestions.append("Increase specificity: include links, numbers, or concrete steps when relevant.")

        # Phrase suggestions from top_added
        phrase_adds = [tok for tok, n in (analysis.get("top_added") or []) if n >= 3 and len(tok) <= 40]
        if phrase_adds:
            suggestions.append("Frequently added phrases detected: " + ", ".join(phrase_adds[:5]))

        # Provide a compact payload
        return {
            "rule_id": rule_id,
            "suggestions": suggestions,
            "metrics": {
                "tone_rate": tone_rate,
                "length_rate": length_rate,
                "specificity_rate": spec_rate,
            },
            "analysis": analysis,
        }

    # 4) Update templates from feedback (safe, conservative)
    async def update_templates_from_feedback(
        self,
        db: AsyncSession,
        *,
        min_samples: int = 20,
        adoption_threshold: float = 0.7,
    ) -> Dict[str, Any]:
        """
        For each template, if a short phrase (<= 40 chars) is added in >= adoption_threshold of edits,
        append it to the template (once). Conservative heuristic.
        """
        await self._ensure_tables(db)
        # Find templates with edits
        rows = (
            await db.execute(
                text(
                    """
                    SELECT template_id,
                           COUNT(*) AS n,
                           jsonb_agg(jsonb_build_object('o', original_text, 'e', edited_text) ORDER BY created_at DESC) AS pairs
                    FROM user_edits
                    WHERE template_id IS NOT NULL
                    GROUP BY template_id
                    HAVING COUNT(*) >= :min
                    """
                ),
                {"min": int(min_samples)},
            )
        ).mappings().all()
        changed: List[str] = []
        for r in rows:
            tid = r.get("template_id")
            if not tid:
                continue
            pairs = r.get("pairs") or []
            add_counter: Counter[str] = Counter()
            total = 0
            for p in pairs:
                o, e = (p or {}).get("o", ""), (p or {}).get("e", "")
                total += 1
                for tok, n in self._top_tokens_from_diff(o, e, added=True, top_n=50):
                    if 3 <= len(tok) <= 40:
                        add_counter[tok] += n
            if total <= 0:
                continue
            # Consider top candidate
            candidate, count = (add_counter.most_common(1)[0] if add_counter else (None, 0))
            if not candidate:
                continue
            # Approx adoption rate: how often the token appears across edits
            adoption = count / max(1, total)
            if adoption < adoption_threshold:
                continue
            # Fetch template text
            trow = (
                await db.execute(text("SELECT template_text FROM response_templates WHERE id = :id"), {"id": tid})
            ).first()
            if not trow:
                continue
            ttext: str = trow[0] or ""
            if candidate in ttext:
                continue
            # Append as suffix with spacing
            new_text = (ttext.rstrip() + (" " if not ttext.endswith(" ") else "") + candidate).strip()
            try:
                await db.execute(
                    text("UPDATE response_templates SET template_text = :t, updated_at = now() WHERE id = :id"),
                    {"t": new_text, "id": tid},
                )
                await db.commit()
                changed.append(str(tid))
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass
        return {"updated_templates": changed}

    # 5) Calculate response quality score
    async def calculate_response_quality_score(self, db: AsyncSession, *, response_id: str) -> Dict[str, Any]:
        """
        Combine edit burden (more edits -> lower) and engagement metrics (higher -> better) into a 0..1 score.
        """
        await self._ensure_tables(db)
        # Edits burden
        erow = (
            await db.execute(
                text(
                    """
                    SELECT COUNT(*) AS n, AVG(COALESCE((metrics->>'diff_ratio')::float, 0.0)) AS avg_diff
                    FROM user_edits WHERE response_id = :rid
                    """
                ),
                {"rid": response_id},
            )
        ).first()
        edit_count = int(erow[0]) if erow and erow[0] is not None else 0
        avg_diff = float(erow[1]) if erow and erow[1] is not None else 0.0
        # Engagement from ab_test_results if available
        arow = (
            await db.execute(
                text("SELECT engagement_metrics FROM ab_test_results WHERE comment_id = :cid ORDER BY created_at DESC LIMIT 1"),
                {"cid": response_id},
            )
        ).first()
        metrics = (arow[0] if arow else {}) or {}
        conversions = int(metrics.get("conversions", 0)) if isinstance(metrics, dict) else 0
        impressions = int(metrics.get("impressions", 0)) if isinstance(metrics, dict) else 0
        ctr = (conversions / impressions) if impressions > 0 else 0.0
        # Normalize components
        # More edits and higher diff -> lower text score
        edit_penalty = 1.0 / (1.0 + 0.5 * edit_count + 2.0 * max(0.0, 1.0 - avg_diff))
        text_score = max(0.1, min(1.0, 0.7 * edit_penalty + 0.3 * avg_diff))
        ctr_score = max(0.0, min(1.0, ctr))
        score = 0.5 * text_score + 0.5 * ctr_score
        return {
            "response_id": response_id,
            "score": round(score, 4),
            "components": {
                "text_score": round(text_score, 4),
                "ctr_score": round(ctr_score, 4),
                "edit_count": edit_count,
                "avg_diff": round(avg_diff, 4),
                "conversions": conversions,
                "impressions": impressions,
            },
        }
