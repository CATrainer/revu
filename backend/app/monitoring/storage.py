"""Storage layer for persisting mentions & updating profiles."""
from __future__ import annotations

from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class Storage:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def store_mentions(self, mentions: List[Dict[str, Any]], *, user_id: UUID, platform: str) -> int:
        if not mentions:
            return 0
        # Insert into social_mentions; embedding omitted if vector extension requires REAL vector length 1536 later.
        # Here we keep simple numeric array representation to adapt later.
        inserted = 0
        for m in mentions:
            await self.session.execute(
                text(
                    """
                    INSERT INTO social_mentions (
                        id, user_id, platform, source_type, external_id, author_handle,
                        author_display_name, author_external_id, text, sentiment, published_at,
                        collected_at, status, tags, embedding, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), :uid, :platform, 'mention', :external_id, :author_handle,
                        :author_handle, :author_external_id, :text, :sentiment, :published_at,
                        now(), 'active', '{}', NULL, now(), now()
                    ) ON CONFLICT DO NOTHING
                    """
                ),
                {
                    "uid": str(user_id),
                    "platform": platform,
                    "external_id": m.get("external_id"),
                    "author_handle": m.get("author_handle"),
                    "author_external_id": m.get("author_external_id"),
                    "text": m.get("text"),
                    "sentiment": m.get("sentiment"),
                    "published_at": m.get("published_at"),
                },
            )
            inserted += 1
        return inserted

    async def touch_profile(self, user_id: UUID, platform: str) -> None:
        await self.session.execute(
            text(
                """
                UPDATE social_profiles
                SET last_synced_at = now(), updated_at = now()
                WHERE user_id = :uid AND platform = :platform
                """
            ),
            {"uid": str(user_id), "platform": platform},
        )
