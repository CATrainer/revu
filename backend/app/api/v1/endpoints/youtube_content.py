"""YouTube content endpoints: list videos, video details, comments, replies, and sync APIs."""
from __future__ import annotations

from typing import Any, Optional, List, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.youtube_service import YouTubeService
from app.models.youtube import YouTubeConnection, SyncLog
from sqlalchemy import select, desc
from pydantic import BaseModel, Field


router = APIRouter()


@router.get("/videos")
async def list_videos(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    newest_first: bool = Query(True),
    published_after: Optional[str] = Query(None, description="ISO timestamp filter"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to include (e.g., 'youtube,shorts')"),
) -> list[dict[str, Any]]:
    service = YouTubeService(db)
    from datetime import datetime

    published_dt = None
    if published_after:
        try:
            published_dt = datetime.fromisoformat(published_after.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid published_after format")

    return await service.get_user_videos(
        user_id=current_user.id,
        connection_id=connection_id,
        limit=limit,
        offset=offset,
        newest_first=newest_first,
        published_after=published_dt,
        search=search,
    tags=[t.strip() for t in (tags.split(",") if tags else []) if t.strip()] or None,
    )


@router.get("/videos/{video_id}")
async def get_video_details(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    video_id: str,
) -> dict[str, Any]:
    service = YouTubeService(db)
    videos = await service.get_user_videos(
        user_id=current_user.id, connection_id=connection_id, limit=1, offset=0, newest_first=True, search=video_id
    )
    # If searching by video_id didn’t match, return 404
    for v in videos:
        if v.get("video_id") == video_id:
            return v
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")


@router.get("/videos/{video_id}/comments")
async def get_video_comments(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    video_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    newest_first: bool = Query(True),
) -> list[dict[str, Any]]:
    service = YouTubeService(db)
    return await service.get_video_comments(
        user_id=current_user.id,
        connection_id=connection_id,
        youtube_video_id=video_id,
        limit=limit,
        offset=offset,
        newest_first=newest_first,
    )


@router.post("/comments/{comment_id}/heart")
async def set_comment_heart(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    comment_id: str,
    value: bool = Query(True, description="Set to true to heart, false to unheart"),
) -> dict[str, Any]:
    service = YouTubeService(db)
    try:
        ok = await service.set_comment_heart(user_id=current_user.id, connection_id=connection_id, youtube_comment_id=comment_id, value=value)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
        return {"ok": True, "hearted": value}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/comments/{comment_id}/like")
async def set_comment_like(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    comment_id: str,
    value: bool = Query(True, description="Set to true to like, false to unlike"),
) -> dict[str, Any]:
    service = YouTubeService(db)
    try:
        ok = await service.set_comment_like(user_id=current_user.id, connection_id=connection_id, youtube_comment_id=comment_id, value=value)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
        return {"ok": True, "liked": value}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/comments")
async def get_channel_comments_feed(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    newest_first: bool = Query(True),
    parents_only: bool = Query(False),
) -> list[dict[str, Any]]:
    service = YouTubeService(db)
    return await service.get_channel_comments(
        user_id=current_user.id,
        connection_id=connection_id,
        limit=limit,
        offset=offset,
        newest_first=newest_first,
        parents_only=parents_only,
    )


@router.post("/comments/{comment_id}/reply")
async def post_comment_reply(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    comment_id: str,
    text: str = Query(..., description="Reply text"),
) -> dict[str, Any]:
    service = YouTubeService(db)
    try:
        res = await service.reply_to_comment(
            user_id=current_user.id,
            connection_id=connection_id,
            parent_comment_id=comment_id,
            text=text,
        )
        return res
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/comments/{comment_id}")
async def delete_comment(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    comment_id: str,
) -> dict[str, Any]:
    service = YouTubeService(db)
    try:
        ok = await service.delete_comment(
            user_id=current_user.id,
            connection_id=connection_id,
            youtube_comment_id=comment_id,
        )
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ---- Sync models ----
class SyncTriggerRequest(BaseModel):
    connection_id: UUID
    scope: Literal["full", "incremental", "recent_comments"] = Field("full")
    last_sync: Optional[str] = Field(None, description="ISO timestamp for incremental sync override")


class SyncTriggerResponse(BaseModel):
    status: str
    synced_videos: Optional[int] = None
    synced_comments: Optional[int] = None


class SyncLogItem(BaseModel):
    id: UUID
    sync_type: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]
    status: Optional[str]
    videos_synced: Optional[int]
    comments_synced: Optional[int]
    error_message: Optional[str]


class SyncStatusResponse(BaseModel):
    connection_id: UUID
    status: str
    last_synced_at: Optional[str]
    last_log: Optional[SyncLogItem] = None


class SyncHistoryResponse(BaseModel):
    connection_id: UUID
    logs: List[SyncLogItem]


@router.post("/sync/trigger", response_model=SyncTriggerResponse)
async def trigger_sync(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    body: SyncTriggerRequest,
):
    service = YouTubeService(db)
    from datetime import datetime

    last_dt = None
    if body.last_sync:
        try:
            last_dt = datetime.fromisoformat(body.last_sync.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid last_sync format")

    try:
        res = await service.trigger_manual_sync(
            user_id=current_user.id,
            connection_id=body.connection_id,
            scope=body.scope,
            last_sync=last_dt,
        )
        return res  # conforms to SyncTriggerResponse
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
):
    # Ownership check
    conn_q = select(YouTubeConnection).where(YouTubeConnection.id == connection_id)
    conn_res = await db.execute(conn_q)
    conn = conn_res.scalars().first()
    if not conn or conn.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    log_q = (
        select(SyncLog)
        .where(SyncLog.channel_id == connection_id)
        .order_by(desc(SyncLog.started_at))
        .limit(1)
    )
    log_res = await db.execute(log_q)
    last = log_res.scalars().first()

    last_log = (
        SyncLogItem(
            id=last.id,
            sync_type=last.sync_type,
            started_at=last.started_at.isoformat() if last.started_at else None,
            completed_at=last.completed_at.isoformat() if last.completed_at else None,
            status=last.status,
            videos_synced=last.videos_synced,
            comments_synced=last.comments_synced,
            error_message=last.error_message,
        )
        if last
        else None
    )

    return SyncStatusResponse(
        connection_id=connection_id,
        status=conn.connection_status,
        last_synced_at=conn.last_synced_at.isoformat() if conn.last_synced_at else None,
        last_log=last_log,
    )


@router.get("/sync/history", response_model=SyncHistoryResponse)
async def get_sync_history(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    connection_id: UUID = Query(..., description="YouTube connection ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    # Ownership check
    conn_q = select(YouTubeConnection).where(YouTubeConnection.id == connection_id)
    conn_res = await db.execute(conn_q)
    conn = conn_res.scalars().first()
    if not conn or conn.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    q = (
        select(SyncLog)
        .where(SyncLog.channel_id == connection_id)
        .order_by(desc(SyncLog.started_at))
        .limit(limit)
        .offset(offset)
    )
    res = await db.execute(q)
    logs = res.scalars().all()

    items = [
        SyncLogItem(
            id=l.id,
            sync_type=l.sync_type,
            started_at=l.started_at.isoformat() if l.started_at else None,
            completed_at=l.completed_at.isoformat() if l.completed_at else None,
            status=l.status,
            videos_synced=l.videos_synced,
            comments_synced=l.comments_synced,
            error_message=l.error_message,
        )
        for l in logs
    ]
    return SyncHistoryResponse(connection_id=connection_id, logs=items)
