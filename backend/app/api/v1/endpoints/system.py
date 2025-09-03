from __future__ import annotations

from typing import Any, Dict, Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services import system_state as sys_state
from app.tasks.email import send_email
from app.core.config import settings


router = APIRouter()


@router.get("/status")
async def get_status(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    st = await sys_state.get_state(db)
    # include current surge/burst settings best-effort
    try:
        rows = (await db.execute(text("SELECT channel_id, video_id, per_minute, variety_level, enabled, ends_at FROM burst_mode_states WHERE enabled=true ORDER BY started_at DESC LIMIT 10"))).fetchall()
        surge = [
            {
                "channel_id": r[0],
                "video_id": r[1],
                "per_minute": r[2],
                "variety_level": r[3],
                "enabled": r[4],
                "ends_at": r[5],
            }
            for r in rows or []
        ]
    except Exception:
        surge = []
    # last few emergency actions
    actions: List[Dict[str, Any]] = []
    try:
        arows = (await db.execute(text("SELECT action, reason, user_id, created_at, metadata FROM emergency_actions ORDER BY created_at DESC LIMIT 20"))).fetchall()
        actions = [
            {"action": r[0], "reason": r[1], "user_id": r[2], "created_at": r[3], "metadata": r[4]} for r in arows or []
        ]
    except Exception:
        actions = []
    return {
        "status": st.status,
        "paused_until": st.paused_until,
        "test_mode": st.test_mode,
        "auto_pause_on_spike": st.auto_pause_on_spike,
        "surge": surge,
        "recent_actions": actions,
    }


@router.post("/pause")
async def pause_all(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    duration = int(payload.get("duration_minutes") or 60)
    reason = (payload.get("reason") or "").strip() or "manual_pause"
    res = await sys_state.pause(db, reason=reason, duration_minutes=duration, user_id=str(current_user.id), metadata={"source": "api"})
    # fire-and-forget email
    try:
        subject = "Emergency Pause Activated"
        until = res.get("paused_until")
        html = f"""
        <h2>Automation Paused</h2>
        <p>Status: paused</p>
        <p>Reason: {reason}</p>
        <p>Auto-resume: {until or 'manual resume'}</p>
        """
        send_email.delay(current_user.email, subject, html)
    except Exception:
        pass
    return res


@router.post("/resume")
async def resume_all(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    reason = ((payload or {}).get("reason") or "").strip() or "manual_resume"
    return await sys_state.resume(db, reason=reason, user_id=str(current_user.id))


@router.post("/test-mode")
async def set_test_mode(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    enabled = bool(payload.get("enabled"))
    return await sys_state.set_test_mode(db, enabled=enabled, user_id=str(current_user.id))


@router.post("/auto-pause-on-spike")
async def set_auto_pause_on_spike(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    enabled = bool(payload.get("enabled"))
    return await sys_state.set_auto_pause_on_spike(db, enabled=enabled, user_id=str(current_user.id))
