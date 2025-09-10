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

try:  # OpenAI optional; degrade gracefully
    from openai import OpenAI  # type: ignore
except Exception:  # noqa: BLE001
    OpenAI = None  # type: ignore

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


async def _chat_context(db: AsyncSession, user_id: UUID) -> Dict[str, Any]:
    # Summaries for context injection (recent sentiment + threads)
    sentiment = await db.execute(
        text(
            "SELECT bucket_start, avg_sentiment FROM get_sentiment_timeline(:uid, now() - interval '3 days', now(), '12 hours') ORDER BY bucket_start DESC LIMIT 6"
        ),
        {"uid": str(user_id)},
    )
    threads = await db.execute(
        text(
            """SELECT title, sentiment, mention_count FROM narrative_threads
            WHERE user_id=:uid ORDER BY last_seen_at DESC NULLS LAST LIMIT 5"""
        ),
        {"uid": str(user_id)},
    )
    return {
        "recent_sentiment": [dict(r) for r in sentiment.fetchall()],
        "top_threads": [dict(r) for r in threads.fetchall()],
    }


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
    items = [dict(r) for r in res.fetchall()]
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
    return {"messages": [dict(r) for r in res.fetchall()], "page": page, "page_size": page_size}


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

    client = OpenAI(api_key=None) if OpenAI else None  # relies on env var inside SDK if None
    model = "gpt-4o-mini"

    async def _finalize(assistant_text: str, tokens: int, latency_ms: int):
        await _insert_message(db, session_id, current_user.id, "assistant", assistant_text, tokens=tokens, latency_ms=latency_ms)
        await db.execute(
            text("UPDATE ai_chat_sessions SET last_message_at=now(), updated_at=now() WHERE id=:sid"),
            {"sid": str(session_id)},
        )
        await db.commit()

    if not stream:
        # Non-streaming simple completion
        assistant_text = "(streaming disabled placeholder response)"
        latency_ms = int((time.perf_counter() - start) * 1000)
        await _finalize(assistant_text, _estimate_tokens(assistant_text), latency_ms)
        return {"message": assistant_text, "latency_ms": latency_ms}

    async def event_stream():
        assistant_text_parts: List[str] = []
        completion_tokens = 0
        if client:
            try:
                resp = client.chat.completions.create(
                    model=model,
                    stream=True,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that knows the user's monitoring dashboard."},
                        *[{"role": h["role"], "content": h["content"]} for h in history],
                        {"role": "user", "content": content},
                    ],
                )
                for chunk in resp:  # type: ignore[assignment]
                    delta = getattr(chunk.choices[0].delta, "content", None)  # type: ignore[attr-defined]
                    if delta:
                        assistant_text_parts.append(delta)
                        completion_tokens += _estimate_tokens(delta)
                        yield f"data: {json.dumps({'delta': delta})}\n\n"
                assistant_text = "".join(assistant_text_parts)
            except Exception as e:  # noqa: BLE001
                assistant_text = f"Error generating response: {e}"  # fallback
        else:
            # Fallback streaming simulation
            fallback = "Assistant response unavailable (no OpenAI client)."
            for seg in fallback.split():
                assistant_text_parts.append(seg + " ")
                await asyncio.sleep(0.05)
                yield f"data: {json.dumps({'delta': seg + ' '})}\n\n"
            assistant_text = "".join(assistant_text_parts)
            completion_tokens = _estimate_tokens(assistant_text)
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
