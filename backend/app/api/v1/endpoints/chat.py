"""Chat API with session management, streaming, and context awareness."""
from __future__ import annotations

import json
import time
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    Body,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User

try:  # Anthropic for Claude API
    from anthropic import Anthropic  # type: ignore
except Exception:  # noqa: BLE001
    Anthropic = None  # type: ignore

import os
from app.core.config import settings

router = APIRouter()

# In-memory websocket session map {session_id: {"connections": [...], "buffer": []}}
_ws_sessions: Dict[str, Dict[str, Any]] = {}

# Simple rate limiting table reused (api_rate_limiter) created elsewhere
async def _rate_limit(db: AsyncSession, user: User, key: str, limit: int, window_sec: int = 60) -> None:
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


def _serialize_value(value: Any) -> Any:
    """Convert non-JSON-serializable values to JSON-compatible types."""
    if isinstance(value, datetime):
        return value.isoformat()
    elif isinstance(value, (UUID, bytes)):
        return str(value)
    return value


async def _chat_context(db: AsyncSession, user_id: UUID) -> Dict[str, Any]:
    """Get context for chat - gracefully handles missing database functions/tables."""
    context: Dict[str, Any] = {
        "recent_sentiment": [],
        "top_threads": [],
    }
    
    # Try to get sentiment data if available
    try:
        sentiment = await db.execute(
            text(
                "SELECT bucket_start, avg_sentiment FROM get_sentiment_timeline(:uid, now() - interval '3 days', now(), '12 hours') ORDER BY bucket_start DESC LIMIT 6"
            ),
            {"uid": str(user_id)},
        )
        # Convert rows to dicts and serialize datetime objects
        context["recent_sentiment"] = [
            {k: _serialize_value(v) for k, v in dict(r._mapping).items()}
            for r in sentiment.fetchall()
        ]
    except Exception as e:
        # Sentiment function may not exist - that's okay
        from loguru import logger
        logger.debug(f"Could not fetch sentiment context: {e}")
    
    # Try to get narrative threads if available
    try:
        threads = await db.execute(
            text(
                """SELECT title, sentiment, mention_count FROM narrative_threads
                WHERE user_id=:uid ORDER BY last_seen_at DESC NULLS LAST LIMIT 5"""
            ),
            {"uid": str(user_id)},
        )
        # Convert rows to dicts and serialize datetime objects
        context["top_threads"] = [
            {k: _serialize_value(v) for k, v in dict(r._mapping).items()}
            for r in threads.fetchall()
        ]
    except Exception as e:
        # Narrative threads table may not exist - that's okay
        from loguru import logger
        logger.debug(f"Could not fetch threads context: {e}")
    
    return context


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


async def _insert_message(db: AsyncSession, session_id: UUID, user_id: UUID, role: str, content: str, tokens: Optional[int] = None, latency_ms: Optional[int] = None) -> UUID:
    res = await db.execute(
        text(
            """INSERT INTO ai_chat_messages (id, session_id, user_id, role, content, tokens, latency_ms, created_at)
            VALUES (gen_random_uuid(), :sid, :uid, :role, :content, :tokens, :latency, now()) RETURNING id"""
        ),
        {"sid": str(session_id), "uid": str(user_id), "role": role, "content": content, "tokens": tokens, "latency": latency_ms},
    )
    return res.scalar_one()


# -------------------- Endpoints --------------------

@router.post("/sessions")
async def create_session(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    title: Optional[str] = Body(None),
    mode: str = Body("general"),
):
    await _rate_limit(db, current_user, "chat_create", 30)
    ctx = await _chat_context(db, current_user.id)
    res = await db.execute(
        text(
            """INSERT INTO ai_chat_sessions (id, user_id, title, context_tags, system_prompt, mode, status, created_at, updated_at)
            VALUES (gen_random_uuid(), :uid, :title, :tags, :prompt, :mode, 'active', now(), now()) RETURNING id"""
        ),
        {
            "uid": str(current_user.id),
            "title": title or "New Chat",
            "tags": list({"dashboard", "monitoring"}),
            "prompt": json.dumps(ctx),
            "mode": mode,
        },
    )
    sid = res.scalar_one()
    await db.commit()
    return {"session_id": sid}


