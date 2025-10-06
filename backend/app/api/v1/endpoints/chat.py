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
from pydantic import BaseModel

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.rag import get_rag_context_for_chat

try:  # Anthropic for Claude API
    from anthropic import Anthropic  # type: ignore
except Exception:  # noqa: BLE001
    Anthropic = None  # type: ignore

import os
from app.core.config import settings

router = APIRouter()

# Request models
class SendMessageRequest(BaseModel):
    session_id: UUID
    content: str


async def _get_performance_context(user_id: UUID, db: AsyncSession) -> str:
    """Get user's content performance data to enhance AI responses."""
    try:
        # Check if user has any performance data
        perf_check = await db.execute(
            text("""
                SELECT COUNT(*) as count
                FROM user_content_performance
                WHERE user_id = :uid
            """),
            {"uid": str(user_id)}
        )
        
        count = perf_check.scalar_one()
        if count == 0:
            return ""
        
        # Get performance summary
        summary = await db.execute(
            text("""
                SELECT 
                    platform,
                    COUNT(*) as video_count,
                    AVG(engagement_rate) as avg_engagement,
                    SUM(views) as total_views,
                    MAX(engagement_rate) as best_engagement
                FROM user_content_performance
                WHERE user_id = :uid
                AND posted_at > NOW() - INTERVAL '30 days'
                GROUP BY platform
            """),
            {"uid": str(user_id)}
        )
        
        platforms_data = []
        for row in summary.fetchall():
            platforms_data.append(
                f"{row.platform.title()}: {row.video_count} videos, "
                f"{row.avg_engagement:.1f}% avg engagement, "
                f"{row.total_views:,} total views"
            )
        
        if not platforms_data:
            return ""
        
        # Get top performing content
        top_content = await db.execute(
            text("""
                SELECT caption, engagement_rate, views
                FROM user_content_performance
                WHERE user_id = :uid
                AND posted_at > NOW() - INTERVAL '30 days'
                ORDER BY engagement_rate DESC
                LIMIT 3
            """),
            {"uid": str(user_id)}
        )
        
        top_videos = []
        for video in top_content.fetchall():
            if video.caption:
                top_videos.append(
                    f'"{video.caption[:50]}..." ({video.engagement_rate:.1f}% engagement, {video.views:,} views)'
                )
        
        context = "\n\n📊 User's Recent Performance:\n"
        context += "\n".join(f"- {data}" for data in platforms_data)
        
        if top_videos:
            context += "\n\nTop Performing Content:\n"
            context += "\n".join(f"- {video}" for video in top_videos)
        
        context += "\n\nUse this data to provide personalized, data-driven recommendations."
        
        return context
        
    except Exception as e:
        # Silently fail - performance context is optional
        return ""

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
        "user_context": None,
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
    
    # Get user AI context if available
    try:
        from sqlalchemy import select
        from app.models.ai_context import UserAIContext
        
        result = await db.execute(
            select(UserAIContext).where(UserAIContext.user_id == user_id)
        )
        ai_context = result.scalar_one_or_none()
        
        if ai_context:
            context["user_context"] = ai_context.to_context_string()
    except Exception as e:
        from loguru import logger
        logger.debug(f"Could not fetch user AI context: {e}")
    
    return context


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


async def _insert_message(db: AsyncSession, session_id: UUID, user_id: UUID, role: str, content: str, tokens: Optional[int] = None, latency_ms: Optional[int] = None, status: str = "completed", is_streaming: bool = False) -> UUID:
    """Insert a new message with status tracking."""
    res = await db.execute(
        text(
            """INSERT INTO ai_chat_messages (id, session_id, user_id, role, content, tokens, latency_ms, status, is_streaming, created_at, last_updated)
            VALUES (gen_random_uuid(), :sid, :uid, :role, :content, :tokens, :latency, :status, :streaming, now(), now()) RETURNING id"""
        ),
        {"sid": str(session_id), "uid": str(user_id), "role": role, "content": content, "tokens": tokens, "latency": latency_ms, "status": status, "streaming": is_streaming},
    )
    return res.scalar_one()


