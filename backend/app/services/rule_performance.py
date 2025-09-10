from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class Aggregate:
    count: int
    impressions: int
    conversions: int
    ctr: float
    avg_engagement: float


class RulePerformanceService:
    """
    Aggregate and analyze rule performance for automated vs manual responses.
    Stores metrics in table `rule_response_metrics` for both automated and manual responses.
    """

    async def _ensure_tables(self, db: AsyncSession) -> None:
        await db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS rule_response_metrics (
                  id bigserial PRIMARY KEY,
                  rule_id UUID NULL,
                  response_id VARCHAR NULL,
                  is_automated BOOLEAN NOT NULL DEFAULT TRUE,
                  engagement_metrics JSONB NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS ix_rrm_rule ON rule_response_metrics(rule_id);
                CREATE INDEX IF NOT EXISTS ix_rrm_created ON rule_response_metrics(created_at);
                CREATE INDEX IF NOT EXISTS ix_rrm_auto ON rule_response_metrics(is_automated);
                """
            )
        )

    # 1) Track engagement metrics for responses
    async def record_response_metrics(
        self,
        db: AsyncSession,
        *,
        rule_id: Optional[str],
        response_id: Optional[str],
        metrics: Dict[str, Any],
        is_automated: bool = True,
    ) -> Dict[str, Any]:
        await self._ensure_tables(db)
        payload = {
            "conversions": int(metrics.get("conversions", 0)),
            "impressions": int(metrics.get("impressions", 0)),
            "engagement": float(metrics.get("engagement", 0.0)),
            **{k: v for k, v in metrics.items() if k not in {"conversions", "impressions", "engagement"}},
        }
        await db.execute(
            text(
                """
                INSERT INTO rule_response_metrics (rule_id, response_id, is_automated, engagement_metrics, created_at)
                VALUES (:rid, :resp, :auto, :m::jsonb, now())
                """
            ),
            {"rid": rule_id, "resp": response_id, "auto": bool(is_automated), "m": json.dumps(payload)},
        )
        await db.commit()
        return {"saved": True}

    async def _aggregate(
        self,
        db: AsyncSession,
        *,
        rule_id: Optional[str] = None,
        is_automated: Optional[bool] = None,
        since: Optional[datetime] = None,
    ) -> Aggregate:
        # Ensure table exists before reading (fresh deployments may query before first write)
        await self._ensure_tables(db)
        where = ["1=1"]
        params: Dict[str, Any] = {}
        if rule_id:
            where.append("rule_id = :rid")
            params["rid"] = rule_id
        if is_automated is not None:
            where.append("is_automated = :auto")
            params["auto"] = bool(is_automated)
        if since is not None:
            where.append("created_at >= :since")
            params["since"] = since
        q = f"""
            SELECT COUNT(*) AS n,
                   SUM(COALESCE((engagement_metrics->>'impressions')::int,0)) AS impressions,
                   SUM(COALESCE((engagement_metrics->>'conversions')::int,0)) AS conversions,
                   AVG(COALESCE((engagement_metrics->>'engagement')::float,0.0)) AS avg_engagement
            FROM rule_response_metrics
            WHERE {' AND '.join(where)}
        """
        row = (await db.execute(text(q), params)).first()
        n = int(row[0] or 0) if row else 0
        imp = int(row[1] or 0) if row else 0
        conv = int(row[2] or 0) if row else 0
        avg_eng = float(row[3] or 0.0) if row else 0.0
        ctr = (conv / imp) if imp > 0 else 0.0
        return Aggregate(count=n, impressions=imp, conversions=conv, ctr=ctr, avg_engagement=avg_eng)

    # 2) Compare automated vs manual
    async def compare_automated_vs_manual(
        self,
        db: AsyncSession,
        *,
        rule_id: str,
        window_days: int = 30,
    ) -> Dict[str, Any]:
        await self._ensure_tables(db)
        since = datetime.now(timezone.utc) - timedelta(days=max(1, window_days))
        auto = await self._aggregate(db, rule_id=rule_id, is_automated=True, since=since)
        manual = await self._aggregate(db, rule_id=rule_id, is_automated=False, since=since)
        return {
            "rule_id": rule_id,
            "window_days": window_days,
            "automated": auto.__dict__,
            "manual": manual.__dict__,
            "delta": {
                "ctr": auto.ctr - manual.ctr,
                "avg_engagement": auto.avg_engagement - manual.avg_engagement,
            },
        }

    # 3) Best/Worst performing rules (by CTR, then avg engagement)
    async def best_and_worst_rules(
        self,
        db: AsyncSession,
        *,
        window_days: int = 30,
        top_n: int = 5,
    ) -> Dict[str, Any]:
        await self._ensure_tables(db)
        since = datetime.now(timezone.utc) - timedelta(days=max(1, window_days))
        rows = (
            await db.execute(
                text(
                    """
                    SELECT rule_id,
                           COUNT(*) AS n,
                           SUM(COALESCE((engagement_metrics->>'impressions')::int,0)) AS impressions,
                           SUM(COALESCE((engagement_metrics->>'conversions')::int,0)) AS conversions,
                           AVG(COALESCE((engagement_metrics->>'engagement')::float,0.0)) AS avg_engagement
                    FROM rule_response_metrics
                    WHERE is_automated = TRUE AND created_at >= :since
                    GROUP BY rule_id
                    """
                ),
                {"since": since},
            )
        ).mappings().all()
        agg = []
        for r in rows:
            imp = int(r.get("impressions") or 0)
            conv = int(r.get("conversions") or 0)
            ctr = (conv / imp) if imp > 0 else 0.0
            agg.append({
                "rule_id": str(r.get("rule_id")),
                "count": int(r.get("n") or 0),
                "impressions": imp,
                "conversions": conv,
                "ctr": ctr,
                "avg_engagement": float(r.get("avg_engagement") or 0.0),
            })
        agg.sort(key=lambda x: (x["ctr"], x["avg_engagement"]), reverse=True)
        best = agg[:top_n]
        worst = list(reversed(agg))[:top_n]
        return {"best": best, "worst": worst}

    # 4) ROI per rule
    async def calculate_roi(
        self,
        db: AsyncSession,
        *,
        rule_id: str,
        window_days: int = 30,
        seconds_per_manual: int = 45,
        hourly_rate: float = 30.0,
        cost_per_response: float = 0.005,
    ) -> Dict[str, Any]:
        await self._ensure_tables(db)
        since = datetime.now(timezone.utc) - timedelta(days=max(1, window_days))
        auto = await self._aggregate(db, rule_id=rule_id, is_automated=True, since=since)
        # Assume each automated response replaces one manual action
        time_saved_seconds = auto.count * max(0, seconds_per_manual)
        time_value = (time_saved_seconds / 3600.0) * max(0.0, hourly_rate)
        api_cost = auto.count * max(0.0, cost_per_response)
        roi = time_value - api_cost
        return {
            "rule_id": rule_id,
            "window_days": window_days,
            "responses": auto.count,
            "time_saved_seconds": time_saved_seconds,
            "time_value_usd": round(time_value, 4),
            "api_cost_usd": round(api_cost, 4),
            "roi_usd": round(roi, 4),
        }

    # 5) Detect anomalies: abrupt change in CTR vs trailing mean (EWMA-like simple)
    async def detect_anomalies(
        self,
        db: AsyncSession,
        *,
        rule_id: Optional[str] = None,
        lookback_days: int = 28,
        threshold: float = 0.3,
    ) -> Dict[str, Any]:
        await self._ensure_tables(db)
        since = datetime.now(timezone.utc) - timedelta(days=max(7, lookback_days))
        where = ["is_automated = TRUE", "created_at >= :since"]
        params: Dict[str, Any] = {"since": since}
        if rule_id:
            where.append("rule_id = :rid")
            params["rid"] = rule_id
        q = f"""
            SELECT rule_id,
                   date_trunc('day', created_at) AS day,
                   SUM(COALESCE((engagement_metrics->>'impressions')::int,0)) AS impressions,
                   SUM(COALESCE((engagement_metrics->>'conversions')::int,0)) AS conversions
            FROM rule_response_metrics
            WHERE {' AND '.join(where)}
            GROUP BY rule_id, day
            ORDER BY rule_id, day
        """
        rows = (await db.execute(text(q), params)).mappings().all()
        anomalies: Dict[str, List[Dict[str, Any]]] = {}
        series: Dict[str, List[Tuple[datetime, float]]] = {}
        for r in rows:
            rid = str(r.get("rule_id"))
            imp = int(r.get("impressions") or 0)
            conv = int(r.get("conversions") or 0)
            ctr = (conv / imp) if imp > 0 else 0.0
            series.setdefault(rid, []).append((r.get("day"), ctr))
        for rid, points in series.items():
            if len(points) < 7:
                continue
            # rolling mean of previous 7 values
            for i in range(7, len(points)):
                prev = [p[1] for p in points[i-7:i]]
                mean_prev = sum(prev) / 7.0
                cur = points[i][1]
                if mean_prev <= 0 and cur > 0:
                    change = 1.0
                elif mean_prev == 0 and cur == 0:
                    change = 0.0
                else:
                    change = (cur - mean_prev) / max(1e-6, mean_prev)
                if abs(change) >= abs(threshold):
                    anomalies.setdefault(rid, []).append({
                        "day": points[i][0].isoformat() if isinstance(points[i][0], datetime) else str(points[i][0]),
                        "ctr": cur,
                        "prev_mean": mean_prev,
                        "change": change,
                    })
        return {"anomalies": anomalies, "threshold": threshold}

    # 6) Weekly performance report
    async def weekly_report(
        self,
        db: AsyncSession,
        *,
        end: Optional[datetime] = None,
        weeks: int = 1,
    ) -> Dict[str, Any]:
        await self._ensure_tables(db)
        end = end or datetime.now(timezone.utc)
        start = end - timedelta(days=7 * max(1, weeks))
        q = text(
            """
            SELECT rule_id,
                   date_trunc('week', created_at) AS week,
                   COUNT(*) AS n,
                   SUM(COALESCE((engagement_metrics->>'impressions')::int,0)) AS impressions,
                   SUM(COALESCE((engagement_metrics->>'conversions')::int,0)) AS conversions,
                   AVG(COALESCE((engagement_metrics->>'engagement')::float,0.0)) AS avg_engagement
            FROM rule_response_metrics
            WHERE created_at >= :start AND created_at < :end AND is_automated = TRUE
            GROUP BY rule_id, week
            ORDER BY week DESC, rule_id
            """
        )
        rows = (await db.execute(q, {"start": start, "end": end})).mappings().all()
        weeks_map: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            imp = int(r.get("impressions") or 0)
            conv = int(r.get("conversions") or 0)
            ctr = (conv / imp) if imp > 0 else 0.0
            wk = (r.get("week").date().isoformat() if hasattr(r.get("week"), 'date') else str(r.get("week")))
            weeks_map.setdefault(wk, {"rules": []})
            weeks_map[wk]["rules"].append({
                "rule_id": str(r.get("rule_id")),
                "responses": int(r.get("n") or 0),
                "impressions": imp,
                "conversions": conv,
                "ctr": ctr,
                "avg_engagement": float(r.get("avg_engagement") or 0.0),
            })
        # identify best/worst each week
        for wk, data in weeks_map.items():
            rules = data.get("rules", [])
            rules.sort(key=lambda x: (x["ctr"], x["avg_engagement"]), reverse=True)
            data["best"] = rules[0] if rules else None
            data["worst"] = (rules[-1] if rules else None)
        return {"start": start.isoformat(), "end": end.isoformat(), "weeks": weeks_map}
