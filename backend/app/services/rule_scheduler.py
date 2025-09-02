from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except Exception:  # pragma: no cover
    ZoneInfo = None  # type: ignore


@dataclass
class ScheduleCheckResult:
    active: bool
    reason: str = ""


class RuleScheduler:
    """
    Time and limits evaluation for automation rules.

    Expected rule fields (JSON-friendly):
      timing: {
        timezone: "America/Los_Angeles",
        days_of_week: [0-6],            # 0=Monday ... 6=Sunday (ISO weekday-1)
        hours: [ {"start": 9, "end": 17} ],  # 24h ranges local to timezone
        delay_seconds: {"min": 0, "max": 0}
      }
      limits: {
        per_minute: 5,
        per_hour: 50,
        per_day: 200,
        per_video: 20,
        concurrent: 3
      }
      scope / conditions may also contain video_age constraints, e.g.:
      scope: { video_age_days: { "min": 0, "max": 30 } }
    """

    # 1) Is schedule active now (respect timezone, days, and hour ranges)
    def is_schedule_active(self, rule: Dict[str, Any], *, now_utc: Optional[datetime] = None) -> ScheduleCheckResult:
        timing = (rule.get("timing") or {})
        tz_name = timing.get("timezone") or "UTC"
        days = timing.get("days_of_week") or list(range(0, 7))
        hours = timing.get("hours") or [{"start": 0, "end": 24}]

        now_utc = now_utc or datetime.now(timezone.utc)
        try:
            if ZoneInfo and tz_name:
                local_tz = ZoneInfo(tz_name)
            else:
                local_tz = timezone.utc
        except Exception:
            local_tz = timezone.utc

        local_now = now_utc.astimezone(local_tz)
        # Python's isoweekday: Monday=1..Sunday=7, normalize to 0..6
        local_day = (local_now.isoweekday() - 1) % 7
        if local_day not in days:
            return ScheduleCheckResult(active=False, reason=f"day_blocked:{local_day}")
        local_hour = local_now.hour + local_now.minute / 60.0
        in_any_range = any((rng.get("start", 0) <= local_hour < rng.get("end", 24)) for rng in hours)
        if not in_any_range:
            return ScheduleCheckResult(active=False, reason=f"hour_blocked:{local_hour:.2f}")
        return ScheduleCheckResult(active=True, reason="ok")

    # 2) Should delay: return randomized delay within min/max seconds
    def should_delay(self, rule: Dict[str, Any]) -> int:
        timing = (rule.get("timing") or {})
        delay = timing.get("delay_seconds") or {}
        dmin = int(max(0, delay.get("min", 0)))
        dmax = int(max(dmin, delay.get("max", dmin)))
        if dmax <= 0:
            return 0
        return random.randint(dmin, dmax)

    # 3) Check video age window
    def check_video_age_window(self, rule: Dict[str, Any], video: Dict[str, Any], *, now_utc: Optional[datetime] = None) -> bool:
        scope = (rule.get("scope") or {})
        age_cfg = scope.get("video_age_days") or {}
        if not age_cfg:
            return True
        vpub = video.get("published_at")
        if not vpub:
            return False
        if isinstance(vpub, str):
            try:
                vpub = datetime.fromisoformat(vpub.replace("Z", "+00:00"))
            except Exception:
                return False
        now_utc = now_utc or datetime.now(timezone.utc)
        age_days = (now_utc - vpub.astimezone(timezone.utc)).days
        min_d = int(age_cfg.get("min", 0))
        max_d = int(age_cfg.get("max", 10**9))
        return (age_days >= min_d) and (age_days <= max_d)

    # 4) Limits check across counters
    def is_within_limits(self, rule: Dict[str, Any], current_counts: Dict[str, int]) -> bool:
        limits = (rule.get("limits") or {})
        pairs = [
            ("per_minute", current_counts.get("per_minute", 0)),
            ("per_hour", current_counts.get("per_hour", 0)),
            ("per_day", current_counts.get("per_day", 0)),
            ("per_video", current_counts.get("per_video", 0)),
            ("concurrent", current_counts.get("concurrent", 0)),
        ]
        for key, val in pairs:
            limit = limits.get(key)
            if limit is None:
                continue
            try:
                lim_val = int(limit)
            except Exception:
                continue
            if val >= lim_val:
                return False
        return True

    # 6) Next eligible execution time given schedule, limits, and optional base time
    def next_eligible_time(
        self,
        rule: Dict[str, Any],
        *,
        now_utc: Optional[datetime] = None,
        current_counts: Optional[Dict[str, int]] = None,
    ) -> datetime:
        now_utc = now_utc or datetime.now(timezone.utc)
        delay_seconds = self.should_delay(rule)
        candidate = now_utc + timedelta(seconds=delay_seconds)

        # If schedule inactive, find the next start boundary in local time
        sch = self.is_schedule_active(rule, now_utc=candidate)
        if not sch.active:
            # Compute next active window start
            timing = (rule.get("timing") or {})
            tz_name = timing.get("timezone") or "UTC"
            hours = timing.get("hours") or [{"start": 0, "end": 24}]
            days = timing.get("days_of_week") or list(range(0, 7))
            try:
                local_tz = ZoneInfo(tz_name) if ZoneInfo and tz_name else timezone.utc
            except Exception:
                local_tz = timezone.utc
            lnow = candidate.astimezone(local_tz)
            # iterate up to 8 days ahead to find a valid day/hour window
            for add_days in range(0, 8):
                day = (lnow.isoweekday() - 1 + add_days) % 7
                if day not in days:
                    continue
                # compute day start for that day
                day_start = (lnow + timedelta(days=add_days)).replace(hour=0, minute=0, second=0, microsecond=0)
                # choose first hour range start
                rng = min(hours, key=lambda r: r.get("start", 0))
                target = day_start.replace(hour=int(rng.get("start", 0)), minute=int((rng.get("start", 0) % 1) * 60))
                candidate = target.astimezone(timezone.utc)
                break

        # Enforce basic limits by pushing to next time window if needed
        counts = current_counts or {}
        limits = (rule.get("limits") or {})
        if limits.get("per_minute") is not None and counts.get("per_minute", 0) >= int(limits["per_minute"]):
            candidate = max(candidate, (now_utc + timedelta(minutes=1)).replace(second=0, microsecond=0))
        if limits.get("per_hour") is not None and counts.get("per_hour", 0) >= int(limits["per_hour"]):
            candidate = max(candidate, (now_utc + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0))
        if limits.get("per_day") is not None and counts.get("per_day", 0) >= int(limits["per_day"]):
            candidate = max(candidate, (now_utc + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0))

        return candidate
