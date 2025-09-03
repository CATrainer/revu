from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ab_testing import ABTestingService
from app.services.auto_learning import AutoLearningService


class ABTestMonitorService:
    """
    Scans active A/B tests and generates suggestions when:
    - A statistically significant winner is found (p <= 0.05, min samples per variant).
    - A clearly poor variant should be paused (significantly worse than best).

    Suggestions are written into auto_learning_suggestions (require_approval=True),
    so users are notified via existing NotificationCenter and can one-click queue
    an approval to apply changes. No changes are auto-applied here.
    """

    def __init__(self) -> None:
        self._abs = ABTestingService()
        self._als = AutoLearningService()

    async def _list_rules_with_tests(self, db: AsyncSession) -> List[Tuple[str, Dict[str, Any]]]:
        rows = (
            await db.execute(
                text("SELECT id, action FROM automation_rules ORDER BY updated_at DESC NULLS LAST")
            )
        ).mappings().all()
        out: List[Tuple[str, Dict[str, Any]]] = []
        for r in rows:
            rid = str(r.get("id"))
            action = r.get("action")
            try:
                action = action if isinstance(action, dict) else (json.loads(action) if action else {})
            except Exception:
                action = {}
            tests = (action or {}).get("ab_tests") or {}
            if tests:
                out.append((rid, action or {}))
        return out

    @staticmethod
    def _pick_metric(stats: Dict[str, Dict[str, Any]]) -> str:
        # Prefer CTR if any impressions else avg_engagement
        use_ctr = any(int((s or {}).get("impressions", 0)) > 0 for s in stats.values())
        return "ctr" if use_ctr else "avg_engagement"

    @staticmethod
    def _calc_uplift(a: float, b: float) -> float:
        if b == 0:
            return float("inf") if a > 0 else 0.0
        return (a - b) / max(1e-9, b)

    async def _pending_suggestion_exists(self, db: AsyncSession, *, rule_id: str, test_id: str, stype: str) -> bool:
        try:
            row = (
                await db.execute(
                    text(
                        """
                        SELECT 1
                        FROM auto_learning_suggestions
                        WHERE rule_id = :rid
                          AND suggestion_type = :stype
                          AND status = 'pending'
                          AND (after->'_meta'->>'test_id') = :tid
                        LIMIT 1
                        """
                    ),
                    {"rid": rule_id, "stype": stype, "tid": test_id},
                )
            ).first()
            return bool(row)
        except Exception:
            return False

    async def scan_and_generate_suggestions(
        self,
        db: AsyncSession,
        *,
        min_samples_per_variant: int = 50,
        significance_threshold: float = 0.05,
    ) -> Dict[str, Any]:
        await self._als._ensure_tables(db)  # best-effort create suggestion tables
        results: Dict[str, Any] = {"processed": 0, "suggestions": 0}

        rules = await self._list_rules_with_tests(db)
        for rule_id, action in rules:
            tests: Dict[str, List[Dict[str, Any]]] = (action or {}).get("ab_tests") or {}
            if not tests:
                continue
            try:
                analysis = await self._abs.calculate_winner(
                    db,
                    rule_id=rule_id,
                    min_samples_per_variant=min_samples_per_variant,
                )
            except Exception:
                continue

            for tid, res in (analysis or {}).items():
                stats = (res or {}).get("stats") or {}
                if not stats:
                    continue
                metric_key = res.get("metric") or self._pick_metric(stats)
                winner = res.get("winner")
                runner_up = res.get("runner_up")
                p_value = float(res.get("p_value", 1.0) or 1.0)
                confidence = 1 - p_value if p_value is not None else None

                # Only consider variants with enough samples
                eligible = {v: s for v, s in stats.items() if int((s or {}).get("n", 0)) >= min_samples_per_variant}
                if len(eligible) < 2:
                    continue

                # Winner suggestion at 95% confidence
                if winner and p_value <= significance_threshold and runner_up:
                    # Avoid duplicates
                    if await self._pending_suggestion_exists(db, rule_id=rule_id, test_id=tid, stype="ab_test_winner"):
                        continue

                    w_val = float((eligible.get(winner) or {}).get(metric_key, 0.0))
                    r_val = float((eligible.get(runner_up) or {}).get(metric_key, 0.0))
                    uplift = self._calc_uplift(w_val, r_val)
                    try:
                        uplift_pct = round(uplift * 100, 1)
                    except Exception:
                        uplift_pct = 0.0

                    # Build after: set winner to 1.0, others to 0, but preserve variant defs
                    new_action = dict(action or {})
                    ab_tests = dict((new_action.get("ab_tests") or {}))
                    var_defs = [dict(v) for v in (ab_tests.get(tid) or [])]
                    if not var_defs:
                        continue
                    for v in var_defs:
                        v_id = str(v.get("variant_id") or "A")
                        v["weight"] = 1.0 if v_id == winner else 0.0
                    ab_tests[tid] = var_defs
                    new_action["ab_tests"] = ab_tests

                    # Describe suggestion
                    title = f"We found a winner! Variant {winner} performs better"
                    # Include sample sizes and confidence in why/explanation
                    def _samples_line() -> str:
                        parts: List[str] = []
                        for v, s in eligible.items():
                            parts.append(f"{v}: n={int(s.get('n', 0))}")
                        return ", ".join(parts)

                    why = (
                        f"Test '{tid}': Winner {winner} vs {runner_up}. "
                        f"Uplift {uplift_pct}% on {metric_key}. "
                        f"Confidence {(confidence*100):.1f}% (p={p_value:.4f}). "
                        f"Samples: {_samples_line()}"
                    )
                    explanation = "Switch weights to the winning variant. The losing variant is preserved for easy revert."

                    after_payload = {
                        "action": {"ab_tests": {tid: var_defs}},
                        "_meta": {
                            "test_id": tid,
                            "suggestion_type": "ab_test_winner",
                            "confidence": confidence,
                            "winner": winner,
                            "runner_up": runner_up,
                            "uplift_pct": uplift_pct,
                            "metric": metric_key,
                        },
                    }
                    before_payload = {"action": action}

                    sid = await self._als._log_suggestion(
                        db,
                        suggestion_type="ab_test_winner",
                        rule_id=rule_id,
                        before=before_payload,
                        after=after_payload,
                        explanation=explanation,
                        why=why,
                        require_approval=True,
                    )
                    if sid:
                        results["suggestions"] += 1

                # Poor variant pause suggestion: find worst vs best with significance
                # Identify best and worst by metric among eligible
                try:
                    best_v = max(eligible.items(), key=lambda kv: kv[1][metric_key])[0]
                    worst_v = min(eligible.items(), key=lambda kv: kv[1][metric_key])[0]
                except Exception:
                    best_v = None
                    worst_v = None

                if best_v and worst_v and best_v != worst_v:
                    # Compute p-value between best and worst
                    if metric_key == "ctr":
                        from app.services.ab_testing import ABTestingService as _ABS
                        pval_bw = _ABS._two_proportion_p_value(  # type: ignore
                            int(eligible[best_v]["conversions"]), int(eligible[best_v]["impressions"]),
                            int(eligible[worst_v]["conversions"]), int(eligible[worst_v]["impressions"]),
                        )
                    else:
                        a = []
                        b = []
                        # We don't have raw per-event engagement here; skip if unavailable
                        # The calculator uses rows, but here we'll approximate using means -> cannot test; skip
                        pval_bw = None

                    if pval_bw is not None and pval_bw <= significance_threshold:
                        # Suggest pausing worst variant
                        if await self._pending_suggestion_exists(db, rule_id=rule_id, test_id=tid, stype="ab_variant_pause"):
                            continue
                        new_action = dict(action or {})
                        ab_tests = dict((new_action.get("ab_tests") or {}))
                        var_defs = [dict(v) for v in (ab_tests.get(tid) or [])]
                        if not var_defs:
                            continue
                        for v in var_defs:
                            if str(v.get("variant_id") or "") == str(worst_v):
                                v["weight"] = 0.0
                        ab_tests[tid] = var_defs
                        new_action["ab_tests"] = ab_tests

                        why = (
                            f"Test '{tid}': Variant {worst_v} performs significantly worse than {best_v} on {metric_key}. "
                            f"Confidence {(1-pval_bw)*100:.1f}% (p={pval_bw:.4f})."
                        )
                        explanation = "Pause the underperforming variant by setting its weight to 0%."
                        after_payload = {
                            "action": {"ab_tests": {tid: var_defs}},
                            "_meta": {"test_id": tid, "suggestion_type": "ab_variant_pause", "worst": worst_v, "best": best_v, "metric": metric_key, "confidence": (1 - pval_bw)},
                        }
                        before_payload = {"action": action}
                        sid = await self._als._log_suggestion(
                            db,
                            suggestion_type="ab_variant_pause",
                            rule_id=rule_id,
                            before=before_payload,
                            after=after_payload,
                            explanation=explanation,
                            why=why,
                            require_approval=True,
                        )
                        if sid:
                            results["suggestions"] += 1

                # Suggest follow-up test when close but not significant
                if winner and runner_up and (p_value is not None) and (significance_threshold < p_value <= 0.2):
                    # Avoid duplicates
                    if await self._pending_suggestion_exists(db, rule_id=rule_id, test_id=tid, stype="ab_test_follow_up"):
                        continue
                    why = (
                        f"Test '{tid}': Results are close (winner {winner} vs {runner_up}) but not yet significant. "
                        f"Confidence {(1-p_value)*100:.1f}%. Consider extending the test or trying a new variant."
                    )
                    explanation = "Consider creating a tie-breaker variant or extending the sample size."
                    after_payload = {"action": {}, "_meta": {"test_id": tid, "suggestion_type": "ab_test_follow_up", "winner": winner, "runner_up": runner_up, "p_value": p_value}}
                    before_payload = {"action": action}
                    sid = await self._als._log_suggestion(
                        db,
                        suggestion_type="ab_test_follow_up",
                        rule_id=rule_id,
                        before=before_payload,
                        after=after_payload,
                        explanation=explanation,
                        why=why,
                        require_approval=False,
                    )
                    if sid:
                        results["suggestions"] += 1

            results["processed"] += 1

        return results
