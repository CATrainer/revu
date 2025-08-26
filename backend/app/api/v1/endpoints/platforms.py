"""Unified platforms endpoints.

In demo mode, proxy to the in-memory simulator. Otherwise, would call real APIs.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.platform_simulator_instance import simulator

router = APIRouter(prefix="/platforms", tags=["platforms"])


@router.get("/youtube/comments")
async def get_youtube_comments(
    video_id: str = Query(..., description="Video ID; in demo use DemoContent.id"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
) -> Any:
        # Demo mode removed; return real platforms only
    raise HTTPException(status_code=501, detail="YouTube integration not configured")


@router.get("/instagram/comments")
async def get_instagram_comments(
    post_id: str = Query(..., description="Post/Media ID; in demo use DemoContent.id"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
) -> Any:
        # Demo mode removed; return real platform only
    raise HTTPException(status_code=501, detail="Instagram integration not configured")
