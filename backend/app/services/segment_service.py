from __future__ import annotations

import math
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class SegmentDefinition:
    preset: Optional[str] = None  # 'new' | 'subscriber' | 'member' | 'vip'
    conditions: Optional[Dict[str, Any]] = None


@dataclass
class SegmentPreviewUser:
    user_channel_id: str
    total_interactions: int
    distinct_videos: int
    last_interaction_at: datetime
    engagement_score: float
    topics: List[str]


class SegmentService:
    """Manage saved segments and compute previews/estimates from user_interaction_history.

    Tables used/created:
      - user_interaction_history (existing; rows per interaction)
      - saved_user_segments (created if missing):
          id TEXT PK, name TEXT, definition JSONB, created_by TEXT NULL,
          channel_id TEXT NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
    """

    async def _ensure_table(self, db: AsyncSession) -> None:
        await db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS saved_user_segments (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
                  created_by TEXT NULL,
                  channel_id TEXT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        await db.commit()

    # CRUD operations for saved segments
    async def list_segments(self, db: AsyncSession, *, channel_id: Optional[str] = None) -> List[Dict[str, Any]]:
        await self._ensure_table(db)
        if channel_id:
            res = await db.execute(text("SELECT * FROM saved_user_segments WHERE channel_id = :cid ORDER BY updated_at DESC"), {"cid": channel_id})
        else:
            res = await db.execute(text("SELECT * FROM saved_user_segments ORDER BY updated_at DESC LIMIT 50"))
        rows = res.fetchall() or []
        out: List[Dict[str, Any]] = []
        for r in rows:
            m = r._mapping if hasattr(r, "_mapping") else None
            out.append(
                {
                    "id": str(m["id"] if m else r[0]),
                    "name": (m["name"] if m else r[1]),
                    "definition": (m["definition"] if m else r[2]) or {},
                    "created_by": (m["created_by"] if m else r[3]),
                    "channel_id": (m["channel_id"] if m else r[4]),
                    "created_at": (m["created_at"] if m else r[5]),
                    "updated_at": (m["updated_at"] if m else r[6]),
                }
            )
        return out

    async def save_segment(
        self,
        db: AsyncSession,
        *,
        name: str,
        definition: Dict[str, Any],
        created_by: Optional[str] = None,
        channel_id: Optional[str] = None,
        segment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        await self._ensure_table(db)
        if segment_id:
            await db.execute(
                text(
                    """
                    UPDATE saved_user_segments
                    SET name = :name, definition = :def::jsonb, updated_at = now()
                    WHERE id = :id
                    """
                ),
                {"id": segment_id, "name": name, "def": definition},
            )
            await db.commit()
            sid = segment_id
        else:
            sid = str(uuid.uuid4())
            await db.execute(
                text(
                    """
                    INSERT INTO saved_user_segments (id, name, definition, created_by, channel_id)
                    VALUES (:id, :name, :def::jsonb, :by, :cid)
                    """
                ),
                {"id": sid, "name": name, "def": definition, "by": created_by, "cid": channel_id},
            )
            await db.commit()
        return {"id": sid, "name": name}

    async def delete_segment(self, db: AsyncSession, *, segment_id: str) -> int:
        await self._ensure_table(db)
        res = await db.execute(text("DELETE FROM saved_user_segments WHERE id = :id"), {"id": segment_id})
        await db.commit()
        return res.rowcount or 0

    # Preview and estimation
    def _apply_preset(self, conds: Dict[str, Any], preset: Optional[str]) -> Dict[str, Any]:
        conds = dict(conds or {})
        if not preset:
            return conds
        # Map presets to interaction thresholds aligned with UserContextService
        if preset == "new":
            conds.setdefault("total_interactions", {}).setdefault("max", 1)
        elif preset == "subscriber":
            # heuristic: seen before (>=2 interactions)
            conds.setdefault("total_interactions", {}).setdefault("min", 2)
        elif preset == "member":
            # approximate loyal users
            rng = conds.setdefault("total_interactions", {})
            rng.setdefault("min", 6)
            rng.setdefault("max", 20)
        elif preset == "vip":
            conds.setdefault("total_interactions", {}).setdefault("min", 21)
        return conds

    def _engagement_score_from_counts(self, comments: int, replies: int, others: int) -> float:
        raw = comments * 1.0 + replies * 0.6 + others * 0.3
        return round(1.0 / (1.0 + math.exp(-0.25 * (raw - 5.0))), 3)

    async def preview(
        self,
        db: AsyncSession,
        *,
        definition: Dict[str, Any],
        channel_id: Optional[str] = None,
        limit: int = 12,
    ) -> Dict[str, Any]:
        """Compute matching users and estimate segment size.

        definition schema:
        {
          preset?: 'new'|'subscriber'|'member'|'vip',
          conditions?: {
            engagement_score?: {min?: number, max?: number},
            total_interactions?: {min?: number, max?: number},
            distinct_videos?: {min?: number, max?: number},
            recent_days?: number,
            subscriber?: true|false|null,
            topics_any?: string[],
            topics_all?: string[]
          }
        }
        """
        conds = dict(definition.get("conditions") or {})
        conds = self._apply_preset(conds, (definition.get("preset") or None))

        # Aggregate per-user metrics
        where = ["1=1"]
        params: Dict[str, Any] = {}
        # We don't reliably have channel_id on user_interaction_history; if present, filter
        if channel_id:
            where.append("(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_interaction_history' AND column_name='channel_id') THEN channel_id::text = :cid ELSE TRUE END)")
            params["cid"] = str(channel_id)
        sql = f"""
            SELECT user_channel_id,
                   COUNT(*) AS total_interactions,
                   COUNT(*) FILTER (WHERE interaction_type = 'comment') AS comment_count,
                   COUNT(*) FILTER (WHERE interaction_type = 'reply') AS reply_count,
                   COUNT(*) FILTER (WHERE interaction_type NOT IN ('comment','reply')) AS other_count,
                   COUNT(DISTINCT video_id) AS distinct_videos,
                   MAX(created_at) AS last_interaction_at
            FROM user_interaction_history
            WHERE {' AND '.join(where)}
            GROUP BY user_channel_id
        """
        res = await db.execute(text(sql), params)
        rows = res.fetchall() or []

        # Filter in Python according to conds
        matches: List[Tuple[float, Dict[str, Any]]] = []  # (score, rowmap)
        now = datetime.now(timezone.utc)
        for r in rows:
            m = r._mapping if hasattr(r, "_mapping") else None
            user_id = str(m["user_channel_id"] if m else r[0])
            total = int(m["total_interactions"] if m else r[1])
            comments = int(m["comment_count"] if m else r[2])
            replies = int(m["reply_count"] if m else r[3])
            others = int(m["other_count"] if m else r[4])
            dv = int(m["distinct_videos"] if m else r[5])
            last_at = m["last_interaction_at"] if m else r[6]
            if not isinstance(last_at, datetime):
                # best-effort parse if needed
                try:
                    last_at = datetime.fromisoformat(str(last_at))
                except Exception:
                    last_at = now
            eng = self._engagement_score_from_counts(comments, replies, others)

            # Apply numeric range filters
            def in_range(v: Optional[float], rng: Optional[Dict[str, Any]]) -> bool:
                if rng is None:
                    return True
                mn = rng.get("min")
                mx = rng.get("max")
                if v is None:
                    return False
                if mn is not None and v < float(mn):
                    return False
                if mx is not None and v > float(mx):
                    return False
                return True

            if not in_range(total, conds.get("total_interactions")):
                continue
            if not in_range(dv, conds.get("distinct_videos")):
                continue
            if not in_range(eng, conds.get("engagement_score")):
                continue

            recent_days = conds.get("recent_days")
            if isinstance(recent_days, (int, float)) and recent_days > 0:
                if last_at < now - timedelta(days=float(recent_days)):
                    continue

            # Subscriber heuristic
            subs = conds.get("subscriber")
            if subs is not None:
                is_sub = total >= 2
                if bool(subs) != is_sub:
                    continue

            # Topics filters will be applied after we fetch topics for examples

            # Score for ordering: engagement then recency
            score = eng * 0.7 + (1.0 / (1.0 + (now - last_at).days)) * 0.3
            matches.append((score, {
                "user_channel_id": user_id,
                "total_interactions": total,
                "distinct_videos": dv,
                "last_interaction_at": last_at,
                "engagement_score": eng,
            }))

        matches.sort(key=lambda t: t[0], reverse=True)
        size_estimate = len(matches)

        # Build example set
        sample = [m[1] for m in matches[: max(1, min(limit, 20))]]
        example_ids = [s["user_channel_id"] for s in sample]
        topics_by_user: Dict[str, List[str]] = {}
        if example_ids:
            # Fetch recent topics per user (flatten and unique)
            t_res = await db.execute(
                text(
                    """
                    SELECT user_channel_id, topics
                    FROM user_interaction_history
                    WHERE user_channel_id = ANY(:uids)
                    ORDER BY created_at DESC
                    LIMIT 1000
                    """
                ),
                {"uids": example_ids},
            )
            for row in t_res.fetchall() or []:
                mm = row._mapping if hasattr(row, "_mapping") else None
                uid = str(mm["user_channel_id"] if mm else row[0])
                ts = mm["topics"] if mm else row[1]
                if isinstance(ts, list):
                    topics_by_user.setdefault(uid, [])
                    for x in ts:
                        sx = str(x)
                        if sx and sx not in topics_by_user[uid]:
                            topics_by_user[uid].append(sx)

        # Apply topics_any/all filters on examples
        topics_any = [str(x).strip() for x in (conds.get("topics_any") or []) if str(x).strip()]
        topics_all = [str(x).strip() for x in (conds.get("topics_all") or []) if str(x).strip()]
        def topics_match(lst: List[str]) -> bool:
            if topics_any and not any(t in lst for t in topics_any):
                return False
            if topics_all and not all(t in lst for t in topics_all):
                return False
            return True

        examples: List[SegmentPreviewUser] = []
        for s in sample:
            ts = topics_by_user.get(s["user_channel_id"], [])
            if topics_any or topics_all:
                if not topics_match(ts):
                    continue
            examples.append(
                SegmentPreviewUser(
                    user_channel_id=s["user_channel_id"],
                    total_interactions=s["total_interactions"],
                    distinct_videos=s["distinct_videos"],
                    last_interaction_at=s["last_interaction_at"],
                    engagement_score=s["engagement_score"],
                    topics=ts[:10],
                )
            )

        # Pattern summary (top topics in examples)
        topic_counts: Dict[str, int] = {}
        for ex in examples:
            for t in ex.topics:
                topic_counts[t] = topic_counts.get(t, 0) + 1
        top_topics = sorted(topic_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]

        return {
            "size_estimate": size_estimate,
            "examples": [
                {
                    "user_channel_id": e.user_channel_id,
                    "total_interactions": e.total_interactions,
                    "distinct_videos": e.distinct_videos,
                    "last_interaction_at": e.last_interaction_at.isoformat(),
                    "engagement_score": e.engagement_score,
                    "topics": e.topics,
                }
                for e in examples
            ],
            "patterns": {"top_topics": [{"topic": k, "count": v} for k, v in top_topics]},
        }
