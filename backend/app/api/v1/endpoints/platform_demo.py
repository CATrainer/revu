"""Endpoints exposing simulated platform APIs for demo mode."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.demo import DemoAccount, DemoContent, DemoComment
from app.services.platform_simulator_instance import simulator

router = APIRouter(prefix="/demo/platform", tags=["demo-platform"])


async def _ensure_account(db: AsyncSession, user: User) -> DemoAccount:
    res = await db.execute(select(DemoAccount).where(DemoAccount.email == user.email))
    acc = res.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Demo account not found")
    return acc


async def _seed_from_demo_comments(db: AsyncSession, content_id_str: str) -> None:
    # If simulator has no comments for this id and a DemoContent exists with that id,
    # seed from DemoComment rows for that content.
    try:
        cid = UUID(content_id_str)
    except Exception:
        return
    if simulator.get_comment_count(content_id_str) > 0:
        return
    res = await db.execute(select(DemoComment).where(DemoComment.content_id == cid))
    comments = list(res.scalars())
    payload = [
        {
            "author": c.author_name or "User",
            "avatar": c.author_avatar or "",
            "text": c.comment_text or "",
            "likes": c.likes_count or 0,
            "published_at": (c.published_at.isoformat() if c.published_at else None),
        }
        for c in comments
    ]
    if payload:
        simulator.set_comments(content_id_str, payload)


# YouTube
@router.get("/youtube/comments")
async def youtube_comments(
    video_id: str = Query(..., description="Use DemoContent.id for demo content"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    await _ensure_account(db, current_user)
    await _seed_from_demo_comments(db, video_id)
    return simulator.youtube_comments_list(video_id)


@router.get("/youtube/channels")
async def youtube_channels(channel_id: str, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)) -> Any:
    await _ensure_account(db, current_user)
    return simulator.youtube_channels_list(channel_id)


@router.get("/youtube/videos")
async def youtube_videos(video_id: str, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)) -> Any:
    await _ensure_account(db, current_user)
    return simulator.youtube_videos_list(video_id)


# Instagram
@router.get("/instagram/media/comments")
async def instagram_media_comments(media_id: str, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)) -> Any:
    await _ensure_account(db, current_user)
    await _seed_from_demo_comments(db, media_id)
    return simulator.instagram_media_comments(media_id)


@router.get("/instagram/user/insights")
async def instagram_user_insights(user_id: str, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)) -> Any:
    await _ensure_account(db, current_user)
    return simulator.instagram_user_insights(user_id)


@router.get("/instagram/account/metrics")
async def instagram_account_metrics(user_id: str, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)) -> Any:
    await _ensure_account(db, current_user)
    return simulator.instagram_account_metrics(user_id)


# TikTok
@router.get("/tiktok/video/comments")
async def tiktok_video_comments(video_id: str, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)) -> Any:
    await _ensure_account(db, current_user)
    await _seed_from_demo_comments(db, video_id)
    return simulator.tiktok_video_comments(video_id)


@router.get("/tiktok/creator/metrics")
async def tiktok_creator_metrics(user_id: str, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)) -> Any:
    await _ensure_account(db, current_user)
    return simulator.tiktok_creator_metrics(user_id)
