"""Adapter to present demo data as real reviews/analytics.

Transforms Demo* tables into existing schemas so the UI can
consume a consistent shape when the user is in demo mode.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional
from uuid import UUID as UUID_T

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.demo import DemoAccount, DemoContent, DemoComment
from app.models.location import Location
from app.models.user import User
from app.schemas.analytics import DashboardMetrics


class DemoDataAdapter:
    """Adapts demo data to existing review/comment schemas."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_demo_account(self, user: User) -> Optional[DemoAccount]:
        res = await self.db.execute(select(DemoAccount).where(DemoAccount.email == user.email))
        return res.scalar_one_or_none()

    async def _pick_location_id(self, user: User) -> Optional[UUID_T]:
        # Prefer a real location if the user has one, else fall back to demo account id
        res = await self.db.execute(select(Location).limit(1))
        loc = res.scalar_one_or_none()
        return loc.id if loc else None

    async def get_demo_comments_as_reviews(self, user: User, *, platform: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """Convert DemoComment rows to ReviewListResponse-like dicts.

        Returns a list of dicts accepted by ReviewListResponse.
        """
        acc = await self._get_demo_account(user)
        if not acc:
            return []

        # Join content to filter by platform and map to comments
        stmt = select(DemoComment, DemoContent).join(DemoContent, DemoContent.id == DemoComment.content_id).where(DemoContent.account_id == acc.id)
        if platform:
            stmt = stmt.where(DemoContent.platform == platform)
        stmt = stmt.order_by(DemoComment.published_at.desc()).offset(skip).limit(limit)

        rows = (await self.db.execute(stmt)).all()
        # pick a location id for schema compatibility
        loc_id = await self._pick_location_id(user)
        if not loc_id:
            # fall back to demo account id (UUID) for the required field
            loc_id = acc.id

        def _rating_from_sentiment(sent: Optional[str]) -> int:
            s = (sent or '').lower()
            if s.startswith('pos'):
                return 5
            if s.startswith('neg'):
                return 2
            return 3

        results: List[Dict[str, Any]] = []
        for comment, content in rows:
            results.append(
                {
                    "id": comment.id,
                    "location_id": loc_id,
                    "platform": content.platform or "YouTube",
                    "author_name": comment.author_name or "User",
                    "rating": _rating_from_sentiment(comment.sentiment),
                    "review_text": comment.comment_text or "",
                    "review_reply": comment.response,
                    "published_at": comment.published_at,
                    "sentiment": comment.sentiment,
                    "tags": [],
                    "is_flagged": False,
                    "needs_response": comment.response is None,
                }
            )

        return results

    async def get_demo_dashboard_metrics(self, user: User, *, date_range: int = 30) -> DashboardMetrics:
        acc = await self._get_demo_account(user)
        if not acc:
            return DashboardMetrics(
                avg_rating=0.0,
                total_reviews=0,
                response_rate=0.0,
                reviews_this_week=0,
                pending_responses=0,
                sentiment_score=0.0,
                positive_reviews=0,
                negative_reviews=0,
            )

        since = datetime.utcnow() - timedelta(days=date_range)
        stmt = select(DemoComment, DemoContent).join(DemoContent, DemoContent.id == DemoComment.content_id).where(
            DemoContent.account_id == acc.id,
            DemoComment.published_at >= since,
        )
        rows = (await self.db.execute(stmt)).all()

        total = len(rows)
        sent_counts = Counter((c.sentiment or 'neutral').lower() for c, _ in rows)
        responded = sum(1 for c, _ in rows if c.response)
        pending = sum(1 for c, _ in rows if not c.response)
        last_week = datetime.utcnow() - timedelta(days=7)
        week_count = sum(1 for c, _ in rows if (c.published_at or datetime.utcnow()) >= last_week)

        def rating_from_sent(sent: Optional[str]) -> int:
            s = (sent or '').lower()
            if s.startswith('pos'):
                return 5
            if s.startswith('neg'):
                return 2
            return 3

        if total:
            avg_rating = sum(rating_from_sent(c.sentiment) for c, _ in rows) / total
        else:
            avg_rating = 0.0

        # Simple sentiment score 0-100 similar to analytics.calculate_sentiment_score
        positive = sent_counts.get('positive', 0)
        negative = sent_counts.get('negative', 0)
        neutral = sent_counts.get('neutral', 0)
        sentiment_score = 0.0
        if total:
            score = (positive * 1.0 + negative * -1.0 + neutral * 0.2) / total
            sentiment_score = max(0.0, min(100.0, (score + 1) * 50))

        response_rate = (responded / total * 100.0) if total else 0.0

        return DashboardMetrics(
            avg_rating=float(round(avg_rating, 2)),
            total_reviews=total,
            response_rate=response_rate,
            reviews_this_week=week_count,
            pending_responses=pending,
            sentiment_score=sentiment_score,
            positive_reviews=positive,
            negative_reviews=negative,
        )

    async def get_demo_locations(self, user: User) -> List[Dict[str, Any]]:
        """Return mock locations for demo personas.

        For creators: treat channels/profiles as locations. For agencies: mock client accounts.
        """
        acc = await self._get_demo_account(user)
        if not acc:
            return []
        persona = (acc.persona_type or "creator").lower()
        base = str(acc.id)
        if persona == "creator":
            return [
                {"id": base, "name": "Main Channel", "kind": "creator_profile"},
                {"id": base + "-ig", "name": "Instagram", "kind": "creator_profile"},
            ]
        if persona == "agency_creators":
            return [
                {"id": base + "-c1", "name": "Client A (Creator)", "kind": "agency_client"},
                {"id": base + "-c2", "name": "Client B (Creator)", "kind": "agency_client"},
            ]
        # agency_businesses or other
        return [
            {"id": base + "-b1", "name": "Client A (Business)", "kind": "agency_client"},
            {"id": base + "-b2", "name": "Client B (Business)", "kind": "agency_client"},
        ]