async def _update_message_content(db: AsyncSession, message_id: UUID, content: str, status: str = "generating") -> None:
    """Update message content incrementally during streaming."""
    await db.execute(
        text(
            """UPDATE ai_chat_messages 
            SET content = :content, status = :status, last_updated = now()
            WHERE id = :mid"""
        ),
        {"mid": str(message_id), "content": content, "status": status},
    )
    await db.commit()


async def _finalize_message(db: AsyncSession, message_id: UUID, tokens: int, latency_ms: int) -> None:
    """Mark message as complete and set final metadata."""
    await db.execute(
        text(
            """UPDATE ai_chat_messages 
            SET status = 'completed', is_streaming = false, tokens = :tokens, latency_ms = :latency, last_updated = now()
            WHERE id = :mid"""
        ),
        {"mid": str(message_id), "tokens": tokens, "latency": latency_ms},
    )
    await db.commit()


async def _generate_thread_intro(db: AsyncSession, user_id: UUID, session_id: UUID, parent_session_id: str, branch_name: str) -> str:
    """Generate an initial AI message for a new thread to further the conversation."""
    try:
        # Get context from parent conversation
        parent_history = await db.execute(
            text(
                "SELECT role, content FROM ai_chat_messages WHERE session_id=:pid ORDER BY created_at DESC LIMIT 5"
            ),
            {"pid": parent_session_id},
        )
        history = [dict(r._mapping) for r in parent_history.fetchall()][::-1]
        
        # Use Claude to generate thread intro
        api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
        client = Anthropic(api_key=api_key) if Anthropic and api_key else None
        
        if not client:
            return f"Let's explore {branch_name}. What would you like to know?"
        
        # Build prompt for thread intro
        system_prompt = (
            "You are Repruv AI. The user just created a new conversation thread to explore a specific topic. "
            "Generate a brief, engaging opening message (2-3 sentences) that:"
            "1. Acknowledges the new thread topic\n"
            "2. Shows you understand the context from the parent conversation\n"
            "3. Invites the user to continue the discussion\n"
            "Be warm, concise, and actionable. Do not use phrases like 'I see you want to' or 'I notice'."
        )
        
        messages = []
        for h in history[-3:]:  # Last 3 messages for context
            if h["role"] in ["user", "assistant"]:
                messages.append({"role": h["role"], "content": h["content"]})
        
        messages.append({
            "role": "user",
            "content": f"I want to start a new thread about: {branch_name}"
        })
        
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=200,
            system=system_prompt,
            messages=messages,
            temperature=0.8,
        )
        
        content_blocks = getattr(response, "content", [])
        if isinstance(content_blocks, list) and content_blocks:
            first_block = content_blocks[0]
            intro_text = getattr(first_block, "text", None) or f"Let's explore {branch_name}. What would you like to know?"
        else:
            intro_text = f"Let's explore {branch_name}. What would you like to know?"
        
        # Save the intro message
        await _insert_message(
            db, session_id, user_id, "assistant", intro_text, 
            tokens=_estimate_tokens(intro_text)
        )
        await db.commit()
        
        return intro_text
        
    except Exception as e:
        from loguru import logger
        logger.error(f"Failed to generate thread intro: {e}")
        # Fallback intro
        intro = f"Let's explore {branch_name}. What would you like to know?"
        await _insert_message(db, session_id, user_id, "assistant", intro, tokens=_estimate_tokens(intro))
        await db.commit()
        return intro


# -------------------- Endpoints --------------------

