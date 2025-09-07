"""Social Monitoring & Dashboard composite endpoints."""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.monitoring.coordinator import MonitoringCoordinator
from app.monitoring.ai_analyzer import AIAnalyzer

router = APIRouter()

CACHE_TTL_SECONDS = 300

# Simple in-process cache (single-instance); replace with Redis for multi-instance
_dashboard_cache: Dict[str, Dict[str, Any]] = {}


def _cache_key(user_id: UUID, include_comp: bool) -> str:
    return f"dashboard:{user_id}:{int(include_comp)}"


async def _rate_limit(db: AsyncSession, user: User, key: str, limit: int, window_sec: int = 60) -> None:
    # Basic rate limit per user & key using a transient table (or use redis in production)
    await db.execute(
        text(
            """CREATE TABLE IF NOT EXISTS api_rate_limiter (
            user_id uuid, bucket text, window_start timestamptz, count int,
            PRIMARY KEY (user_id, bucket, window_start)
            )"""
        )
    )
    window_start = datetime.utcnow().replace(second=0, microsecond=0)
    res = await db.execute(
        text(
            """INSERT INTO api_rate_limiter (user_id, bucket, window_start, count)
            VALUES (:uid, :b, :ws, 1)
            ON CONFLICT (user_id, bucket, window_start)
            DO UPDATE SET count = api_rate_limiter.count + 1
            RETURNING count"""
        ),
        {"uid": str(user.id), "b": key, "ws": window_start},
    )
    cnt = res.scalar_one()
    if cnt > limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


@router.get("/dashboard")
async def get_dashboard(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    include_competitors: bool = Query(False),
):
    await _rate_limit(db, current_user, "dashboard", limit=30)

    key = _cache_key(current_user.id, include_competitors)
    cached = _dashboard_cache.get(key)
    now = datetime.utcnow()
    if cached and now - cached["created_at"] < timedelta(seconds=CACHE_TTL_SECONDS):
        return cached["data"]

    # Build composite dashboard
    # Sentiment timeline
    sentiment_rows = await db.execute(
        text(
            "SELECT * FROM get_sentiment_timeline(:uid, now() - interval '7 days', now(), '1 day')"
        ),
        {"uid": str(current_user.id)},
    )
    timeline = [dict(r) for r in sentiment_rows.fetchall()]

    # Active threads
    threads_res = await db.execute(
        text(
            """SELECT id, title, sentiment, mention_count, last_seen_at
            FROM narrative_threads WHERE user_id=:uid ORDER BY last_seen_at DESC NULLS LAST LIMIT 20"""
        ),
        {"uid": str(current_user.id)},
    )
    threads = [dict(r) for r in threads_res.fetchall()]

    # Recent mentions summary
    mentions_res = await db.execute(
        text(
            """SELECT id, platform, text, sentiment, collected_at
            FROM social_mentions WHERE user_id=:uid ORDER BY collected_at DESC LIMIT 50"""
        ),
        {"uid": str(current_user.id)},
    )
    mentions = [dict(r) for r in mentions_res.fetchall()]

    data = {
        "sentiment_timeline": timeline,
        "threads": threads,
        "recent_mentions": mentions,
        "competitors": [],
    }
    if include_competitors:
        comp_res = await db.execute(
            text(
                "SELECT id, name, platform, status, metrics FROM competitor_profiles WHERE user_id=:uid LIMIT 25"
            ),
            {"uid": str(current_user.id)},
        )
        data["competitors"] = [dict(r) for r in comp_res.fetchall()]

    _dashboard_cache[key] = {"created_at": now, "data": data}
    return data


@router.post("/refresh")
async def manual_refresh(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    platform: str = Query("twitter"),
):
    await _rate_limit(db, current_user, "refresh", limit=10)
    coordinator = MonitoringCoordinator(db)
    ok = await coordinator.manual_refresh(current_user.id, platform)
    if not ok:
        raise HTTPException(status_code=429, detail="Refresh quota exceeded")
    eta_minutes = 2
    return {"status": "queued", "eta_minutes": eta_minutes}


@router.get("/narratives")
async def list_narratives(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    status: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    page: int = 1,
    page_size: int = 25,
):
    await _rate_limit(db, current_user, "narratives", limit=60)
    offset = (page - 1) * page_size
    base = "SELECT * FROM narrative_threads WHERE user_id=:uid"
    conds = []
    params: Dict[str, Any] = {"uid": str(current_user.id)}
    if status:
        conds.append("status=:status")
        params["status"] = status
    if platform:
        conds.append("id IN (SELECT thread_id FROM social_mentions WHERE platform=:plat)")
        params["plat"] = platform
    if start:
        conds.append("last_seen_at >= :start")
        params["start"] = start
    if end:
        conds.append("last_seen_at < :end")
        params["end"] = end
    if conds:
        base += " AND " + " AND ".join(conds)
    base += " ORDER BY last_seen_at DESC NULLS LAST LIMIT :limit OFFSET :offset"
    params["limit"] = page_size
    params["offset"] = offset
    res = await db.execute(text(base), params)
    items = [dict(r) for r in res.fetchall()]
    # Sentiment progression (simplified): average per day for threads returned
    prog = []
    for th in items:
        prog_res = await db.execute(
            text(
                """SELECT date_trunc('day', collected_at) d, avg(sentiment) s
                FROM social_mentions WHERE thread_id=:tid GROUP BY 1 ORDER BY 1"""
            ),
            {"tid": th["id"]},
        )
        prog.append({"thread_id": th["id"], "sentiment_timeline": [{"date": r[0], "avg_sentiment": r[1]} for r in prog_res.fetchall()]})
    return {"items": items, "sentiment_progression": prog, "page": page, "page_size": page_size}


