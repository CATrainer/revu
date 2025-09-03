from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class SystemState:
    status: str  # 'active' | 'paused'
    paused_until: Optional[datetime]
    test_mode: bool
    auto_pause_on_spike: bool
    last_changed_at: Optional[datetime]


async def _ensure_tables(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS system_state (
                id BIGSERIAL PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'active',
                paused_until TIMESTAMPTZ,
                test_mode BOOLEAN NOT NULL DEFAULT FALSE,
                auto_pause_on_spike BOOLEAN NOT NULL DEFAULT TRUE,
                last_changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS emergency_actions (
                id BIGSERIAL PRIMARY KEY,
                action TEXT NOT NULL,
                reason TEXT,
                user_id TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                metadata JSONB
            );
            """
        )
    )
    await db.commit()


async def get_state(db: AsyncSession) -> SystemState:
    await _ensure_tables(db)
    row = (await db.execute(text("SELECT status, paused_until, test_mode, auto_pause_on_spike, last_changed_at FROM system_state ORDER BY id DESC LIMIT 1"))).first()
    if not row:
        # initialize
        await db.execute(text("INSERT INTO system_state (status) VALUES ('active')"))
        await db.commit()
        return SystemState(status="active", paused_until=None, test_mode=False, auto_pause_on_spike=True, last_changed_at=None)
    return SystemState(status=str(row[0] or "active"), paused_until=row[1], test_mode=bool(row[2] or False), auto_pause_on_spike=bool(row[3] or False), last_changed_at=row[4])


async def is_paused(db: AsyncSession) -> bool:
    st = await get_state(db)
    if st.status == "paused":
        if st.paused_until and datetime.now(timezone.utc) >= st.paused_until:
            # auto-resume when time has passed
            await resume(db, reason="auto_resume_timer")
            return False
        return True
    return False


async def pause(db: AsyncSession, *, reason: Optional[str], duration_minutes: Optional[int], user_id: Optional[str], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    await _ensure_tables(db)
    until = None
    if duration_minutes and duration_minutes > 0:
        until = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
    await db.execute(
        text(
            """
            INSERT INTO system_state (status, paused_until, test_mode, auto_pause_on_spike, last_changed_at)
            SELECT 'paused', :until, COALESCE(test_mode, FALSE), COALESCE(auto_pause_on_spike, TRUE), now() FROM system_state
            ORDER BY id DESC LIMIT 1
            """
        ),
        {"until": until},
    )
    await db.execute(
        text("INSERT INTO emergency_actions (action, reason, user_id, metadata) VALUES ('pause', :r, :u, :m::jsonb)"),
        {"r": reason, "u": user_id, "m": metadata or {}},
    )
    await db.commit()
    return {"status": "paused", "paused_until": until.isoformat() if until else None}


async def resume(db: AsyncSession, *, reason: Optional[str], user_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    await _ensure_tables(db)
    await db.execute(
        text(
            """
            INSERT INTO system_state (status, paused_until, test_mode, auto_pause_on_spike, last_changed_at)
            SELECT 'active', NULL, COALESCE(test_mode, FALSE), COALESCE(auto_pause_on_spike, TRUE), now() FROM system_state
            ORDER BY id DESC LIMIT 1
            """
        )
    )
    await db.execute(
        text("INSERT INTO emergency_actions (action, reason, user_id, metadata) VALUES ('resume', :r, :u, :m::jsonb)"),
        {"r": reason, "u": user_id, "m": metadata or {}},
    )
    await db.commit()
    return {"status": "active"}


async def set_test_mode(db: AsyncSession, *, enabled: bool, user_id: Optional[str]) -> Dict[str, Any]:
    await _ensure_tables(db)
    await db.execute(
        text(
            """
            INSERT INTO system_state (status, paused_until, test_mode, auto_pause_on_spike, last_changed_at)
            SELECT COALESCE(status,'active'), COALESCE(paused_until,NULL), :tm, COALESCE(auto_pause_on_spike, TRUE), now() FROM system_state
            ORDER BY id DESC LIMIT 1
            """
        ),
        {"tm": bool(enabled)},
    )
    await db.execute(
        text("INSERT INTO emergency_actions (action, reason, user_id, metadata) VALUES ('set_test_mode', NULL, :u, :m::jsonb)"),
        {"u": user_id, "m": {"enabled": bool(enabled)}},
    )
    await db.commit()
    return {"test_mode": bool(enabled)}


async def set_auto_pause_on_spike(db: AsyncSession, *, enabled: bool, user_id: Optional[str]) -> Dict[str, Any]:
    await _ensure_tables(db)
    await db.execute(
        text(
            """
            INSERT INTO system_state (status, paused_until, test_mode, auto_pause_on_spike, last_changed_at)
            SELECT COALESCE(status,'active'), COALESCE(paused_until,NULL), COALESCE(test_mode,FALSE), :aps, now() FROM system_state
            ORDER BY id DESC LIMIT 1
            """
        ),
        {"aps": bool(enabled)},
    )
    await db.execute(
        text("INSERT INTO emergency_actions (action, reason, user_id, metadata) VALUES ('set_auto_pause_on_spike', NULL, :u, :m::jsonb)"),
        {"u": user_id, "m": {"enabled": bool(enabled)}},
    )
    await db.commit()
    return {"auto_pause_on_spike": bool(enabled)}
