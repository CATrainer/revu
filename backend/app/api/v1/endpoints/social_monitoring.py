"""Social Monitoring & Dashboard composite endpoints."""
from __future__ import annotations

import json
import asyncio
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger

_active_connections: List[WebSocket] = []
# Track per-connection metadata
_ws_clients: Dict[int, Dict[str, Any]] = {}
_next_conn_id = 1

# Simple connection metrics (in-memory single instance). Consider Redis for multi-instance.
_ws_metrics: Dict[str, Any] = {
    "connections_total": 0,
    "messages_received": 0,
    "pings_sent": 0,
    "pongs_received": 0,
    "disconnects": 0,
    "last_event_ts": None,
    "closes_by_code": {},  # code -> count
}
MAX_CONNECTIONS = 100  # soft cap to prevent resource exhaustion
PING_INTERVAL = 25  # seconds between server pings if no client traffic
IDLE_TIMEOUT = 300  # idle seconds before closing connection
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
async def ws_live(ws: WebSocket):
    """Live WebSocket with heartbeat, capacity guard, and idle timeout.

    TODO:
      - Auth (token / session)
      - Redis pub/sub fan-out for multi-instance scaling
      - Subscription filters per user
    """
    if len(_active_connections) >= MAX_CONNECTIONS:
        await ws.close(code=1013, reason="Capacity reached")
        return

    global _next_conn_id  # noqa: PLW0603
    await ws.accept()
    conn_id = _next_conn_id
    _next_conn_id += 1
    _active_connections.append(ws)
    client_host = getattr(ws.client, 'host', None)
    _ws_metrics["connections_total"] += 1
    _ws_metrics["last_event_ts"] = datetime.utcnow().isoformat()
    _ws_clients[conn_id] = {
        "id": conn_id,
        "connected_at": time.time(),
        "last_activity": time.time(),
        "client_host": client_host,
        "messages": 0,
    }
    token = ws.query_params.get("token")
    debug_flag = ws.query_params.get("debug") == "1"
    if debug_flag:
        logger.info("WS[{}] connected host={} token_present={} active_conns={}", conn_id, client_host, bool(token), len(_active_connections))
    else:
        logger.debug("WS live connected id={} token_present={} active_conns={}", conn_id, bool(token), len(_active_connections))

    await ws.send_text(json.dumps({"event": "connected", "ts": datetime.utcnow().isoformat()}))
    last_activity = time.time()
    try:
        while True:
            try:
                # Allow slight jitter so all clients don't align pings
                timeout = PING_INTERVAL + (0.2 * PING_INTERVAL * (hash(str(id(ws))) % 100) / 100.0 - 0.1 * PING_INTERVAL)
                msg = await asyncio.wait_for(ws.receive_text(), timeout=timeout)
                _ws_metrics["messages_received"] += 1
                last_activity = time.time()
                meta = _ws_clients.get(conn_id)
                if meta:
                    meta["last_activity"] = last_activity
                    meta["messages"] += 1
                raw = msg
                # Normalize JSON wrapped string values (e.g. "pong")
                if raw.startswith('"') and raw.endswith('"') and len(raw) < 20:
                    raw = raw.strip('"')
                if raw == "ping":  # client-initiated ping
                    await ws.send_text(json.dumps({"event": "pong", "ts": datetime.utcnow().isoformat(), "server": True}))
                    _ws_metrics["pongs_received"] += 1
                elif raw == "pong":  # reply to our ping
                    _ws_metrics["pongs_received"] += 1
                elif debug_flag and meta and meta["messages"] <= 5:
                    logger.info("WS[{}] first_messages raw={} len={}", conn_id, raw[:80], len(raw))
            except asyncio.TimeoutError:
                now = time.time()
                if now - last_activity > IDLE_TIMEOUT:
                    await ws.close(code=1000, reason="Idle timeout")
                    break
                try:
                    await ws.send_text(json.dumps({"event": "ping", "ts": datetime.utcnow().isoformat(), "server": True}))
                    _ws_metrics["pings_sent"] += 1
                    _ws_metrics["last_event_ts"] = datetime.utcnow().isoformat()
                except Exception:
                    break
            except WebSocketDisconnect:
                break
            except Exception:
                logger.exception("WS live unexpected error id={}", conn_id)
                break
    finally:
        if ws in _active_connections:
            _active_connections.remove(ws)
        _ws_metrics["disconnects"] += 1
        _ws_metrics["last_event_ts"] = datetime.utcnow().isoformat()
        code = getattr(ws, "close_code", None)
        if code is not None:
            _ws_metrics["closes_by_code"][str(code)] = _ws_metrics["closes_by_code"].get(str(code), 0) + 1
        meta = _ws_clients.pop(conn_id, None)
        dur = 0.0
        if meta:
            dur = time.time() - meta.get("connected_at", time.time())
        logger.debug("WS live disconnected id={} active_conns={} dur={:.1f}s code={}", conn_id, len(_active_connections), dur, code)


@router.get("/ws/metrics")
async def websocket_metrics():
    """Return current in-memory WebSocket metrics (single instance)."""
    return {
        **_ws_metrics,
        "active_connections": len(_active_connections),
        "clients": [
            {
                "id": m.get("id"),
                "client_host": m.get("client_host"),
                "uptime_s": round(time.time() - m.get("connected_at", time.time()), 1),
                "last_activity_s": round(time.time() - m.get("last_activity", time.time()), 1),
                "messages": m.get("messages"),
            }
            for m in list(_ws_clients.values())[:50]
        ],
        "max_connections": MAX_CONNECTIONS,
        "idle_timeout_seconds": IDLE_TIMEOUT,
        "ping_interval_seconds": PING_INTERVAL,
    }
