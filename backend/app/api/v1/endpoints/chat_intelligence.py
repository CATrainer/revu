"""AI Chat Intelligence - Follow-ups, Summarization, Tasks, Quality Ratings"""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User

try:
    from anthropic import Anthropic
except Exception:
    Anthropic = None

import os
from app.core.config import settings

router = APIRouter()

# Request/Response models
class RateMessageRequest(BaseModel):
    rating: str  # 'helpful', 'not_helpful', 'amazing'
    feedback: Optional[str] = None

class FollowUpResponse(BaseModel):
    suggestions: List[str]
    message_id: str

class SummaryResponse(BaseModel):
    summary_text: str
    key_topics: List[str]
    action_items: List[Dict[str, Any]]
    message_count: int

class TaskItem(BaseModel):
    task: str
    priority: str
    completed: bool = False


async def _get_claude_client():
    """Get Claude API client."""
    api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
    if not Anthropic or not api_key:
        return None
    return Anthropic(api_key=api_key)


async def _get_conversation_context(db: AsyncSession, session_id: UUID, limit: int = 10) -> List[Dict]:
    """Get recent conversation context."""
    result = await db.execute(
        text("""
            SELECT role, content, created_at 
            FROM ai_chat_messages 
            WHERE session_id = :sid 
            ORDER BY created_at DESC 
            LIMIT :limit
        """),
        {"sid": str(session_id), "limit": limit}
    )
    messages = [dict(r._mapping) for r in result.fetchall()]
    messages.reverse()  # Oldest first
    return messages


# ==================== FOLLOW-UP SUGGESTIONS ====================

