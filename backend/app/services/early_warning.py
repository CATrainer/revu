from __future__ import annotations

"""
Early Warning System for potential viral videos.

Features:
- Monitor comment velocity in the first hour after upload
- Compare against channel baselines and alert on 3x+ spikes
- One-click actions: Enable/Disable Burst Mode
- Burst Mode: increase rate limits and response variety, then auto-disable when surge subsides
- Project comment volume and cost impact using PredictionEngine
- Track false positives and adjust sensitivity over time
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import os

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger

from app.services.prediction_engine import PredictionEngine
from app.services import system_state as sys_state
from app.tasks.email import send_email
from app.core.config import settings


@dataclass
class Alert:
    channel_id: str
    video_id: str
    detected_at: datetime
    observed_cpm: float  # comments per minute (observed in first ~30min)
    baseline_cpm: float  # baseline comments per minute (first hour historical)
    multiplier: float
    message: str
    projection: Dict[str, Any]
    cost_impact: Dict[str, Any]
    actions: List[Dict[str, Any]]


class BurstModeController:
    """Process-local controller with optional DB persistence for burst mode settings."""

    def __init__(self) -> None:
        self._per_minute: Dict[str, int] = {}
        self._variety: Dict[str, int] = {}
        self._video_until: Dict[Tuple[str, str], datetime] = {}  # (channel_id, video_id) -> ends_at
        self._default_per_minute = int(os.getenv("DEFAULT_RATE_PER_MINUTE", "30"))
        self._burst_per_minute = int(os.getenv("BURST_RATE_PER_MINUTE", "120"))
        self._burst_variety_level = int(os.getenv("BURST_VARIETY_LEVEL", "2"))  # 0..3

    def get_rate_limit_per_minute(self, channel_id: str, default: Optional[int] = None) -> int:
        return self._per_minute.get(channel_id, default or self._default_per_minute)

    def get_variety_level(self, channel_id: str) -> int:
        return self._variety.get(channel_id, 0)

    async def enable_burst(self, db: Optional[AsyncSession], *, channel_id: str, video_id: str, duration_minutes: int = 60) -> Dict[str, Any]:
        self._per_minute[channel_id] = self._burst_per_minute
        self._variety[channel_id] = self._burst_variety_level
        ends_at = datetime.now(timezone.utc) + timedelta(minutes=max(10, duration_minutes))
        self._video_until[(channel_id, video_id)] = ends_at
        # Best-effort DB persist
        if db:
            try:
                await db.execute(text(
                    """
                    CREATE TABLE IF NOT EXISTS burst_mode_states (
                        id BIGSERIAL PRIMARY KEY,
                        channel_id TEXT NOT NULL,
                        video_id TEXT NOT NULL,
                        enabled BOOLEAN NOT NULL,
                        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        ends_at TIMESTAMPTZ,
                        per_minute INT,
                        variety_level INT
                    );
                    """
                ))
                await db.execute(text(
                    """
                    INSERT INTO burst_mode_states (channel_id, video_id, enabled, ends_at, per_minute, variety_level)
                    VALUES (:c, :v, true, :e, :pm, :vl)
                    """
                ), {"c": channel_id, "v": video_id, "e": ends_at, "pm": self._per_minute[channel_id], "vl": self._variety[channel_id]})
                await db.commit()
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass
        return {"enabled": True, "ends_at": ends_at.isoformat()}

    async def disable_burst(self, db: Optional[AsyncSession], *, channel_id: str, video_id: Optional[str] = None) -> Dict[str, Any]:
        # Reset to defaults
        self._per_minute.pop(channel_id, None)
        self._variety.pop(channel_id, None)
        if video_id:
            self._video_until.pop((channel_id, video_id), None)
        if db:
            try:
                await db.execute(text(
                    """
                    CREATE TABLE IF NOT EXISTS burst_mode_states (
                        id BIGSERIAL PRIMARY KEY,
                        channel_id TEXT NOT NULL,
                        video_id TEXT NOT NULL,
                        enabled BOOLEAN NOT NULL,
                        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        ends_at TIMESTAMPTZ,
                        per_minute INT,
                        variety_level INT
                    );
                    """
                ))
                if video_id:
                    await db.execute(text("UPDATE burst_mode_states SET enabled=false WHERE channel_id=:c AND video_id=:v AND enabled=true"), {"c": channel_id, "v": video_id})
                else:
                    await db.execute(text("UPDATE burst_mode_states SET enabled=false WHERE channel_id=:c AND enabled=true"), {"c": channel_id})
                await db.commit()
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass
        return {"enabled": False}

    def maybe_auto_disable(self, *, channel_id: str, video_id: str, observed_cpm: float, baseline_cpm: float) -> Optional[Dict[str, Any]]:
        # Auto-disable when observed drops below 1.5x baseline AND current time past ends_at
        ends_at = self._video_until.get((channel_id, video_id))
        if ends_at and datetime.now(timezone.utc) >= ends_at and (observed_cpm < (1.5 * max(0.1, baseline_cpm))):
            self._per_minute.pop(channel_id, None)
            self._variety.pop(channel_id, None)
            self._video_until.pop((channel_id, video_id), None)
            return {"auto_disabled": True}
        return None


class EarlyWarningService:
    def __init__(self) -> None:
        self._burst = BurstModeController()
        self._pred = PredictionEngine()
        self._sensitivity_multiplier = float(os.getenv("EARLY_WARN_MULTIPLIER", "3.0"))  # default 3x

    async def _ensure_tables(self, db: AsyncSession) -> None:
        try:
            await db.execute(text(
                """
                CREATE TABLE IF NOT EXISTS early_warning_alerts (
                    id BIGSERIAL PRIMARY KEY,
                    channel_id TEXT NOT NULL,
                    video_id TEXT NOT NULL,
                    message TEXT NOT NULL,
                    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    observed_cpm DOUBLE PRECISION,
                    baseline_cpm DOUBLE PRECISION,
                    multiplier DOUBLE PRECISION,
                    projection JSONB,
                    cost_impact JSONB,
                    actions JSONB,
                    handled BOOLEAN DEFAULT FALSE,
                    handled_at TIMESTAMPTZ
                );

                CREATE TABLE IF NOT EXISTS early_warning_sensitivity (
                    id BIGSERIAL PRIMARY KEY,
                    channel_id TEXT NOT NULL,
                    false_positives INT DEFAULT 0,
                    total_alerts INT DEFAULT 0,
                    multiplier DOUBLE PRECISION DEFAULT 3.0,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    UNIQUE(channel_id)
                );
                """
            ))
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    async def _channel_baseline_cpm(self, db: AsyncSession, channel_id: str) -> float:
        # Average first-hour comment rate across last 20 videos
        try:
            row = (await db.execute(text(
                """
                WITH vids AS (
                  SELECT id FROM youtube_videos WHERE channel_id = :cid ORDER BY published_at DESC NULLS LAST LIMIT 20
                ), c_first_hour AS (
                  SELECT v.id AS vid, COUNT(*)::float AS c
                  FROM youtube_comments c
                  JOIN vids v ON v.id = c.video_id
                  WHERE c.published_at IS NOT NULL AND EXISTS (
                    SELECT 1 FROM youtube_videos v2 WHERE v2.id = c.video_id AND v2.published_at IS NOT NULL AND c.published_at <= v2.published_at + interval '60 minutes'
                  )
                  GROUP BY v.id
                )
                SELECT COALESCE(AVG(c)/60.0, 0) FROM c_first_hour
                """
            ), {"cid": channel_id})).first()
            return float(row[0] or 0.0)
        except Exception:
            return 0.0

    async def _observed_cpm(self, db: AsyncSession, video_id: str) -> float:
        # Comments per minute over the first available 30 minutes (or since publish if <30)
        try:
            row = (await db.execute(text(
                """
                SELECT v.published_at, COUNT(c.*)::float AS cnt
                FROM youtube_videos v
                LEFT JOIN youtube_comments c ON c.video_id = v.id AND c.published_at IS NOT NULL AND c.published_at <= v.published_at + interval '30 minutes'
                WHERE v.id = :vid
                GROUP BY v.published_at
                """
            ), {"vid": video_id})).first()
            if not row or not row[0]:
                return 0.0
            published_at: datetime = row[0]
            cnt: float = float(row[1] or 0.0)
            now = datetime.now(timezone.utc)
            minutes = max(1.0, min(30.0, (now - published_at).total_seconds() / 60.0))
            return cnt / minutes
        except Exception:
            return 0.0

    async def _cost_impact(self, db: AsyncSession, delta_comments: float) -> Dict[str, Any]:
        # Estimate cost per generated response from last 7 days api_usage_log
        try:
            row = (await db.execute(text(
                """
                SELECT COALESCE(SUM(estimated_cost_usd),0)::float / NULLIF(COUNT(*),0) AS avg_cost
                FROM api_usage_log
                WHERE service_name='claude' AND endpoint='messages.create' AND created_at >= now() - interval '7 days'
                """
            ))).first()
            avg_cost = float(row[0] or 0.002)
        except Exception:
            avg_cost = 0.002
        low = delta_comments * avg_cost * 0.8
        high = delta_comments * avg_cost * 1.2
        return {"avg_cost_per_response": avg_cost, "range": [round(low, 2), round(high, 2)], "unit": "$"}

    async def monitor_recent_videos(self, db: AsyncSession) -> List[Alert]:
        """Scan videos published in last 90 minutes and emit alerts within 30 minutes if spike detected."""
        await self._ensure_tables(db)
        res = await db.execute(text(
            """
            SELECT id, channel_id, video_id, title, published_at
            FROM youtube_videos
            WHERE published_at IS NOT NULL
              AND published_at >= now() - interval '90 minutes'
            ORDER BY published_at DESC
            """
        ))
        rows = res.fetchall() or []
        alerts: List[Alert] = []
        for r in rows:
            vid_db_id = str(r[0])
            chan = str(r[1])
            # Only alert within first 30 minutes
            published_at: datetime = r[4]
            if not published_at:
                continue
            age_min = (datetime.now(timezone.utc) - published_at).total_seconds() / 60.0
            if age_min > 30.0:
                # maybe auto-disable if needed
                obs = await self._observed_cpm(db, vid_db_id)
                base = await self._channel_baseline_cpm(db, chan)
                self._burst.maybe_auto_disable(channel_id=chan, video_id=vid_db_id, observed_cpm=obs, baseline_cpm=base)
                continue

            observed = await self._observed_cpm(db, vid_db_id)
            baseline = await self._channel_baseline_cpm(db, chan)
            # Adjust sensitivity from table if available
            mult = await self._get_multiplier(db, chan)
            threshold_mult = max(1.5, mult)
            if baseline <= 0:
                continue
            if observed >= threshold_mult * baseline:
                # Build alert package
                pred = await self._pred.predict_comment_volume(db, {"channel_id": chan, "type": None, "published_at": published_at})
                projection = {"comment_volume": pred.__dict__ if getattr(pred, "show", False) else None}
                delta_comments = max(0.0, (observed - baseline) * 60.0)  # next hour delta
                cost = await self._cost_impact(db, delta_comments)
                message = "🚀 Your video is taking off! Enable burst mode?"
                actions = [
                    {"label": "Enable Burst Mode", "action": "enable_burst", "video_id": vid_db_id, "channel_id": chan},
                    {"label": "Snooze 1h", "action": "snooze", "video_id": vid_db_id, "channel_id": chan},
                ]
                alert = Alert(
                    channel_id=chan,
                    video_id=vid_db_id,
                    detected_at=datetime.now(timezone.utc),
                    observed_cpm=observed,
                    baseline_cpm=baseline,
                    multiplier=(observed / max(0.1, baseline)),
                    message=message,
                    projection=projection,
                    cost_impact=cost,
                    actions=actions,
                )
                alerts.append(alert)
                # Persist alert
                try:
                    await db.execute(text(
                        """
                        INSERT INTO early_warning_alerts (channel_id, video_id, message, observed_cpm, baseline_cpm, multiplier, projection, cost_impact, actions)
                        VALUES (:c, :v, :m, :obs, :base, :mult, :proj::jsonb, :cost::jsonb, :acts::jsonb)
                        """
                    ), {"c": chan, "v": vid_db_id, "m": message, "obs": observed, "base": baseline, "mult": (observed/max(0.1, baseline)), "proj": projection, "cost": cost, "acts": actions})
                    await db.commit()
                except Exception:
                    try:
                        await db.rollback()
                    except Exception:
                        pass

                # Auto-pause on spike if configured: use a higher threshold (e.g., 5x) to be conservative
                try:
                    st = await sys_state.get_state(db)
                    if st.auto_pause_on_spike and (observed >= 5.0 * max(0.1, baseline)):
                        res = await sys_state.pause(db, reason="auto_pause_on_spike", duration_minutes=30, user_id=None, metadata={"channel_id": chan, "video_id": vid_db_id, "observed_cpm": observed, "baseline_cpm": baseline})
                        # Notify via email if possible: send to system EMAIL_FROM_ADDRESS as admin notification
                        try:
                            subject = "Auto-pause activated due to activity spike"
                            until = res.get("paused_until")
                            html = f"""
                            <h2>Emergency Auto-Pause Activated</h2>
                            <p>Channel: {chan}</p>
                            <p>Video: {vid_db_id}</p>
                            <p>Observed CPM: {observed:.2f} (baseline {baseline:.2f})</p>
                            <p>Reason: spike detector</p>
                            <p>Auto-resume: {until or 'manual resume'}</p>
                            """
                            send_email.delay(str(settings.EMAIL_FROM_ADDRESS), subject, html)
                        except Exception:
                            pass
                except Exception:
                    logger.exception("Auto-pause on spike failed")
        return alerts

    async def handle_action(self, db: AsyncSession, *, action: str, channel_id: str, video_id: str, duration_minutes: int = 60) -> Dict[str, Any]:
        if action == "enable_burst":
            res = await self._burst.enable_burst(db, channel_id=channel_id, video_id=video_id, duration_minutes=duration_minutes)
            return {"status": "ok", "burst": res}
        if action == "disable_burst":
            res = await self._burst.disable_burst(db, channel_id=channel_id, video_id=video_id)
            return {"status": "ok", "burst": res}
        if action == "snooze":
            # No-op placeholder (could write a snooze row to avoid duplicate alerts)
            return {"status": "ok", "snoozed": True}
        return {"status": "unknown_action"}

    async def suggestions_for_surge(self, db: AsyncSession, *, channel_id: str, video_id: str) -> Dict[str, Any]:
        # Suggest temporary rule adjustments
        suggestions = [
            {"rule": "increase_rate_limit", "why": "Handle higher comment volume", "recommended": True},
            {"rule": "add_response_variants", "why": "Improve freshness under load", "recommended": True},
            {"rule": "moderate_spam", "why": "Surges attract spam; tighten moderation", "recommended": True},
        ]
        return {"suggestions": suggestions}

    async def _get_multiplier(self, db: AsyncSession, channel_id: str) -> float:
        # sensitivity per channel based on false positive rate
        try:
            row = (await db.execute(text("SELECT multiplier FROM early_warning_sensitivity WHERE channel_id = :c"), {"c": channel_id})).first()
            if row and row[0]:
                return float(row[0])
        except Exception:
            pass
        return self._sensitivity_multiplier

    async def record_outcome(self, db: AsyncSession, *, channel_id: str, video_id: str, outcome_viral: bool) -> None:
        """Update sensitivity stats: increase false positives if alert did not lead to sustained surge."""
        await self._ensure_tables(db)
        try:
            # upsert row
            await db.execute(text(
                """
                INSERT INTO early_warning_sensitivity (channel_id, false_positives, total_alerts, multiplier)
                VALUES (:c, :fp, :tot, :m)
                ON CONFLICT (channel_id) DO UPDATE SET false_positives = early_warning_sensitivity.false_positives + :fp,
                                                        total_alerts = early_warning_sensitivity.total_alerts + :tot,
                                                        updated_at = now()
                """
            ), {"c": channel_id, "fp": (0 if outcome_viral else 1), "tot": 1, "m": self._sensitivity_multiplier})
            # Adjust multiplier: if FP rate > 30%, raise threshold by 0.25x (up to 4x). Else, slowly relax.
            row = (await db.execute(text("SELECT false_positives, total_alerts FROM early_warning_sensitivity WHERE channel_id=:c"), {"c": channel_id})).first()
            if row and row[1] and row[1] > 5:
                fp_rate = float(row[0] or 0) / float(row[1])
                mult = await self._get_multiplier(db, channel_id)
                if fp_rate > 0.3:
                    mult = min(4.0, mult + 0.25)
                elif fp_rate < 0.1:
                    mult = max(2.0, mult - 0.1)
                await db.execute(text("UPDATE early_warning_sensitivity SET multiplier=:m, updated_at=now() WHERE channel_id=:c"), {"m": mult, "c": channel_id})
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
