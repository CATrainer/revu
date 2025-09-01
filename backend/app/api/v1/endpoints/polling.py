from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/config")
async def get_polling_config(
    *, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_active_user)
):
    """Return the latest polling configuration row (single-channel assumption).

    If none exists, return a disabled default.
    """
    res = await db.execute(
        text(
            """
            SELECT channel_id, polling_enabled, polling_interval_minutes, last_polled_at, updated_at
            FROM polling_config
            ORDER BY updated_at DESC
            LIMIT 1
            """
        )
    )
    row = res.first()
    if not row:
        return {
            "channel_id": None,
            "polling_enabled": False,
            "polling_interval_minutes": 15,
            "last_polled_at": None,
            "updated_at": None,
        }
    return {
        "channel_id": str(row[0]) if row[0] is not None else None,
        "polling_enabled": bool(row[1]),
        "polling_interval_minutes": int(row[2]) if row[2] is not None else 15,
        "last_polled_at": row[3],
        "updated_at": row[4],
    }


@router.put("/config")
async def update_polling_config(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    """Update polling_enabled and/or polling_interval_minutes for the current channel.

    If channel_id is provided, update that row. Otherwise, update the most recently updated row.
    """
    polling_enabled: Optional[bool] = payload.get("polling_enabled")
    polling_interval_minutes: Optional[int] = payload.get("polling_interval_minutes")
    channel_id: Optional[str] = payload.get("channel_id")

    if channel_id:
        res = await db.execute(
            text(
                """
                UPDATE polling_config
                SET polling_enabled = COALESCE(:enabled, polling_enabled),
                    polling_interval_minutes = COALESCE(:interval, polling_interval_minutes),
                    updated_at = now()
                WHERE channel_id = :cid
                RETURNING channel_id, polling_enabled, polling_interval_minutes, last_polled_at, updated_at
                """
            ),
            {"enabled": polling_enabled, "interval": polling_interval_minutes, "cid": str(channel_id)},
        )
        row = res.first()
        if not row:
            raise HTTPException(status_code=404, detail="polling_config not found for channel_id")
    else:
        # Update the most recent row
        res = await db.execute(
            text(
                """
                WITH tgt AS (
                    SELECT channel_id FROM polling_config ORDER BY updated_at DESC LIMIT 1
                )
                UPDATE polling_config pc
                SET polling_enabled = COALESCE(:enabled, pc.polling_enabled),
                    polling_interval_minutes = COALESCE(:interval, pc.polling_interval_minutes),
                    updated_at = now()
                FROM tgt
                WHERE pc.channel_id = tgt.channel_id
                RETURNING pc.channel_id, pc.polling_enabled, pc.polling_interval_minutes, pc.last_polled_at, pc.updated_at
                """
            ),
            {"enabled": polling_enabled, "interval": polling_interval_minutes},
        )
        row = res.first()
        if not row:
            raise HTTPException(status_code=404, detail="No polling_config rows exist to update")

    await db.commit()
    return {
        "channel_id": str(row[0]) if row[0] is not None else None,
        "polling_enabled": bool(row[1]),
        "polling_interval_minutes": int(row[2]) if row[2] is not None else 15,
        "last_polled_at": row[3],
        "updated_at": row[4],
    }


@router.get("/stats")
async def get_polling_stats(
    *, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_active_user)
):
    """Return basic automation/polling stats."""
    q1 = await db.execute(text("SELECT COUNT(1) FROM comments_queue"))
    q2 = await db.execute(text("SELECT COUNT(1) FROM ai_responses"))
    total_comments_processed = int(q1.scalar() or 0)
    responses_generated = int(q2.scalar() or 0)
    return {
        "total_comments_processed": total_comments_processed,
        "responses_generated": responses_generated,
    }
