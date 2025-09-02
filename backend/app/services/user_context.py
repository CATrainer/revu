from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import math
import os

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.utils.cache import async_ttl_cache


@dataclass
class UserContext:
    previous_comments: List[Dict[str, Any]]
    total_interactions: int
    subscriber_status: Optional[bool]
    engagement_score: float
    topics_discussed: List[str]
    segment: str | None = None


class UserContextService:
    """
    Builds and caches per-user cross-video context to power intelligent automation.
    - Data source: user_interaction_history (migration 20250902_0002)
    - Cache TTL: 1 hour (override via USER_CONTEXT_TTL_SECONDS)
    """

    def __init__(self, *, ttl_seconds: Optional[float] = None) -> None:
        self._ttl = float(ttl_seconds if ttl_seconds is not None else float(os.getenv("USER_CONTEXT_TTL_SECONDS", "3600")))

    # 1) Fetch history for a channel (idempotent, read-only)
    async def get_user_history(self, db: AsyncSession, channel_id: str, *, limit: int = 200) -> List[Dict[str, Any]]:
        q = text(
            """
            SELECT user_channel_id, video_id, comment_id, interaction_type, sentiment_result, topics, created_at
            FROM user_interaction_history
            WHERE user_channel_id = :cid
            ORDER BY created_at DESC
            LIMIT :lim
            """
        )
        rows = (await db.execute(q, {"cid": channel_id, "lim": limit})).mappings().all()
        return [dict(r) for r in rows]

    # 2) Build context from history (cached)
    @async_ttl_cache(ttl_seconds=float(os.getenv("USER_CONTEXT_TTL_SECONDS", "3600")))
    async def build_context(self, db: AsyncSession, user_channel_id: str) -> UserContext:
        history = await self.get_user_history(db, user_channel_id, limit=500)
        previous_comments: List[Dict[str, Any]] = [
            {
                "video_id": h.get("video_id"),
                "comment_id": h.get("comment_id"),
                "sentiment": h.get("sentiment_result"),
                "created_at": h.get("created_at"),
                "topics": h.get("topics") or [],
            }
            for h in history
            if (h.get("interaction_type") == "comment")
        ]
        total_interactions = len(history)
        # Subscriber status: naive heuristic (if seen before and interacted >=2 times -> returning; derive subscriber=True likely)
        subscriber_status: Optional[bool] = True if total_interactions >= 2 else None

        # Engagement score: weighted by recency and type
        def weight(row: Dict[str, Any]) -> float:
            t = row.get("interaction_type")
            base = 1.0 if t == "comment" else 0.6 if t == "reply" else 0.3
            # recency boost is omitted here (no timestamps math for simplicity); could be added later
            return base

        engagement = sum(weight(r) for r in history)
        # Normalize to 0..1 via sigmoid on count
        norm = 1 / (1 + math.exp(-0.25 * (engagement - 5)))

        # Topics discussed: flatten unique
        topics_set: set[str] = set()
        for h in history:
            ts = h.get("topics") or []
            if isinstance(ts, list):
                topics_set.update([str(x) for x in ts])
        topics_discussed = sorted(list(topics_set))

        segment = self.get_user_segment_from_counts(total_interactions)

        return UserContext(
            previous_comments=previous_comments,
            total_interactions=total_interactions,
            subscriber_status=subscriber_status,
            engagement_score=round(norm, 3),
            topics_discussed=topics_discussed,
            segment=segment,
        )

    # 3) Segment determination
    def get_user_segment(self, user_channel_id: str, *, total_interactions: Optional[int] = None) -> str:
        # If count not provided, fallback to thresholds by None -> "new"
        if total_interactions is None:
            return "new"
        return self.get_user_segment_from_counts(total_interactions)

    @staticmethod
    def get_user_segment_from_counts(total_interactions: int) -> str:
        if total_interactions <= 1:
            return "new"
        if total_interactions <= 5:
            return "returning"
        if total_interactions <= 20:
            return "loyal"
        return "vip"

    # 5) Update history after each interaction
    async def update_history(
        self,
        db: AsyncSession,
        *,
        user_channel_id: str,
        video_id: str,
        interaction_type: str,
        comment_id: Optional[str] = None,
        sentiment_result: Optional[str] = None,
        topics: Optional[List[str]] = None,
    ) -> None:
        q = text(
            """
            INSERT INTO user_interaction_history (user_channel_id, video_id, comment_id, interaction_type, sentiment_result, topics, created_at)
            VALUES (:uid, :vid, :cid, :itype, :sent, :topics::jsonb, now())
            """
        )
        await db.execute(
            q,
            {
                "uid": user_channel_id,
                "vid": video_id,
                "cid": comment_id,
                "itype": interaction_type,
                "sent": sentiment_result,
                "topics": (topics if topics is not None else []),
            },
        )
        try:
            await db.commit()
        except Exception:
            await db.rollback()