@router.post("/sessions")
async def create_session(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    title: Optional[str] = Body(None),
    mode: str = Body("general"),
    parent_session_id: Optional[str] = Body(None),
    branch_point_message_id: Optional[str] = Body(None),
    branch_name: Optional[str] = Body(None),
    inherit_messages: int = Body(5),  # Number of messages to inherit from parent
    auto_start: bool = Body(False),  # Auto-generate initial AI message for threads
):
    await _rate_limit(db, current_user, "chat_create", 30)
    ctx = await _chat_context(db, current_user.id)
    
    # Calculate depth level
    depth_level = 0
    if parent_session_id:
        parent_depth = await db.execute(
            text("SELECT depth_level FROM ai_chat_sessions WHERE id=:pid"),
            {"pid": parent_session_id}
        )
        parent_depth_val = parent_depth.scalar_one_or_none()
        depth_level = (parent_depth_val or 0) + 1
    
    # Build context inheritance settings
    context_inheritance = None
    if parent_session_id:
        context_inheritance = {
            "inherit_messages": inherit_messages,
            "inherit_user_context": True,
            "created_at": datetime.utcnow().isoformat()
        }
    
    res = await db.execute(
        text(
            """INSERT INTO ai_chat_sessions 
            (id, user_id, title, context_tags, system_prompt, mode, status, 
             parent_session_id, branch_point_message_id, branch_name, depth_level, 
             context_inheritance, created_at, updated_at)
            VALUES (gen_random_uuid(), :uid, :title, :tags, :prompt, :mode, 'active',
                    :parent_id, :branch_msg_id, :branch_name, :depth, :context_inheritance,
                    now(), now()) 
            RETURNING id"""
        ),
        {
            "uid": str(current_user.id),
            "title": title or "New Chat",
            "tags": list({"dashboard", "monitoring"}),
            "prompt": json.dumps(ctx),
            "mode": mode,
            "parent_id": parent_session_id,
            "branch_msg_id": branch_point_message_id,
            "branch_name": branch_name,
            "depth": depth_level,
            "context_inheritance": json.dumps(context_inheritance) if context_inheritance else None,
        },
    )
    sid = res.scalar_one()
    await db.commit()
    
    # Auto-generate initial AI message for threads if requested
    initial_message = None
    if auto_start and parent_session_id and branch_name:
        initial_message = await _generate_thread_intro(db, current_user.id, sid, parent_session_id, branch_name)
    
    return {
        "session_id": sid, 
        "depth_level": depth_level,
        "initial_message": initial_message
    }


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
    
    # For proper "most recently used" ordering, we need to consider:
    # 1. When a thread is used, promote the entire root conversation
    # 2. Use the most recent activity from any child session
    res = await db.execute(
        text(
            """WITH RECURSIVE session_roots AS (
                -- Find the root session for each session
                SELECT id, id as root_id FROM ai_chat_sessions WHERE parent_session_id IS NULL
                UNION ALL
                SELECT c.id, sr.root_id 
                FROM ai_chat_sessions c
                INNER JOIN session_roots sr ON c.parent_session_id = sr.id
            ),
            root_activities AS (
                -- Get the most recent activity for each root (considering all descendants)
                SELECT sr.root_id, 
                       MAX(COALESCE(
                           (SELECT MAX(m.created_at) FROM ai_chat_messages m WHERE m.session_id = s.id),
                           s.updated_at
                       )) as last_activity
                FROM ai_chat_sessions s
                INNER JOIN session_roots sr ON s.id = sr.id
                WHERE s.user_id = :uid AND s.status = 'active'
                GROUP BY sr.root_id
            )
            SELECT s.id, s.title, s.mode, s.status, s.created_at, s.updated_at,
            s.parent_session_id, s.branch_point_message_id, s.branch_name, s.depth_level,
            (SELECT count(*) FROM ai_chat_messages m WHERE m.session_id=s.id) AS message_count,
            (SELECT max(created_at) FROM ai_chat_messages m WHERE m.session_id=s.id) AS last_activity,
            (SELECT count(*) FROM ai_chat_sessions child WHERE child.parent_session_id=s.id) AS child_count,
            COALESCE(ra.last_activity, s.updated_at) as root_last_activity
            FROM ai_chat_sessions s
            LEFT JOIN session_roots sr ON s.id = sr.id
            LEFT JOIN root_activities ra ON sr.root_id = ra.root_id
            WHERE s.user_id=:uid AND s.status='active'
            ORDER BY root_last_activity DESC NULLS LAST, s.created_at DESC
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
    include_inherited: bool = True,  # Include parent context
):
    await _rate_limit(db, current_user, "chat_history", 120)
    # Validate ownership
    session_info = await db.execute(
        text("""SELECT parent_session_id, branch_point_message_id, context_inheritance 
                FROM ai_chat_sessions WHERE id=:sid AND user_id=:uid"""),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    session_data = session_info.first()
    if not session_data:
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
    
    # Get inherited context from parent if this is a branch
    inherited_context = []
    if include_inherited and session_data[0]:  # parent_session_id exists
        parent_id = session_data[0]
        branch_msg_id = session_data[1]
        
        # Get context inheritance settings (already deserialized from JSONB)
        context_inh = session_data[2] if session_data[2] else {}
        inherit_count = context_inh.get("inherit_messages", 5)
        
        # Get parent messages up to branch point or last N messages
        if branch_msg_id:
            parent_res = await db.execute(
                text(
                    """SELECT id, role, content, created_at FROM ai_chat_messages
                    WHERE session_id=:pid AND created_at <= (
                        SELECT created_at FROM ai_chat_messages WHERE id=:branch_id
                    )
                    ORDER BY created_at DESC LIMIT :limit"""
                ),
                {"pid": str(parent_id), "branch_id": str(branch_msg_id), "limit": inherit_count},
            )
        else:
            parent_res = await db.execute(
                text(
                    """SELECT id, role, content, created_at FROM ai_chat_messages
                    WHERE session_id=:pid ORDER BY created_at DESC LIMIT :limit"""
                ),
                {"pid": str(parent_id), "limit": inherit_count},
            )
        
        inherited_context = [
            {k: _serialize_value(v) for k, v in dict(r._mapping).items()}
            for r in parent_res.fetchall()
        ]
        inherited_context.reverse()  # Oldest first
    
    return {
        "messages": messages, 
        "inherited_context": inherited_context,
        "page": page, 
        "page_size": page_size
    }


@router.put("/sessions/{session_id}/title")
async def update_session_title(
    *,
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    title: str = Body(..., embed=True),
):
    """Update the title of a chat session."""
    await _rate_limit(db, current_user, "chat_update", 60)
    
    # Verify ownership
    own = await db.execute(
        text("SELECT 1 FROM ai_chat_sessions WHERE id=:sid AND user_id=:uid"),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    if not own.first():
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.execute(
        text("UPDATE ai_chat_sessions SET title=:title, updated_at=now() WHERE id=:sid"),
        {"sid": str(session_id), "title": title},
    )
    await db.commit()
    return {"session_id": str(session_id), "title": title}


@router.post("/sessions/{session_id}/generate-title")
async def generate_session_title(
    *,
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Auto-generate a title for a chat session based on its content using Claude."""
    await _rate_limit(db, current_user, "chat_update", 60)
    
    # Verify ownership and get messages
    own = await db.execute(
        text("SELECT 1 FROM ai_chat_sessions WHERE id=:sid AND user_id=:uid"),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    if not own.first():
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get first few messages
    messages_res = await db.execute(
        text(
            "SELECT role, content FROM ai_chat_messages WHERE session_id=:sid ORDER BY created_at ASC LIMIT 4"
        ),
        {"sid": str(session_id)},
    )
    messages = [dict(r._mapping) for r in messages_res.fetchall()]
    
    if not messages:
        raise HTTPException(status_code=400, detail="Cannot generate title for empty conversation")
    
    # Use Claude to generate title
    api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
    client = Anthropic(api_key=api_key) if Anthropic and api_key else None
    
    if not client:
        # Fallback to simple title generation
        first_user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")
        title = first_user_msg[:50].strip()
        if len(first_user_msg) > 50:
            title += "..."
        title = title or "New Chat"
    else:
        try:
            # Build context for title generation
            conversation_text = "\n".join([
                f"{m['role'].upper()}: {m['content'][:200]}"
                for m in messages[:4]
            ])
            
            system_prompt = (
                "Generate a short, descriptive title (max 50 characters) for this conversation. "
                "The title should capture the main topic or question. "
                "Do not use quotes, just return the title text directly. "
                "Be concise and specific."
            )
            
            response = client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=60,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"Generate a title for this conversation:\n\n{conversation_text}"
                }],
                temperature=0.5,
            )
            
            content_blocks = getattr(response, "content", [])
            if isinstance(content_blocks, list) and content_blocks:
                first_block = content_blocks[0]
                title = getattr(first_block, "text", None) or "New Chat"
                # Clean up the title
                title = title.strip().strip('"').strip("'")
                if len(title) > 60:
                    title = title[:57] + "..."
            else:
                title = "New Chat"
                
        except Exception as e:
            from loguru import logger
            logger.error(f"Failed to generate title with Claude: {e}")
            # Fallback
            first_user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")
            title = first_user_msg[:50].strip()
            if len(first_user_msg) > 50:
                title += "..."
            title = title or "New Chat"
    
    # Update the session title
    await db.execute(
        text("UPDATE ai_chat_sessions SET title=:title, updated_at=now() WHERE id=:sid"),
        {"sid": str(session_id), "title": title},
    )
    await db.commit()
    
    return {"session_id": str(session_id), "title": title}


