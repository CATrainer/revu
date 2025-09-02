from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.segment_service import SegmentService


router = APIRouter()
segments = SegmentService()


@router.get("")
async def list_segments(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    channel_id: Optional[str] = None,
):
    return await segments.list_segments(db, channel_id=channel_id)


@router.post("/preview")
async def preview_segment(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    definition = payload.get("definition") or {}
    channel_id = payload.get("channel_id")
    limit = int(payload.get("limit") or 12)
    return await segments.preview(db, definition=definition, channel_id=channel_id, limit=limit)


@router.post("")
async def save_segment(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    definition = payload.get("definition") or {}
    channel_id = payload.get("channel_id")
    segment_id = payload.get("id")
    return await segments.save_segment(
        db,
        name=name,
        definition=definition,
        created_by=str(current_user.id) if getattr(current_user, "id", None) else None,
        channel_id=channel_id,
        segment_id=segment_id,
    )


@router.delete("")
async def delete_segment(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    id: str,
):
    if not id:
        raise HTTPException(status_code=400, detail="id is required")
    count = await segments.delete_segment(db, segment_id=id)
    return {"deleted": count}