@router.get("/mentions")
async def list_mentions(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    platform: Optional[str] = None,
    sentiment_min: Optional[float] = Query(None),
    sentiment_max: Optional[float] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    requires_response: Optional[bool] = Query(None),
    sort: str = Query("recent", regex="^(recent|sentiment|reach)$"),
    page: int = 1,
    page_size: int = 50,
):
    await _rate_limit(db, current_user, "mentions", limit=120)
    offset = (page - 1) * page_size
    base = "SELECT id, platform, text, sentiment, reach_score, collected_at, status FROM social_mentions WHERE user_id=:uid"
    params: Dict[str, Any] = {"uid": str(current_user.id)}
    conds = []
    if platform:
        conds.append("platform=:plat")
        params["plat"] = platform
    if sentiment_min is not None:
        conds.append("sentiment >= :smin")
        params["smin"] = sentiment_min
    if sentiment_max is not None:
        conds.append("sentiment <= :smax")
        params["smax"] = sentiment_max
    if start:
        conds.append("collected_at >= :start")
        params["start"] = start
    if end:
        conds.append("collected_at < :end")
        params["end"] = end
    if requires_response:
        conds.append("id IN (SELECT id FROM social_mentions WHERE toxicity_score > 0.6)")  # placeholder
    if conds:
        base += " AND " + " AND ".join(conds)
    order = {
        "recent": "collected_at DESC",
        "sentiment": "sentiment DESC NULLS LAST",
        "reach": "reach_score DESC NULLS LAST",
    }[sort]
    base += f" ORDER BY {order} LIMIT :limit OFFSET :offset"
    params["limit"] = page_size
    params["offset"] = offset
    res = await db.execute(text(base), params)
    items = [dict(r) for r in res.fetchall()]
    return {"items": items, "page": page, "page_size": page_size}


@router.post("/competitors")
async def add_competitor(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    name: str = Query(...),
    platform: str = Query(...),
    tracking_depth: str = Query("basic", regex="^(basic|detailed|full)$"),
):
    await _rate_limit(db, current_user, "competitors_add", limit=20)
    # Simple existence validation placeholder (ensure not duplicate for user/platform/name)
    existing = await db.execute(
        text(
            "SELECT 1 FROM competitor_profiles WHERE user_id=:uid AND platform=:plat AND name ILIKE :name"
        ),
        {"uid": str(current_user.id), "plat": platform, "name": name},
    )
    if existing.first():
        raise HTTPException(status_code=400, detail="Competitor already tracked")
    await db.execute(
        text(
            """INSERT INTO competitor_profiles (id, user_id, platform, name, status, created_at, updated_at)
            VALUES (gen_random_uuid(), :uid, :plat, :name, 'active', now(), now())"""
        ),
        {"uid": str(current_user.id), "plat": platform, "name": name},
    )
    await db.commit()
    return {"status": "added", "name": name, "platform": platform, "tracking_depth": tracking_depth}


@router.get("/competitors/{comp_id}/comparison")
async def competitor_comparison(
    *,
    comp_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    await _rate_limit(db, current_user, "competitor_cmp", limit=60)
    res = await db.execute(
        text(
            """SELECT c.id, c.name, c.platform, c.metrics FROM competitor_profiles c
            WHERE c.id=:cid AND c.user_id=:uid"""
        ),
        {"cid": str(comp_id), "uid": str(current_user.id)},
    )
    comp = res.first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    # Audience overlap & differences placeholder
    analysis = {
        "audience_overlap_pct": 12.5,
        "key_differences": ["Higher engagement rate", "More frequent posting"],
        "metrics_trend": [],
    }
    return {"competitor": dict(comp), "analysis": analysis}


# --- WebSocket live updates ---
_active_connections: List[WebSocket] = []


async def _broadcast(message: Dict[str, Any]) -> None:
    dead = []
    for ws in _active_connections:
        try:
            await ws.send_text(json.dumps(message, default=str))
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for d in dead:
        if d in _active_connections:
            _active_connections.remove(d)


@router.websocket("/ws/live")
async def ws_live(ws: WebSocket):  # Authentication upgrade needed (e.g. token param)
    await ws.accept()
    _active_connections.append(ws)
    try:
        await ws.send_text(json.dumps({"event": "connected", "ts": datetime.utcnow().isoformat()}))
        while True:
            # Simple ping/pong or receive messages to keep alive
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if ws in _active_connections:
            _active_connections.remove(ws)
