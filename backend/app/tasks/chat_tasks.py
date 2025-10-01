"""
Celery tasks for async AI chat processing
"""
import os
import json
import time
from typing import Optional, Dict, Any
from uuid import UUID
from loguru import logger
from anthropic import Anthropic

from app.core.celery import celery
from app.core.config import settings
from app.core.database import get_async_session_context
from app.core.redis_client import get_redis
from sqlalchemy import text


@celery.task(name="chat.generate_response", bind=True, max_retries=3)
def generate_chat_response(
    self,
    session_id: str,
    message_id: str,
    user_id: str,
    user_content: str,
    history: list,
    system_prompt: str,
) -> Dict[str, Any]:
    """
    Generate Claude AI response asynchronously.
    
    Streams response chunks to Redis for real-time frontend consumption.
    Updates database when complete.
    
    Args:
        session_id: Chat session UUID
        message_id: Assistant message UUID being generated
        user_id: User UUID
        user_content: User's message content
        history: List of previous messages for context
        system_prompt: System prompt/context
        
    Returns:
        Dict with success status, message_id, and final content
    """
    redis_client = get_redis()
    stream_key = f"chat:stream:{session_id}:{message_id}"
    status_key = f"chat:status:{session_id}:{message_id}"
    
    try:
        # Mark as generating
        redis_client.setex(status_key, 3600, "generating")
        
        # Initialize Claude client
        api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
        if not api_key:
            raise ValueError("CLAUDE_API_KEY not configured")
            
        client = Anthropic(api_key=api_key)
        model = getattr(settings, "CLAUDE_MODEL", None) or os.getenv("CLAUDE_MODEL") or "claude-sonnet-4-20250514"
        
        # Build messages for Claude
        messages = []
        for msg in history[-20:]:  # Last 20 messages for context
            if msg.get("role") in ["user", "assistant"]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        messages.append({
            "role": "user",
            "content": user_content
        })
        
        # Stream response from Claude
        full_response = ""
        chunk_count = 0
        start_time = time.time()
        
        with client.messages.stream(
            model=model,
            max_tokens=2048,
            temperature=0.7,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text_chunk in stream.text_stream:
                if text_chunk:
                    full_response += text_chunk
                    chunk_count += 1
                    
                    # Store chunk in Redis with 1 hour expiry
                    chunk_data = {
                        "chunk": text_chunk,
                        "index": chunk_count,
                        "timestamp": time.time(),
                        "message_id": message_id,
                        "session_id": session_id,
                    }
                    redis_client.rpush(stream_key, json.dumps(chunk_data))
                    redis_client.expire(stream_key, 3600)
                    
                    # Publish to pub/sub for real-time updates
                    redis_client.publish(
                        f"chat:updates:{session_id}",
                        json.dumps({
                            "type": "chunk",
                            "message_id": message_id,
                            "content": text_chunk,
                            "index": chunk_count
                        })
                    )
        
        # Get token usage
        usage = stream.get_final_message().usage
        tokens_in = usage.input_tokens
        tokens_out = usage.output_tokens
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Update database with final response
        import asyncio
        asyncio.run(_update_message_in_db(
            message_id=message_id,
            content=full_response,
            tokens=tokens_out,
            model=model,
            status="completed"
        ))
        
        # Update session last_message_at
        asyncio.run(_update_session_timestamp(session_id))
        
        # Mark as completed
        redis_client.setex(status_key, 3600, "completed")
        
        # Publish completion event
        redis_client.publish(
            f"chat:updates:{session_id}",
            json.dumps({
                "type": "complete",
                "message_id": message_id,
                "content": full_response,
                "tokens": tokens_out,
                "latency_ms": latency_ms
            })
        )
        
        logger.info(
            f"Chat response generated: session={session_id} message={message_id} "
            f"chunks={chunk_count} tokens={tokens_out} latency={latency_ms}ms"
        )
        
        return {
            "success": True,
            "message_id": message_id,
            "session_id": session_id,
            "content": full_response,
            "tokens": tokens_out,
            "latency_ms": latency_ms,
            "chunks": chunk_count
        }
        
    except Exception as e:
        logger.error(f"Error generating chat response: {e}", exc_info=True)
        
        # Mark as failed
        redis_client.setex(status_key, 3600, "error")
        
        # Update message status in DB
        import asyncio
        asyncio.run(_update_message_in_db(
            message_id=message_id,
            content="",
            status="error",
            error=str(e)
        ))
        
        # Publish error event
        redis_client.publish(
            f"chat:updates:{session_id}",
            json.dumps({
                "type": "error",
                "message_id": message_id,
                "error": str(e)
            })
        )
        
        # Retry if possible
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2 ** self.request.retries)
        
        return {
            "success": False,
            "message_id": message_id,
            "session_id": session_id,
            "error": str(e)
        }


async def _update_message_in_db(
    message_id: str,
    content: str,
    tokens: Optional[int] = None,
    model: Optional[str] = None,
    status: str = "completed",
    error: Optional[str] = None
):
    """Update message in database."""
    async with get_async_session_context() as db:
        update_fields = ["content = :content", "status = :status"]
        params = {"mid": message_id, "content": content, "status": status}
        
        if tokens is not None:
            update_fields.append("tokens_used = :tokens")
            params["tokens"] = tokens
        
        if model:
            update_fields.append("model = :model")
            params["model"] = model
            
        if error:
            update_fields.append("error = :error")
            params["error"] = error
        
        await db.execute(
            text(f"UPDATE ai_chat_messages SET {', '.join(update_fields)} WHERE id = :mid"),
            params
        )
        await db.commit()


async def _update_session_timestamp(session_id: str):
    """Update session last_message_at timestamp."""
    async with get_async_session_context() as db:
        await db.execute(
            text("UPDATE ai_chat_sessions SET last_message_at = NOW(), updated_at = NOW() WHERE id = :sid"),
            {"sid": session_id}
        )
        await db.commit()


@celery.task(name="chat.cleanup_old_streams")
def cleanup_old_chat_streams():
    """
    Periodic task to clean up old Redis stream data.
    Run every hour.
    """
    redis_client = get_redis()
    
    # Find all chat stream keys older than 1 hour
    pattern = "chat:stream:*"
    deleted_count = 0
    
    for key in redis_client.scan_iter(match=pattern):
        ttl = redis_client.ttl(key)
        if ttl == -1:  # No expiry set
            redis_client.delete(key)
            deleted_count += 1
    
    if deleted_count > 0:
        logger.info(f"Cleaned up {deleted_count} old chat stream keys")
    
    return {"deleted": deleted_count}