@router.get("/sessions/{session_id}/status")
async def get_session_status(
    *,
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Check if session has actively generating messages."""
    await _rate_limit(db, current_user, "chat_status", 200)
    
    # Verify ownership
    own = await db.execute(
        text("SELECT 1 FROM ai_chat_sessions WHERE id=:sid AND user_id=:uid"),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    if not own.first():
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check for generating messages
    generating = await db.execute(
        text(
            """SELECT id, content, last_updated FROM ai_chat_messages 
            WHERE session_id=:sid AND status='generating' 
            ORDER BY created_at DESC LIMIT 1"""
        ),
        {"sid": str(session_id)},
    )
    gen_msg = generating.first()
    
    if gen_msg:
        return {
            "has_active_generation": True,
            "generating_message_id": str(gen_msg[0]),
            "partial_content": gen_msg[1],
            "last_updated": _serialize_value(gen_msg[2]),
        }
    
    return {
        "has_active_generation": False,
        "generating_message_id": None,
        "partial_content": None,
        "last_updated": None,
    }


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
    request: SendMessageRequest,
    use_celery: bool = Query(True, description="Use async Celery processing with background workers"),
):
    """
    Send a chat message and get AI response.
    
    - use_celery=True (default): Queue task in Celery for async processing. Returns immediately.
      Client should connect to SSE endpoint to receive streaming response.
    - use_celery=False: Synchronous inline processing (legacy, blocks until complete).
    """
    session_id = request.session_id
    content = request.content
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
    user_msg_id = await _insert_message(db, session_id, current_user.id, "user", content, tokens=user_tokens)

    # Get user AI context
    ctx = await _chat_context(db, current_user.id)
    user_context_str = ctx.get("user_context", "")

    # Build system prompt
    system_prompt = (
        "You are Repruv AI, a helpful assistant for content creators and influencers. "
        "You help with content strategy, audience insights, social media management, and creative ideas. "
        "Be friendly, concise, and actionable in your responses."
    )
    
    if user_context_str:
        system_prompt += f"\n\nUser Context: {user_context_str}\n\nUse this context to personalize your responses."
    
    # Get performance context
    performance_context = await _get_performance_context(current_user.id, db)
    if performance_context:
        system_prompt += performance_context
    
    # Get RAG context
    rag_context = await get_rag_context_for_chat(current_user.id, content, db, max_examples=3)
    if rag_context:
        system_prompt += rag_context

    # Build conversation history
    history_res = await db.execute(
        text("SELECT role, content FROM ai_chat_messages WHERE session_id=:sid ORDER BY created_at DESC LIMIT 20"),
        {"sid": str(session_id)},
    )
    history = [dict(r._mapping) for r in history_res.fetchall()][::-1]

    # Create assistant message immediately with queued status
    assistant_msg_id = await _insert_message(
        db, session_id, current_user.id, "assistant", "", 
        status="queued" if use_celery else "generating"
    )
    await db.commit()
    
    if use_celery:
        # Queue Celery task for async processing
        from app.tasks.chat_tasks import generate_chat_response
        from app.core.redis_client import get_redis
        
        task = generate_chat_response.delay(
            session_id=str(session_id),
            message_id=str(assistant_msg_id),
            user_id=str(current_user.id),
            user_content=content,
            history=history,
            system_prompt=system_prompt,
        )
        
        # Mark as generating in Redis
        redis_client = get_redis()
        redis_client.setex(f"chat:status:{session_id}:{assistant_msg_id}", 3600, "queued")
        redis_client.setex(f"chat:task:{session_id}:{assistant_msg_id}", 3600, task.id)
        
        return {
            "success": True,
            "message_id": str(assistant_msg_id),
            "user_message_id": str(user_msg_id),
            "session_id": str(session_id),
            "task_id": task.id,
            "status": "queued",
            "stream_url": f"/api/v1/chat/stream/{session_id}?message_id={assistant_msg_id}"
        }
    
    # Legacy synchronous processing (fallback)
    api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
    client = Anthropic(api_key=api_key) if Anthropic and api_key else None
    model = getattr(settings, "CLAUDE_MODEL", None) or os.getenv("CLAUDE_MODEL") or "claude-sonnet-4-5-20250929"

    async def _finalize(assistant_text: str, tokens: int, latency_ms: int, message_id: UUID):
        """Finalize the assistant message."""
        await _finalize_message(db, message_id, tokens, latency_ms)
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
                
                # Add user-specific context if available
                if user_context_str:
                    system_prompt += f"\n\nUser Context: {user_context_str}\n\nUse this context to personalize your responses and provide more relevant advice specific to their channel, niche, and goals."
                
                # Add performance data context (legacy)
                performance_context = await _get_performance_context(current_user.id, db)
                if performance_context:
                    system_prompt += performance_context
                
                # Add RAG context (semantic search for relevant examples)
                rag_context = await get_rag_context_for_chat(current_user.id, content, db, max_examples=3)
                if rag_context:
                    system_prompt += rag_context
                
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
        # Update the message content for non-streaming
        await _update_message_content(db, assistant_msg_id, assistant_text, status="completed")
        await _finalize(assistant_text, _estimate_tokens(assistant_text), latency_ms, assistant_msg_id)
        return {"message": assistant_text, "latency_ms": latency_ms}

    async def event_stream():
        assistant_text_parts: List[str] = []
        completion_tokens = 0
        chunk_count = 0
        
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
                
                # Add user-specific context if available
                if user_context_str:
                    system_prompt += f"\n\nUser Context: {user_context_str}\n\nUse this context to personalize your responses and provide more relevant advice specific to their channel, niche, and goals."
                
                # Add performance data context (legacy)
                performance_context = await _get_performance_context(current_user.id, db)
                if performance_context:
                    system_prompt += performance_context
                
                # Add RAG context (semantic search for relevant examples)
                rag_context = await get_rag_context_for_chat(current_user.id, content, db, max_examples=3)
                if rag_context:
                    system_prompt += rag_context
                
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
                        chunk_count += 1
                        
                        # Save to database every 5 chunks for resilience
                        if chunk_count % 5 == 0:
                            current_content = "".join(assistant_text_parts)
                            await _update_message_content(db, assistant_msg_id, current_content, status="generating")
                        
                        yield f"data: {json.dumps({'delta': text})}\n\n"
                
                assistant_text = "".join(assistant_text_parts)
            except Exception as e:  # noqa: BLE001
                from loguru import logger
                logger.error(f"Streaming error: {e}")
                assistant_text = f"I apologize, but I encountered an error. Please try again."  # fallback
                await _update_message_content(db, assistant_msg_id, assistant_text, status="error")
                yield f"data: {json.dumps({'delta': assistant_text})}\n\n"
        else:
            # Fallback when Claude client not available
            fallback = "I'm currently unavailable. Please check your API configuration."
            assistant_text_parts.append(fallback)
            assistant_text = fallback
            completion_tokens = _estimate_tokens(assistant_text)
            await _update_message_content(db, assistant_msg_id, assistant_text, status="error")
            yield f"data: {json.dumps({'delta': assistant_text})}\n\n"
        
        latency_ms = int((time.perf_counter() - start) * 1000)
        # Final update with complete content
        await _update_message_content(db, assistant_msg_id, assistant_text, status="generating")
        await _finalize(assistant_text, completion_tokens, latency_ms, assistant_msg_id)
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