@router.get("/sessions")
async def list_sessions(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    page: int = 1,
    page_size: int = 20,
):
    await _rate_limit(db, current_user, "chat_list", 60)
    offset = (page - 1) * page_size
    res = await db.execute(
        text(
            """SELECT s.id, s.title, s.mode, s.status, s.created_at, s.updated_at,
            (SELECT count(*) FROM ai_chat_messages m WHERE m.session_id=s.id) AS message_count,
            (SELECT max(created_at) FROM ai_chat_messages m WHERE m.session_id=s.id) AS last_activity
            FROM ai_chat_sessions s WHERE s.user_id=:uid AND s.status='active'
            ORDER BY last_activity DESC NULLS LAST, s.created_at DESC
            LIMIT :limit OFFSET :offset"""
        ),
        {"uid": str(current_user.id), "limit": page_size, "offset": offset},
    )
    items = [
        {k: _serialize_value(v) for k, v in dict(r._mapping).items()}
        for r in res.fetchall()
    ]
    return {"items": items, "page": page, "page_size": page_size}


@router.get("/messages/{session_id}")
async def get_messages(
    *,
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    page: int = 1,
    page_size: int = 50,
):
    await _rate_limit(db, current_user, "chat_history", 120)
    # Validate ownership
    own = await db.execute(
        text("SELECT 1 FROM ai_chat_sessions WHERE id=:sid AND user_id=:uid"),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    if not own.first():
        raise HTTPException(status_code=404, detail="Session not found")
    offset = (page - 1) * page_size
    res = await db.execute(
        text(
            """SELECT id, role, content, tokens, latency_ms, created_at FROM ai_chat_messages
            WHERE session_id=:sid ORDER BY created_at ASC LIMIT :limit OFFSET :offset"""
        ),
        {"sid": str(session_id), "limit": page_size, "offset": offset},
    )
    messages = [
        {k: _serialize_value(v) for k, v in dict(r._mapping).items()}
        for r in res.fetchall()
    ]
    return {"messages": messages, "page": page, "page_size": page_size}


@router.delete("/sessions/{session_id}")
async def delete_session(
    *,
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    await _rate_limit(db, current_user, "chat_delete", 20)
    await db.execute(
        text("DELETE FROM ai_chat_messages WHERE session_id=:sid AND user_id=:uid"),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    await db.execute(
        text("DELETE FROM ai_chat_sessions WHERE id=:sid AND user_id=:uid"),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    await db.commit()
    return {"deleted": str(session_id)}


# --------------- Streaming Chat Message Endpoint ---------------

@router.post("/messages")
async def send_message(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    session_id: UUID = Body(...),
    content: str = Body(...),
    stream: bool = Query(True),
):
    await _rate_limit(db, current_user, "chat_send", 120)
    # Validate session
    own = await db.execute(
        text("SELECT 1 FROM ai_chat_sessions WHERE id=:sid AND user_id=:uid"),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    if not own.first():
        raise HTTPException(status_code=404, detail="Session not found")

    start = time.perf_counter()
    user_tokens = _estimate_tokens(content)
    await _insert_message(db, session_id, current_user.id, "user", content, tokens=user_tokens)

    # Build context (last 20 messages)
    history_res = await db.execute(
        text(
            "SELECT role, content FROM ai_chat_messages WHERE session_id=:sid ORDER BY created_at DESC LIMIT 20"
        ),
        {"sid": str(session_id)},
    )
    history = [dict(r) for r in history_res.fetchall()][::-1]

    # Use Claude/Anthropic client
    api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
    client = Anthropic(api_key=api_key) if Anthropic and api_key else None
    model = getattr(settings, "CLAUDE_MODEL", None) or os.getenv("CLAUDE_MODEL") or "claude-3-5-sonnet-latest"

    async def _finalize(assistant_text: str, tokens: int, latency_ms: int):
        await _insert_message(db, session_id, current_user.id, "assistant", assistant_text, tokens=tokens, latency_ms=latency_ms)
        await db.execute(
            text("UPDATE ai_chat_sessions SET last_message_at=now(), updated_at=now() WHERE id=:sid"),
            {"sid": str(session_id)},
        )
        await db.commit()

    if not stream:
        # Non-streaming Claude completion
        if client:
            try:
                messages = []
                for h in history:
                    if h["role"] in ["user", "assistant"]:
                        messages.append({"role": h["role"], "content": h["content"]})
                messages.append({"role": "user", "content": content})
                
                system_prompt = (
                    "You are Repruv AI, a helpful assistant for content creators and influencers. "
                    "You help with content strategy, audience insights, social media management, and creative ideas. "
                    "Be friendly, concise, and actionable in your responses."
                )
                
                response = client.messages.create(
                    model=model,
                    max_tokens=int(os.getenv("CLAUDE_MAX_TOKENS", "1024")),
                    system=system_prompt,
                    messages=messages,
                    temperature=0.7,
                )
                
                # Extract text from Claude response
                content_blocks = getattr(response, "content", [])
                if isinstance(content_blocks, list) and content_blocks:
                    first_block = content_blocks[0]
                    assistant_text = getattr(first_block, "text", None) or ""
                else:
                    assistant_text = "I apologize, but I couldn't generate a response."
                    
            except Exception as e:
                assistant_text = "I apologize, but I encountered an error. Please try again."
        else:
            assistant_text = "I'm currently unavailable. Please check your API configuration."
        
        latency_ms = int((time.perf_counter() - start) * 1000)
        await _finalize(assistant_text, _estimate_tokens(assistant_text), latency_ms)
        return {"message": assistant_text, "latency_ms": latency_ms}

    async def event_stream():
        assistant_text_parts: List[str] = []
        completion_tokens = 0
        if client:
            try:
                # Build messages for Claude - filter out system messages from history
                messages = []
                for h in history:
                    if h["role"] in ["user", "assistant"]:
                        messages.append({"role": h["role"], "content": h["content"]})
                messages.append({"role": "user", "content": content})
                
                # Claude API with streaming
                system_prompt = (
                    "You are Repruv AI, a helpful assistant for content creators and influencers. "
                    "You help with content strategy, audience insights, social media management, and creative ideas. "
                    "Be friendly, concise, and actionable in your responses."
                )
                
                with client.messages.stream(
                    model=model,
                    max_tokens=int(os.getenv("CLAUDE_MAX_TOKENS", "1024")),
                    system=system_prompt,
                    messages=messages,
                    temperature=0.7,
                ) as stream:
                    for text in stream.text_stream:
                        assistant_text_parts.append(text)
                        completion_tokens += _estimate_tokens(text)
                        yield f"data: {json.dumps({'delta': text})}\n\n"
                
                assistant_text = "".join(assistant_text_parts)
            except Exception as e:  # noqa: BLE001
                assistant_text = f"I apologize, but I encountered an error. Please try again."  # fallback
                yield f"data: {json.dumps({'delta': assistant_text})}\n\n"
        else:
            # Fallback when Claude client not available
            fallback = "I'm currently unavailable. Please check your API configuration."
            assistant_text_parts.append(fallback)
            assistant_text = fallback
            completion_tokens = _estimate_tokens(assistant_text)
            yield f"data: {json.dumps({'delta': assistant_text})}\n\n"
        
        latency_ms = int((time.perf_counter() - start) * 1000)
        await _finalize(assistant_text, completion_tokens, latency_ms)
        yield f"data: {json.dumps({'event': 'done', 'latency_ms': latency_ms})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ---------------- WebSocket real-time chat ----------------

@router.websocket("/ws")
async def chat_ws(socket: WebSocket):  # Token auth could be added via query param
    await socket.accept()
    current_session: Optional[str] = None
    try:
        await socket.send_text(json.dumps({"event": "connected"}))
        while True:
            msg = await socket.receive_text()
            # Expect JSON messages
            try:
                payload = json.loads(msg)
            except Exception:  # noqa: BLE001
                await socket.send_text(json.dumps({"error": "invalid_json"}))
                continue
            action = payload.get("action")
            if action == "join":
                current_session = payload.get("session_id")
                if current_session not in _ws_sessions:
                    _ws_sessions[current_session] = {"connections": []}
                _ws_sessions[current_session]["connections"].append(socket)
                await socket.send_text(json.dumps({"event": "joined", "session_id": current_session}))
            elif action == "message":
                if not current_session:
                    await socket.send_text(json.dumps({"error": "not_in_session"}))
                    continue
                # Broadcast locally only (server cluster would need pub/sub)
                m = {"event": "message", "content": payload.get("content"), "session_id": current_session}
                for ws in list(_ws_sessions.get(current_session, {}).get("connections", [])):
                    try:
                        await ws.send_text(json.dumps(m))
                    except Exception:  # noqa: BLE001
                        pass
            else:
                await socket.send_text(json.dumps({"error": "unknown_action"}))
    except WebSocketDisconnect:
        pass
    finally:
        if current_session and current_session in _ws_sessions:
            conns = _ws_sessions[current_session]["connections"]
            if socket in conns:
                conns.remove(socket)
            if not conns:
                del _ws_sessions[current_session]
