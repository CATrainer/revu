from __future__ import annotations

from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class DigestService:
    async def _ensure_tables(self, db: AsyncSession) -> None:
        await db.execute(text(
            """
            CREATE TABLE IF NOT EXISTS notification_prefs (
                user_id TEXT PRIMARY KEY,
                weekly_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS weekly_digests (
                id BIGSERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                sent_at TIMESTAMPTZ NULL
            );
            """
        ))
        await db.commit()

    async def _load_quick_wins(self, db: AsyncSession, *, user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        # load mutes
        mutes = (await db.execute(text("SELECT suggestion_type, rule_id FROM suggestion_mutes WHERE user_id = :uid"), {"uid": user_id})).mappings().all() or []
        mute_set = {(m.get("suggestion_type"), m.get("rule_id")) for m in mutes}
        # top recent pending suggestions
        rows = (await db.execute(text(
            """
            SELECT id, suggestion_type, rule_id, before, after, explanation, why, require_approval, created_at
            FROM auto_learning_suggestions
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT :limit
            """
        ), {"limit": max(1, min(10, limit))})).mappings().all() or []
        out: List[Dict[str, Any]] = []
        for r in rows:
            key_any = (r.get("suggestion_type"), None)
            key_rule = (r.get("suggestion_type"), r.get("rule_id"))
            if key_any in mute_set or key_rule in mute_set:
                continue
            out.append({
                "id": int(r.get("id")),
                "rule_id": r.get("rule_id"),
                "title": f"{(r.get('suggestion_type') or 'optimization').replace('_',' ').title()}" + (f" · Rule {r.get('rule_id')}" if r.get('rule_id') else ""),
                "description": r.get("why") or r.get("explanation") or "Suggested optimization",
            })
        return out

    async def generate_weekly_digests(self, db: AsyncSession) -> int:
        """Generate digest records for all users who opted in. Returns count created."""
        await self._ensure_tables(db)
        rows = (await db.execute(text("SELECT user_id FROM notification_prefs WHERE weekly_digest_enabled = TRUE"))).fetchall() or []
        count = 0
        for r in rows:
            uid = str(r[0])
            wins = await self._load_quick_wins(db, user_id=uid, limit=3)
            if not wins:
                continue
            subject = "Revu: 3 ways to improve your automation this week"
            # simple text body; real system would render HTML and send email
            parts = ["Here are 3 quick wins we think you'll like:"]
            for i, w in enumerate(wins, start=1):
                parts.append(f"{i}. {w['title']} — {w['description']}")
            parts.append("You can mute suggestions you don't want to see again.")
            body = "\n".join(parts)
            await db.execute(text("INSERT INTO weekly_digests (user_id, subject, body) VALUES (:u, :s, :b)"), {"u": uid, "s": subject, "b": body})
            count += 1
        await db.commit()
        return count

    async def preview_for_user(self, db: AsyncSession, *, user_id: str) -> Dict[str, Any]:
        await self._ensure_tables(db)
        wins = await self._load_quick_wins(db, user_id=user_id, limit=3)
        subject = "Revu: 3 ways to improve your automation this week"
        parts = ["Here are 3 quick wins we think you'll like:"]
        for i, w in enumerate(wins, start=1):
            parts.append(f"{i}. {w['title']} — {w['description']}")
        parts.append("You can mute suggestions you don't want to see again.")
        return {"subject": subject, "body": "\n".join(parts), "items": wins}
