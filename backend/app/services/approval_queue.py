from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils import debug_log


@dataclass
class ApprovalItem:
    id: str
    channel_id: Optional[str]
    response_id: Optional[str]
    payload: Dict[str, Any]
    priority: int
    status: str
    created_at: datetime
    updated_at: datetime
    auto_approve_after: Optional[datetime]
    approved_at: Optional[datetime]
    approved_by: Optional[str]
    reason: Optional[str]
    urgency: bool


class ApprovalQueueService:
    """Manages approval queue for pending AI actions/responses.

    Table: approval_queue (created if missing)
    Columns:
      id TEXT PK,
      channel_id TEXT,
      response_id TEXT,
      payload JSONB,
      priority INT,
      status TEXT,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      auto_approve_after TIMESTAMPTZ NULL,
      approved_at TIMESTAMPTZ NULL,
      approved_by TEXT NULL,
      reason TEXT NULL,
      urgency BOOLEAN DEFAULT FALSE
    """

    def __init__(self) -> None:
        try:
            self._urgent_threshold = int(os.getenv("APPROVAL_URGENT_PRIORITY", "90"))
        except Exception:
            self._urgent_threshold = 90

    async def _ensure_table(self, db: AsyncSession) -> None:
        # Idempotent create; safe on Postgres
        await db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS approval_queue (
                  id TEXT PRIMARY KEY,
                  channel_id TEXT,
                  response_id TEXT,
                  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                  priority INTEGER NOT NULL DEFAULT 0,
                  status TEXT NOT NULL DEFAULT 'pending',
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  auto_approve_after TIMESTAMPTZ NULL,
                  approved_at TIMESTAMPTZ NULL,
                  approved_by TEXT NULL,
                  reason TEXT NULL,
                  urgency BOOLEAN NOT NULL DEFAULT FALSE
                );
                """
            )
        )
        await db.commit()

    def _row_to_item(self, row) -> ApprovalItem:
        m = row._mapping if hasattr(row, "_mapping") else row
        return ApprovalItem(
            id=str(m["id"]),
            channel_id=m.get("channel_id"),
            response_id=m.get("response_id"),
            payload=m.get("payload") or {},
            priority=int(m.get("priority") or 0),
            status=str(m.get("status") or "pending"),
            created_at=m.get("created_at"),
            updated_at=m.get("updated_at"),
            auto_approve_after=m.get("auto_approve_after"),
            approved_at=m.get("approved_at"),
            approved_by=m.get("approved_by"),
            reason=m.get("reason"),
            urgency=bool(m.get("urgency") or False),
        )

    async def add_to_queue(
        self,
        db: AsyncSession,
        *,
        response: Dict[str, Any] | str,
        priority: int = 0,
        auto_approve_after: Optional[datetime] = None,
        channel_id: Optional[str] = None,
        response_id: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> ApprovalItem:
        """Add a response/action to approval queue.

        response: dict or text; stored as JSON payload.
        priority: higher = sooner; priority >= urgent_threshold marks urgency.
        auto_approve_after: optional; auto-approve once reached.
        """
        await self._ensure_table(db)

        # Normalize payload
        payload: Dict[str, Any]
        if isinstance(response, str):
            payload = {"response_text": response}
        else:
            payload = dict(response or {})

        cid = channel_id or payload.get("channel_id") or payload.get("channelId")
        rid = response_id or payload.get("id") or payload.get("response_id")
        urgency = bool(priority >= self._urgent_threshold or payload.get("urgent") is True)

        item_id = str(uuid.uuid4())
        await db.execute(
            text(
                """
                INSERT INTO approval_queue (id, channel_id, response_id, payload, priority, status, created_at, updated_at, auto_approve_after, approved_by, reason, urgency)
                VALUES (:id, :channel_id, :response_id, :payload::jsonb, :priority, 'pending', now(), now(), :auto_after, NULL, :reason, :urgency)
                """
            ),
            {
                "id": item_id,
                "channel_id": cid,
                "response_id": rid,
                "payload": payload,
                "priority": int(priority or 0),
                "auto_after": auto_approve_after,
                "reason": reason,
                "urgency": urgency,
            },
        )
        await db.commit()

        if urgency:
            await self._notify_urgent(db, [
                {
                    "id": item_id,
                    "channel_id": cid,
                    "priority": priority,
                    "payload": payload,
                }
            ])

        if os.getenv("TESTING_MODE", "false").lower() == "true":
            try:
                debug_log.add("approval.add", {"id": item_id, "priority": priority, "urgency": urgency})
            except Exception:
                pass

        # Return inserted row
        res = await db.execute(text("SELECT * FROM approval_queue WHERE id = :id"), {"id": item_id})
        row = res.first()
        return self._row_to_item(row)

    async def get_pending_approvals(
        self,
        db: AsyncSession,
        *,
        channel_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[ApprovalItem]:
        """Return pending items sorted by priority desc, then age (created_at asc)."""
        await self._ensure_table(db)
        params: Dict[str, Any] = {"limit": int(max(1, limit))}
        if channel_id:
            sql = (
                "SELECT * FROM approval_queue WHERE status = 'pending' AND channel_id = :cid "
                "ORDER BY priority DESC, created_at ASC LIMIT :limit"
            )
            params["cid"] = channel_id
        else:
            sql = (
                "SELECT * FROM approval_queue WHERE status = 'pending' "
                "ORDER BY priority DESC, created_at ASC LIMIT :limit"
            )
        res = await db.execute(text(sql), params)
        rows = res.fetchall() or []
        return [self._row_to_item(r) for r in rows]

    async def bulk_approve(
        self,
        db: AsyncSession,
        *,
        response_ids: Sequence[str],
        approved_by: Optional[str] = None,
        approval_reason: Optional[str] = None,
    ) -> int:
        """Approve multiple queued responses by their ids; returns count affected.

        Also logs learning events into automation_learning when available.
        """
        await self._ensure_table(db)
        if not response_ids:
            return 0
        ids = [str(x) for x in response_ids]

        # Update approvals
        res = await db.execute(
            text(
                """
                UPDATE approval_queue
                SET status = 'approved', approved_at = now(), approved_by = COALESCE(:by, approved_by), reason = COALESCE(:reason, reason), updated_at = now()
                WHERE id = ANY(:ids)
                RETURNING id, channel_id, priority, payload
                """
            ),
            {"ids": ids, "by": approved_by, "reason": approval_reason},
        )
        rows = res.fetchall() or []
        await db.commit()

        count = len(rows)

        # Learning: record approvals
        if count:
            try:
                for r in rows:
                    await db.execute(
                        text(
                            """
                            INSERT INTO automation_learning (event_type, details, created_at)
                            VALUES ('approval', :details::jsonb, now())
                            """
                        ),
                        {
                            "details": {
                                "approval_id": str(r._mapping["id"]),
                                "channel_id": r._mapping.get("channel_id"),
                                "priority": r._mapping.get("priority"),
                                "approved_by": approved_by,
                                "reason": approval_reason,
                            }
                        },
                    )
                await db.commit()
            except Exception:
                # Table might not exist; non-fatal
                try:
                    await db.rollback()
                except Exception:
                    pass

        if os.getenv("TESTING_MODE", "false").lower() == "true":
            try:
                debug_log.add("approval.bulk_approve", {"count": count})
            except Exception:
                pass
        return count

    async def auto_approve_expired(self, db: AsyncSession) -> int:
        """Approve items whose auto_approve_after has passed; returns count."""
        await self._ensure_table(db)
        # Select first to include in learning and notifications
        res = await db.execute(
            text(
                """
                SELECT id, channel_id, priority, payload
                FROM approval_queue
                WHERE status = 'pending' AND auto_approve_after IS NOT NULL AND auto_approve_after <= now()
                """
            )
        )
        rows = res.fetchall() or []
        ids = [str(r._mapping["id"]) for r in rows]
        if not ids:
            return 0

        await db.execute(
            text(
                """
                UPDATE approval_queue
                SET status = 'auto_approved', approved_at = now(), updated_at = now()
                WHERE id = ANY(:ids)
                """
            ),
            {"ids": ids},
        )
        await db.commit()

        # Learning: record auto approvals
        try:
            for r in rows:
                await db.execute(
                    text(
                        """
                        INSERT INTO automation_learning (event_type, details, created_at)
                        VALUES ('auto_approval', :details::jsonb, now())
                        """
                    ),
                    {
                        "details": {
                            "approval_id": str(r._mapping["id"]),
                            "channel_id": r._mapping.get("channel_id"),
                            "priority": r._mapping.get("priority"),
                            "reason": "timeout",
                        }
                    },
                )
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

        if os.getenv("TESTING_MODE", "false").lower() == "true":
            try:
                debug_log.add("approval.auto_approve", {"count": len(ids)})
            except Exception:
                pass
        return len(ids)

    async def _notify_urgent(self, db: AsyncSession, items: List[Dict[str, Any]]) -> None:
        """Notify about urgent approvals.

        Current implementation logs and writes to debug_log. Hook here to integrate with webhooks, email, or chat.
        """
        try:
            for it in items:
                logger.warning(
                    "Urgent approval needed id={} channel={} priority={}",
                    it.get("id"),
                    it.get("channel_id"),
                    it.get("priority"),
                )
            if os.getenv("TESTING_MODE", "false").lower() == "true":
                debug_log.add("approval.notify", {"count": len(items)})
        except Exception:
            pass
