from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class Variant:
    variant_id: str
    weight: float
    template_id: Optional[str] = None


class ABTestingService:
    """
    A/B testing utilities for response optimization.

    Expected rule.action JSON shape (example):
    {
      "ab_tests": {
         "default": [
            {"variant_id": "A", "weight": 0.5, "template_id": "<uuid-or-null>"},
            {"variant_id": "B", "weight": 0.5, "template_id": "<uuid-or-null>"}
         ],
         "alt": [ ... ]
      }
    }

    We encode variant keys as "{test_id}::{variant_id}" when tracking.
    """

    # 1) Randomly assign based on weights
    def select_variant(self, rule: Dict[str, Any], *, test_id: Optional[str] = None, rng: Optional[random.Random] = None) -> str:
        action = (rule or {}).get("action") or (rule or {}).get("actions") or {}
        tests: Dict[str, List[Dict[str, Any]]] = action.get("ab_tests") or {}
        if not tests:
            return "default::A"
        # choose test_id
        tid = test_id or (next(iter(tests.keys())) if tests else "default")
        variants = tests.get(tid) or []
        if not variants:
            return f"{tid}::A"
        weights: List[float] = []
        keys: List[str] = []
        for v in variants:
            keys.append(str(v.get("variant_id") or "A"))
            try:
                w = float(v.get("weight", 0))
            except Exception:
                w = 0.0
            weights.append(max(0.0, w))
        total = sum(weights) or 0.0
        if total <= 0:
            # uniform fallback
            idx = (rng or random).randrange(len(keys))
            return f"{tid}::{keys[idx]}"
        # normalized roulette wheel
        r = (rng or random).random() * total
        acc = 0.0
        for k, w in zip(keys, weights):
            acc += w
            if r <= acc:
                return f"{tid}::{k}"
        return f"{tid}::{keys[-1]}"

    # 2) Track result into ab_test_results
    async def track_result(
        self,
        db: AsyncSession,
        *,
        rule_id: str,
        variant_id: str,
        comment_id: Optional[str],
        metrics: Optional[Dict[str, Any]] = None,
    ) -> None:
        try:
            await db.execute(
                text(
                    """
                    INSERT INTO ab_test_results (rule_id, variant_id, comment_id, engagement_metrics, created_at)
                    VALUES (:rid, :vid, :cid, :metrics::jsonb, now())
                    """
                ),
                {"rid": rule_id, "vid": variant_id, "cid": comment_id, "metrics": (metrics or {})},
            )
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    # 3) Analyze performance and choose winner(s)
    async def calculate_winner(
        self,
        db: AsyncSession,
        *,
        rule_id: str,
        test_id: Optional[str] = None,
        min_samples_per_variant: int = 20,
    ) -> Dict[str, Any]:
        # Load results
        rows = (await db.execute(
            text("SELECT variant_id, engagement_metrics FROM ab_test_results WHERE rule_id = :rid"),
            {"rid": rule_id},
        )).mappings().all()

        # Group by test_id::variant
        def split_vid(v: str) -> Tuple[str, str]:
            if "::" in v:
                a, b = v.split("::", 1)
                return a, b
            return "default", v

        grouped: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
        for r in rows:
            vid = r.get("variant_id") or "A"
            t, v = split_vid(vid)
            if test_id and t != test_id:
                continue
            grouped.setdefault(t, {}).setdefault(v, []).append(r.get("engagement_metrics") or {})

        results: Dict[str, Any] = {}
        for tid, variants in grouped.items():
            # Compute metrics per variant
            stats: Dict[str, Dict[str, float | int]] = {}
            for v, ms in variants.items():
                n = len(ms)
                conv = sum(int(m.get("conversions", 0)) for m in ms)
                impr = sum(int(m.get("impressions", 0)) for m in ms)
                eng_vals = [float(m.get("engagement", 0.0)) for m in ms if isinstance(m.get("engagement"), (int, float))]
                avg_eng = (sum(eng_vals) / len(eng_vals)) if eng_vals else 0.0
                ctr = (conv / impr) if impr > 0 else 0.0
                stats[v] = {"n": n, "conversions": conv, "impressions": impr, "ctr": ctr, "avg_engagement": avg_eng}

            # Filter variants with enough samples
            eligible = {v: s for v, s in stats.items() if int(s["n"]) >= min_samples_per_variant}
            if not eligible:
                results[tid] = {"winner": None, "reason": "insufficient_data", "stats": stats}
                continue

            # Prefer CTR when impressions available; else engagement
            use_ctr = any(s["impressions"] for s in eligible.values())
            metric_key = "ctr" if use_ctr else "avg_engagement"
            # Identify best variant by metric
            best_v = max(eligible.items(), key=lambda kv: kv[1][metric_key])[0]
            # Significance vs next best
            others = [(v, s) for v, s in eligible.items() if v != best_v]
            if not others:
                results[tid] = {"winner": best_v, "p_value": 0.0, "metric": metric_key, "stats": stats}
                continue
            # choose next best
            next_v, next_s = max(others, key=lambda kv: kv[1][metric_key])

            if use_ctr:
                pval = self._two_proportion_p_value(
                    int(eligible[best_v]["conversions"]), int(eligible[best_v]["impressions"]),
                    int(next_s["conversions"]), int(next_s["impressions"]),
                )
            else:
                pval = self._mean_diff_p_value(
                    [float(m.get("engagement", 0.0)) for m in variants.get(best_v, [])],
                    [float(m.get("engagement", 0.0)) for m in variants.get(next_v, [])],
                )
            results[tid] = {"winner": best_v, "runner_up": next_v, "p_value": pval, "metric": metric_key, "stats": stats}

        return results

    # 4) Auto optimize weights in automation_rules.action JSON
    async def auto_optimize(
        self,
        db: AsyncSession,
        *,
        rule_id: str,
        min_samples_per_variant: int = 50,
        significance_threshold: float = 0.05,
    ) -> Dict[str, Any]:
        # Load current action JSON
        row = (await db.execute(
            text("SELECT action FROM automation_rules WHERE id = :rid"),
            {"rid": rule_id},
        )).first()
        if not row or row[0] is None:
            return {"updated": False, "reason": "no_action"}
        try:
            action = row[0] if isinstance(row[0], dict) else json.loads(row[0])
        except Exception:
            action = {}
        tests = (action or {}).get("ab_tests") or {}
        if not tests:
            return {"updated": False, "reason": "no_tests"}

        analysis = await self.calculate_winner(db, rule_id=rule_id, min_samples_per_variant=min_samples_per_variant)
        changed = False
        for tid, res in analysis.items():
            winner = res.get("winner")
            pval = res.get("p_value", 1.0)
            if not winner or pval is None or pval > significance_threshold:
                continue
            # Reweight: 70% to winner, remaining spread equally among others
            var_defs = tests.get(tid) or []
            labels = [str(v.get("variant_id") or "A") for v in var_defs]
            if not labels:
                continue
            for v in var_defs:
                if str(v.get("variant_id")) == winner:
                    v["weight"] = 0.7
                else:
                    v["weight"] = round(0.3 / max(1, (len(labels) - 1)), 4)
            changed = True

        if not changed:
            return {"updated": False, "reason": "no_significant_changes", "analysis": analysis}

        # Persist the updated action JSON
        try:
            await db.execute(
                text("UPDATE automation_rules SET action = :act::jsonb, updated_at = now() WHERE id = :rid"),
                {"act": json.dumps({**action, "ab_tests": tests}), "rid": rule_id},
            )
            await db.commit()
            return {"updated": True, "analysis": analysis, "ab_tests": tests}
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
            return {"updated": False, "reason": "db_error"}

    # 6) significance helpers
    @staticmethod
    def _two_proportion_p_value(x1: int, n1: int, x2: int, n2: int) -> float:
        # Two-proportion z-test (two-tailed)
        if n1 <= 0 or n2 <= 0:
            return 1.0
        p1 = x1 / max(1, n1)
        p2 = x2 / max(1, n2)
        p = (x1 + x2) / max(1, (n1 + n2))
        denom = math.sqrt(p * (1 - p) * (1 / max(1, n1) + 1 / max(1, n2)))
        if denom == 0:
            return 1.0
        z = abs((p1 - p2) / denom)
        # Normal CDF tail approx using erf
        from math import erf, sqrt
        return 2 * (1 - 0.5 * (1 + erf(z / sqrt(2))))

    @staticmethod
    def _mean_diff_p_value(a: List[float], b: List[float]) -> float:
        # Welch's t-test approximation for difference in means
        if not a or not b:
            return 1.0
        import statistics as stats
        ma = stats.mean(a)
        mb = stats.mean(b)
        sa = stats.pstdev(a) if len(a) > 1 else 0.0
        sb = stats.pstdev(b) if len(b) > 1 else 0.0
        na, nb = len(a), len(b)
        denom = math.sqrt((sa * sa) / max(1, na) + (sb * sb) / max(1, nb))
        if denom == 0:
            return 1.0
        t = abs((ma - mb) / denom)
        # Approximate two-tailed p-value via normal tail (conservative)
        from math import erf, sqrt
        return 2 * (1 - 0.5 * (1 + erf(t / sqrt(2))))
