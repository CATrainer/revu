from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.early_warning import EarlyWarningService


router = APIRouter()
svc = EarlyWarningService()


@router.get("/alerts")
async def list_recent_alerts(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    channel_id: Optional[str] = None,
    minutes: int = Query(180, ge=15, le=720),
) -> List[Dict[str, Any]]:
    where = ["detected_at >= now() - interval ':m minutes'"]
    params: Dict[str, Any] = {"m": minutes}
    if channel_id:
        where.append("channel_id = :c")
        params["c"] = channel_id
    res = await db.execute(text(f"SELECT channel_id, video_id, message, detected_at, observed_cpm, baseline_cpm, multiplier, projection, cost_impact, actions FROM early_warning_alerts WHERE {' AND '.join(where)} ORDER BY detected_at DESC"), params)
    rows = res.fetchall() or []
    return [
        {
            "channel_id": r[0],
            "video_id": r[1],
            "message": r[2],
            "detected_at": r[3],
            "observed_cpm": float(r[4] or 0),
            "baseline_cpm": float(r[5] or 0),
            "multiplier": float(r[6] or 0),
            "projection": r[7],
            "cost_impact": r[8],
            "actions": r[9],
        }
        for r in rows
    ]


@router.post("/scan")
async def scan_now(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    alerts = await svc.monitor_recent_videos(db)
    return {"alerts": [a.__dict__ for a in alerts]}


@router.post("/action")
async def handle_action(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    action = (payload.get("action") or "").strip()
    channel_id = str(payload.get("channel_id") or "")
    video_id = str(payload.get("video_id") or "")
    if not action or not channel_id or not video_id:
        raise HTTPException(status_code=400, detail="action, channel_id, video_id required")
    res = await svc.handle_action(db, action=action, channel_id=channel_id, video_id=video_id, duration_minutes=int(payload.get("duration_minutes") or 60))
    return res


@router.get("/suggestions")
async def get_surge_suggestions(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    channel_id: str,
    video_id: str,
) -> Dict[str, Any]:
    return await svc.suggestions_for_surge(db, channel_id=channel_id, video_id=video_id)
