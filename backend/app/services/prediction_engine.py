from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
import math
import os

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


@dataclass
class RangePrediction:
    show: bool
    low: float
    high: float
    confidence: float
    unit: Optional[str]
    range_text: str
    explanation: str
    factors: List[str]


class PredictionEngine:
    """
    Intelligent forecasting with confidence gating, factor explanations, and simple online calibration.

    Notes:
    - Returns are range-based, include confidence, and are hidden when confidence <= 0.7 (70%).
    - Tracks predictions and outcomes (best-effort) to improve calibration over time.
    - DB logging is optional; if a DB session is provided, minimal tables are ensured and used.
    """

    def __init__(self) -> None:
        # lightweight in-memory calibration weights by type
        self._scale: Dict[str, float] = {
            "comment_volume": 1.0,
            "viral": 1.0,
            "engagement": 1.0,
            "cost": 1.0,
        }
        # confidence threshold
        self._min_conf = float(os.getenv("PREDICTION_MIN_CONFIDENCE", "0.7"))

    # ---------- Utilities ----------
    @staticmethod
    def _clamp01(x: float) -> float:
        return max(0.0, min(1.0, x))

    @staticmethod
    def _to_range_text(low: float, high: float, unit: Optional[str], suffix: Optional[str] = None) -> str:
        def fmt(v: float) -> str:
            if unit == "%":
                return f"{v:.1f}%"
            if unit == "$":
                return f"${v:,.0f}"
            return f"{int(round(v))}"
        base = f"{fmt(low)}-{fmt(high)}"
        if suffix:
            return f"{base} {suffix}".strip()
        return base

    def _gated(self, rp: RangePrediction) -> RangePrediction:
        if rp.confidence < self._min_conf:
            return RangePrediction(show=False, low=rp.low, high=rp.high, confidence=rp.confidence, unit=rp.unit, range_text="", explanation=rp.explanation, factors=rp.factors)
        return rp

    async def _ensure_tables(self, db: Optional[AsyncSession]) -> None:
        if not db:
            return
        try:
            # Minimal best-effort logging tables
            await db.execute(text(
                """
                CREATE TABLE IF NOT EXISTS prediction_logs (
                    id BIGSERIAL PRIMARY KEY,
                    pred_type TEXT NOT NULL,
                    fingerprint TEXT,
                    low DOUBLE PRECISION,
                    high DOUBLE PRECISION,
                    confidence DOUBLE PRECISION,
                    unit TEXT,
                    factors JSONB,
                    explanation TEXT,
                    created_at TIMESTAMPTZ DEFAULT now()
                );

                CREATE TABLE IF NOT EXISTS prediction_accuracy (
                    id BIGSERIAL PRIMARY KEY,
                    pred_type TEXT NOT NULL,
                    fingerprint TEXT,
                    predicted_mid DOUBLE PRECISION,
                    actual_value DOUBLE PRECISION,
                    error_abs DOUBLE PRECISION,
                    created_at TIMESTAMPTZ DEFAULT now()
                );
                """
            ))
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    async def _log_prediction(self, db: Optional[AsyncSession], *, pred_type: str, fingerprint: str, rp: RangePrediction) -> None:
        if not db:
            return
        try:
            await self._ensure_tables(db)
            await db.execute(text(
                """
                INSERT INTO prediction_logs (pred_type, fingerprint, low, high, confidence, unit, factors, explanation)
                VALUES (:t, :fp, :lo, :hi, :c, :u, :f::jsonb, :ex)
                """
            ), {"t": pred_type, "fp": fingerprint, "lo": rp.low, "hi": rp.high, "c": rp.confidence, "u": rp.unit or None, "f": rp.factors, "ex": rp.explanation})
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    async def record_outcome(self, db: Optional[AsyncSession], *, pred_type: str, fingerprint: str, predicted_low: float, predicted_high: float, actual_value: float) -> None:
        """Record actuals to improve calibration; updates a simple scale factor by type."""
        mid = (predicted_low + predicted_high) / 2.0
        error_abs = abs(actual_value - mid)
        # Update scale factor (very simple: if consistently under/over, adjust)
        try:
            scale = self._scale.get(pred_type, 1.0)
            if mid > 0:
                ratio = actual_value / max(1e-6, mid)
                # EMA toward ratio
                self._scale[pred_type] = 0.9 * scale + 0.1 * ratio
        except Exception:
            pass
        # Best-effort log
        if db:
            try:
                await self._ensure_tables(db)
                await db.execute(text(
                    """
                    INSERT INTO prediction_accuracy (pred_type, fingerprint, predicted_mid, actual_value, error_abs)
                    VALUES (:t, :fp, :pm, :av, :err)
                    """
                ), {"t": pred_type, "fp": fingerprint, "pm": mid, "av": actual_value, "err": error_abs})
                await db.commit()
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass

    # ---------- Predictions ----------
    async def predict_comment_volume(self, db: Optional[AsyncSession], video_metadata: Dict[str, Any]) -> RangePrediction:
        """Forecast comment volume for a video using historical patterns and metadata."""
        channel_id = str(video_metadata.get("channel_id") or "")
        content_type = (video_metadata.get("type") or video_metadata.get("category") or "").lower()
        scheduled_at = video_metadata.get("scheduled_at") or video_metadata.get("published_at")
        weekday_boost = 1.0
        hour_boost = 1.0
        type_boost = 1.0
        recent_growth = 1.0
        factors: List[str] = []

        # Day-of-week and hour effects (heuristic)
        try:
            if scheduled_at:
                if isinstance(scheduled_at, str):
                    dt = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))
                else:
                    dt = scheduled_at
                weekday = dt.weekday()  # 0=Mon..6=Sun
                hour = dt.hour
                if weekday in (3, 4):  # Thu/Fri often higher engagement
                    weekday_boost = 1.1
                    factors.append("day-of-week: Thu/Fri boost ~+10%")
                if 17 <= hour <= 21:
                    hour_boost = 1.15
                    factors.append("evening hours boost ~+15%")
        except Exception:
            pass

        # Content type heuristics
        if content_type:
            if any(k in content_type for k in ["tutorial", "how", "guide"]):
                type_boost = 1.15
                factors.append("content_type=tutorial/guide boost ~+15%")
            elif any(k in content_type for k in ["short", "reel", "clip"]):
                type_boost = 0.9
                factors.append("short-form lower comments ~-10%")

        # Baseline from history if available
        baseline = 120.0  # fallback
        conf = 0.72  # base confidence
        if db and channel_id:
            try:
                # average comments per video over last 90 days
                row = (await db.execute(text(
                    """
                    SELECT COALESCE(AVG(t.c_cnt), 0) as avg_c
                    FROM (
                        SELECT c.video_id, COUNT(*) as c_cnt
                        FROM youtube_comments c
                        JOIN youtube_videos v ON v.id = c.video_id
                        WHERE c.published_at >= now() - interval '90 days'
                          AND v.channel_id = :cid
                        GROUP BY c.video_id
                    ) t
                    """
                ), {"cid": channel_id})).first()
                if row and row[0] and row[0] > 0:
                    baseline = float(row[0])
                    conf += 0.08
                    factors.append("channel baseline from last 90d available")
                # recent growth factor: last 14d vs prior 14d
                row2 = (await db.execute(text(
                    """
                                        WITH a AS (
                                            SELECT COUNT(*)::float AS n
                                            FROM youtube_comments c
                                            JOIN youtube_videos v ON v.id = c.video_id
                                            WHERE c.published_at >= now() - interval '14 days' AND v.channel_id = :cid
                                        ), b AS (
                                            SELECT COUNT(*)::float AS n
                                            FROM youtube_comments c
                                            JOIN youtube_videos v ON v.id = c.video_id
                                            WHERE c.published_at >= now() - interval '28 days' AND c.published_at < now() - interval '14 days' AND v.channel_id = :cid
                                        )
                    SELECT CASE WHEN b.n > 0 THEN a.n/b.n ELSE 1 END
                    FROM a, b
                    """
                ), {"cid": channel_id})).first()
                if row2 and row2[0]:
                    rg = max(0.7, min(1.5, float(row2[0])))
                    recent_growth = rg
                    if rg > 1.0:
                        factors.append(f"recent growth ~+{int((rg-1.0)*100)}%")
                    elif rg < 1.0:
                        factors.append(f"recent dip ~-{int((1.0-rg)*100)}%")
                    conf += 0.05
            except Exception:
                pass

        scale = self._scale["comment_volume"] * weekday_boost * hour_boost * type_boost * recent_growth
        mid = baseline * scale
        spread = max(20.0, mid * 0.25)  # 25% band
        low, high = max(0.0, mid - spread), mid + spread
        unit = None
        txt = self._to_range_text(low, high, unit, suffix="comments expected")
        rp = RangePrediction(show=True, low=low, high=high, confidence=self._clamp01(conf), unit=unit, range_text=txt, explanation="Forecast based on channel baseline, content type, timing, and recent trend.", factors=factors)
        await self._log_prediction(db, pred_type="comment_volume", fingerprint=f"{channel_id}:{content_type}", rp=rp)
        return self._gated(rp)

    async def predict_viral_potential(self, db: Optional[AsyncSession], video_id: str, early_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Flag potential viral videos using early velocity vs. channel baseline."""
        views_hr = float(early_metrics.get("views_per_hour", 0.0))
        like_rate = float(early_metrics.get("like_rate", 0.0))  # likes / views
        share_rate = float(early_metrics.get("share_rate", 0.0))  # shares / views
        comment_rate = float(early_metrics.get("comment_rate", 0.0))  # comments / views
        factors: List[str] = []

        base_conf = 0.7
        # Baseline estimations
        baseline_vph = 500.0
        baseline_like = 0.03
        baseline_share = 0.004
        baseline_comment = 0.006

        ch_id = str(early_metrics.get("channel_id") or "")
        if db and ch_id:
            try:
                row = (await db.execute(text(
                    """
                    SELECT COALESCE(AVG(views_first_hour), 0), COALESCE(AVG(likes_first_hour)::float/NULLIF(views_first_hour,0), 0), COALESCE(AVG(shares_first_hour)::float/NULLIF(views_first_hour,0), 0), COALESCE(AVG(comments_first_hour)::float/NULLIF(views_first_hour,0), 0)
                    FROM video_early_metrics
                    WHERE channel_id = :cid AND created_at >= now() - interval '180 days'
                    """
                ), {"cid": ch_id})).first()
                if row:
                    if row[0] and row[0] > 0:
                        baseline_vph = float(row[0]); base_conf += 0.06
                        factors.append("channel baseline velocity available")
                    if row[1] and row[1] > 0: baseline_like = float(row[1])
                    if row[2] and row[2] > 0: baseline_share = float(row[2])
                    if row[3] and row[3] > 0: baseline_comment = float(row[3])
            except Exception:
                pass

        score_parts = []
        def part(value: float, base: float, label: str, weight: float) -> float:
            if base <= 0: return 0.0
            ratio = value / base
            adj = max(0.0, min(2.0, ratio))
            score = (adj - 1.0) * 0.5 * weight + 0.5 * weight  # maps 0..2x -> 0..1 scaled by weight
            score_parts.append((label, ratio))
            return score

        score = 0.0
        score += part(views_hr, baseline_vph, "views_per_hour", 0.45)
        score += part(like_rate, baseline_like, "like_rate", 0.25)
        score += part(share_rate, baseline_share, "share_rate", 0.15)
        score += part(comment_rate, baseline_comment, "comment_rate", 0.15)
        score = max(0.0, min(1.0, score))

        for lbl, ratio in score_parts:
            pct = int((ratio - 1.0) * 100)
            if ratio >= 1.2:
                factors.append(f"{lbl}: +{pct}% vs baseline")
            elif ratio <= 0.85:
                factors.append(f"{lbl}: {pct}% vs baseline")

        conf = self._clamp01(base_conf + 0.1 * (1 if len(factors) >= 2 else 0))
        label = "high" if score >= 0.75 else ("medium" if score >= 0.5 else "low")
        result = {
            "show": conf >= self._min_conf,
            "label": label,
            "score": round(score, 3),
            "confidence": conf,
            "explanation": "Relative early velocity compared to channel baseline across views, likes, shares, comments.",
            "factors": factors,
        }
        # Log as a range-like entry to reuse logging infra
        await self._log_prediction(db, pred_type="viral", fingerprint=f"{ch_id}:{video_id}", rp=RangePrediction(show=result["show"], low=score, high=score, confidence=conf, unit=None, range_text="", explanation=result["explanation"], factors=factors))
        return result

    async def predict_engagement_rate(self, db: Optional[AsyncSession], response_text: str, comment_context: Dict[str, Any]) -> RangePrediction:
        """Estimate engagement rate for an automated response before posting."""
        text = (response_text or "").lower()
        factors: List[str] = []
        base = 3.0  # % baseline
        conf = 0.72

        # Heuristics
        if any(k in text for k in ["thank", "thanks", "appreciate", "glad"]):
            base *= 1.12; factors.append("gratitude tone +12%")
        if any(k in text for k in ["subscribe", "follow", "check out", "link", "join"]):
            base *= 1.08; factors.append("CTA present +8%")
        if len(text) > 220:
            base *= 0.9; factors.append("long message -10%")
        if any(k in text for k in ["hate", "stupid", "idiot", "terrible"]):
            base *= 0.8; factors.append("negative words -20%")

        # Context boosts
        sentiment = str(comment_context.get("sentiment") or "").lower()
        if sentiment == "positive": base *= 1.1; factors.append("positive context +10%")
        if sentiment == "negative": base *= 0.9; factors.append("negative context -10%")

        # Channel calibration
        ch_id = str(comment_context.get("channel_id") or "")
        if db and ch_id:
            try:
                row = (await db.execute(text(
                    """
                    SELECT COALESCE(AVG(engagement_rate), 0)
                    FROM rule_response_metrics
                    WHERE channel_id = :cid AND created_at >= now() - interval '90 days'
                    """
                ), {"cid": ch_id})).first()
                if row and row[0] and row[0] > 0:
                    baseline_er = float(row[0]) * 100.0
                    base = 0.5 * base + 0.5 * baseline_er
                    conf += 0.06
                    factors.append("channel baseline engagement integrated")
            except Exception:
                pass

        scale = self._scale["engagement"]
        mid = base * scale
        spread = max(0.5, mid * 0.3)
        low, high = max(0.1, mid - spread), mid + spread
        unit = "%"
        txt = self._to_range_text(low, high, unit, suffix="engagement expected")
        rp = RangePrediction(show=True, low=low, high=high, confidence=self._clamp01(conf), unit=unit, range_text=txt, explanation="Text tone, CTA presence, length, context sentiment, and channel baseline.", factors=factors)
        await self._log_prediction(db, pred_type="engagement", fingerprint=f"{ch_id}:{hash(text)}", rp=rp)
        return self._gated(rp)

    async def suggest_preemptive_rules(self, db: Optional[AsyncSession], upcoming_content: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest rules ahead of time based on content type, topic, and schedule."""
        ctype = str(upcoming_content.get("type") or upcoming_content.get("category") or "").lower()
        tags = [str(t).lower() for t in (upcoming_content.get("tags") or [])]
        scheduled_at = upcoming_content.get("scheduled_at")
        conf_base = 0.72
        suggestions: List[Dict[str, Any]] = []

        # Heuristics per content type
        if any(k in ctype for k in ["tutorial", "how", "guide"]):
            suggestions.append({
                "rule": "auto_reply_common_questions",
                "why": "Tutorial content often prompts repeated questions; auto-reply reduces workload.",
                "confidence": 0.82,
            })
        if any(k in ctype for k in ["giveaway", "announcement", "launch"]):
            suggestions.append({
                "rule": "moderate_spam_links",
                "why": "Announcements attract spam; preemptive moderation improves quality.",
                "confidence": 0.8,
            })
        if any(k in tags for k in ["controversial", "debate", "hot-take"]):
            suggestions.append({
                "rule": "flag_sensitive_keywords",
                "why": "Sensitive topics can escalate; flagging helps timely review.",
                "confidence": 0.78,
            })

        # Timing-based
        try:
            if scheduled_at:
                dt = datetime.fromisoformat(str(scheduled_at).replace("Z", "+00:00")) if isinstance(scheduled_at, str) else scheduled_at
                if dt.weekday() in (5, 6):  # weekend
                    suggestions.append({
                        "rule": "extend_approval_window",
                        "why": "Weekend spikes may need longer moderation windows.",
                        "confidence": 0.76,
                    })
        except Exception:
            pass

        # Confidence gating
        filtered = [s for s in suggestions if s.get("confidence", 0.0) >= self._min_conf]
        return {
            "show": len(filtered) > 0,
            "suggestions": filtered,
            "explanation": "Suggestions derived from content type, tags, and timing heuristics.",
        }

    async def predict_cost_trajectory(self, db: Optional[AsyncSession], current_usage: Dict[str, Any]) -> Dict[str, Any]:
        """Project costs for next 7 and 30 days as ranges based on recent daily average and trend."""
        # Inputs expected: daily_costs: List[float] recent, and optional growth_rate
        daily_costs = [float(x) for x in (current_usage.get("daily_costs") or [])][-30:]
        growth_rate = float(current_usage.get("growth_rate", 0.0))  # daily multiplicative (e.g., 0.02 = 2%/day)
        conf = 0.7 + (0.1 if len(daily_costs) >= 14 else 0.0)
        factors: List[str] = []
        if len(daily_costs) >= 7:
            factors.append("recent 7-30d cost history used")
        if abs(growth_rate) > 0:
            factors.append(f"applied growth rate {int(growth_rate*100)}%/day")

        def project(days: int) -> RangePrediction:
            if not daily_costs:
                avg = 50.0
            else:
                avg = sum(daily_costs[-min(7, len(daily_costs)):]) / min(7, len(daily_costs))
            # Apply compounded growth over the horizon
            horizon_scale = (1.0 + growth_rate) ** days if growth_rate else 1.0
            mid = avg * days * horizon_scale * self._scale["cost"]
            spread = max(10.0, mid * 0.25)
            low, high = max(0.0, mid - spread), mid + spread
            txt = self._to_range_text(low, high, "$", suffix=f"next {days} days")
            rp = RangePrediction(show=True, low=low, high=high, confidence=self._clamp01(conf), unit="$", range_text=txt, explanation="Based on recent average daily costs and applied growth rate.", factors=factors)
            return self._gated(rp)

        r7 = project(7)
        r30 = project(30)
        # Best-effort logs
        await self._log_prediction(db, pred_type="cost", fingerprint="7d", rp=r7)
        await self._log_prediction(db, pred_type="cost", fingerprint="30d", rp=r30)
        return {
            "7d": r7.__dict__,
            "30d": r30.__dict__,
        }