@router.post("/messages/{message_id}/followups", response_model=FollowUpResponse)
async def generate_followup_suggestions(
    *,
    message_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Generate 3-4 contextual follow-up question suggestions."""
    
    # Get the message and verify ownership
    msg_result = await db.execute(
        text("""
            SELECT m.id, m.session_id, m.content, m.role
            FROM ai_chat_messages m
            JOIN ai_chat_sessions s ON m.session_id = s.id
            WHERE m.id = :mid AND s.user_id = :uid
        """),
        {"mid": str(message_id), "uid": str(current_user.id)}
    )
    message = msg_result.first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if we already have suggestions
    existing = await db.execute(
        text("SELECT suggestions FROM ai_suggested_followups WHERE message_id = :mid"),
        {"mid": str(message_id)}
    )
    existing_sugg = existing.first()
    
    if existing_sugg:
        return FollowUpResponse(
            suggestions=existing_sugg[0],
            message_id=str(message_id)
        )
    
    # Get conversation context
    context = await _get_conversation_context(db, message.session_id, limit=5)
    
    # Generate suggestions using Claude
    client = await _get_claude_client()
    
    if not client:
        # Fallback suggestions
        suggestions = [
            "Can you elaborate on that?",
            "What are the next steps?",
            "How can I implement this?"
        ]
    else:
        try:
            # Build context string
            context_str = "\n".join([
                f"{msg['role'].upper()}: {msg['content'][:200]}"
                for msg in context[-3:]
            ])
            
            prompt = f"""Based on this conversation:

{context_str}

Generate 3-4 short, natural follow-up questions the user might want to ask next. 
Each question should:
- Be specific and actionable
- Continue the conversation naturally
- Be concise (max 10 words)
- Help the user dive deeper or take action

Return ONLY the questions, one per line, without numbering or formatting."""

            response = client.messages.create(
                model="claude-3-5-sonnet-latest",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
            )
            
            content_blocks = getattr(response, "content", [])
            if isinstance(content_blocks, list) and content_blocks:
                text = getattr(content_blocks[0], "text", "")
                suggestions = [s.strip() for s in text.strip().split('\n') if s.strip()]
                suggestions = suggestions[:4]  # Max 4 suggestions
            else:
                suggestions = [
                    "Can you elaborate on that?",
                    "What are the next steps?",
                    "How can I implement this?"
                ]
                
        except Exception as e:
            from loguru import logger
            logger.error(f"Failed to generate follow-ups: {e}")
            suggestions = [
                "Can you elaborate on that?",
                "What are the next steps?",
                "How can I implement this?"
            ]
    
    # Save suggestions
    await db.execute(
        text("""
            INSERT INTO ai_suggested_followups (message_id, suggestions)
            VALUES (:mid, :sugg)
        """),
        {"mid": str(message_id), "sugg": json.dumps(suggestions)}
    )
    await db.commit()
    
    return FollowUpResponse(
        suggestions=suggestions,
        message_id=str(message_id)
    )


# ==================== CONVERSATION SUMMARIZATION ====================

@router.post("/sessions/{session_id}/summarize", response_model=SummaryResponse)
async def generate_session_summary(
    *,
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    force: bool = False,
):
    """Generate comprehensive conversation summary with topics and action items."""
    
    # Verify session ownership
    session_check = await db.execute(
        text("SELECT 1 FROM ai_chat_sessions WHERE id = :sid AND user_id = :uid"),
        {"sid": str(session_id), "uid": str(current_user.id)}
    )
    if not session_check.first():
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check for existing recent summary
    if not force:
        existing = await db.execute(
            text("""
                SELECT summary_text, key_topics, action_items, message_count
                FROM ai_conversation_summaries
                WHERE session_id = :sid
                ORDER BY created_at DESC
                LIMIT 1
            """),
            {"sid": str(session_id)}
        )
        existing_summary = existing.first()
        
        # If we have a summary and message count hasn't changed much, return it
        if existing_summary:
            current_count = await db.execute(
                text("SELECT COUNT(*) FROM ai_chat_messages WHERE session_id = :sid"),
                {"sid": str(session_id)}
            )
            msg_count = current_count.scalar_one()
            
            if msg_count - existing_summary.message_count < 5:
                return SummaryResponse(
                    summary_text=existing_summary.summary_text,
                    key_topics=existing_summary.key_topics or [],
                    action_items=existing_summary.action_items or [],
                    message_count=existing_summary.message_count
                )
    
    # Get all messages
    messages = await _get_conversation_context(db, session_id, limit=100)
    
    if len(messages) < 3:
        raise HTTPException(status_code=400, detail="Not enough messages to summarize")
    
    # Generate summary using Claude
    client = await _get_claude_client()
    
    if not client:
        summary_text = "Conversation covered: " + ", ".join([m['content'][:50] for m in messages[:3]])
        key_topics = ["General discussion"]
        action_items = []
    else:
        try:
            conversation_text = "\n\n".join([
                f"{msg['role'].upper()}: {msg['content']}"
                for msg in messages
            ])
            
            prompt = f"""Analyze this conversation and provide:

1. A comprehensive summary (2-3 sentences)
2. Key topics discussed (max 5)
3. Action items/tasks mentioned (with priority: high/medium/low)

Conversation:
{conversation_text}

Return as JSON:
{{
  "summary": "...",
  "topics": ["topic1", "topic2", ...],
  "tasks": [
    {{"task": "...", "priority": "high"}},
    ...
  ]
}}"""

            response = client.messages.create(
                model="claude-3-5-sonnet-latest",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
            )
            
            content_blocks = getattr(response, "content", [])
            if isinstance(content_blocks, list) and content_blocks:
                text = getattr(content_blocks[0], "text", "{}")
                
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                    summary_text = result.get("summary", "")
                    key_topics = result.get("topics", [])
                    action_items = result.get("tasks", [])
                else:
                    summary_text = "Conversation analysis complete."
                    key_topics = []
                    action_items = []
            else:
                summary_text = "Conversation analysis complete."
                key_topics = []
                action_items = []
                
        except Exception as e:
            from loguru import logger
            logger.error(f"Failed to generate summary: {e}")
            summary_text = f"Discussed {len(messages)} messages covering various topics."
            key_topics = []
            action_items = []
    
    # Save summary
    await db.execute(
        text("""
            INSERT INTO ai_conversation_summaries 
            (session_id, summary_text, message_count, key_topics, action_items)
            VALUES (:sid, :summary, :count, :topics, :tasks)
        """),
        {
            "sid": str(session_id),
            "summary": summary_text,
            "count": len(messages),
            "topics": json.dumps(key_topics),
            "tasks": json.dumps(action_items)
        }
    )
    await db.commit()
    
    return SummaryResponse(
        summary_text=summary_text,
        key_topics=key_topics,
        action_items=action_items,
        message_count=len(messages)
    )


@router.get("/sessions/{session_id}/summary", response_model=Optional[SummaryResponse])
async def get_session_summary(
    *,
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get the most recent summary for a session."""
    
    result = await db.execute(
        text("""
            SELECT s.summary_text, s.key_topics, s.action_items, s.message_count
            FROM ai_conversation_summaries s
            JOIN ai_chat_sessions sess ON s.session_id = sess.id
            WHERE s.session_id = :sid AND sess.user_id = :uid
            ORDER BY s.created_at DESC
            LIMIT 1
        """),
        {"sid": str(session_id), "uid": str(current_user.id)}
    )
    
    summary = result.first()
    if not summary:
        return None
    
    return SummaryResponse(
        summary_text=summary.summary_text,
        key_topics=summary.key_topics or [],
        action_items=summary.action_items or [],
        message_count=summary.message_count
    )


# ==================== TASK EXTRACTION ====================

@router.get("/sessions/{session_id}/tasks")
async def get_session_tasks(
    *,
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Extract all action items/tasks from conversation."""
    
    # Get latest summary which includes tasks
    summary = await get_session_summary(
        session_id=session_id,
        db=db,
        current_user=current_user
    )
    
    if not summary or not summary.action_items:
        return {"tasks": []}
    
    return {"tasks": summary.action_items}


# ==================== RESPONSE QUALITY ====================

@router.post("/messages/{message_id}/rate")
async def rate_message(
    *,
    message_id: UUID,
    request: RateMessageRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Rate an AI response (helpful/not_helpful/amazing)."""
    
    # Verify message exists and is assistant message
    msg_check = await db.execute(
        text("""
            SELECT m.id
            FROM ai_chat_messages m
            JOIN ai_chat_sessions s ON m.session_id = s.id
            WHERE m.id = :mid AND s.user_id = :uid AND m.role = 'assistant'
        """),
        {"mid": str(message_id), "uid": str(current_user.id)}
    )
    
    if not msg_check.first():
        raise HTTPException(status_code=404, detail="Message not found or not ratable")
    
    # Upsert rating
    await db.execute(
        text("""
            INSERT INTO ai_response_quality (message_id, user_id, rating, feedback_text)
            VALUES (:mid, :uid, :rating, :feedback)
            ON CONFLICT (message_id, user_id) 
            DO UPDATE SET rating = EXCLUDED.rating, feedback_text = EXCLUDED.feedback_text
        """),
        {
            "mid": str(message_id),
            "uid": str(current_user.id),
            "rating": request.rating,
            "feedback": request.feedback
        }
    )
    await db.commit()
    
    return {"message_id": str(message_id), "rating": request.rating}


@router.get("/messages/{message_id}/quality")
async def get_message_quality(
    *,
    message_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get quality metrics for a message."""
    
    result = await db.execute(
        text("""
            SELECT 
                COUNT(*) as total_ratings,
                SUM(CASE WHEN rating = 'amazing' THEN 1 ELSE 0 END) as amazing_count,
                SUM(CASE WHEN rating = 'helpful' THEN 1 ELSE 0 END) as helpful_count,
                SUM(CASE WHEN rating = 'not_helpful' THEN 1 ELSE 0 END) as not_helpful_count
            FROM ai_response_quality
            WHERE message_id = :mid
        """),
        {"mid": str(message_id)}
    )
    
    quality = result.first()
    
    if not quality or quality.total_ratings == 0:
        return {
            "message_id": str(message_id),
            "total_ratings": 0,
            "quality_score": None
        }
    
    # Calculate quality score (0-100)
    score = (
        (quality.amazing_count * 100 + quality.helpful_count * 75 + quality.not_helpful_count * 0) 
        / quality.total_ratings
    )
    
    return {
        "message_id": str(message_id),
        "total_ratings": quality.total_ratings,
        "quality_score": round(score, 1),
        "breakdown": {
            "amazing": quality.amazing_count,
            "helpful": quality.helpful_count,
            "not_helpful": quality.not_helpful_count
        }
    }
