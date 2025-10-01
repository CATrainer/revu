"""
Real-time chat streaming endpoints using Celery + Redis
"""
import json
import asyncio
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger

from app.core.database import get_async_session
from app.core.redis_client import get_redis
from app.core.security import get_current_active_user, decode_token
from app.models.user import User
from app.tasks.chat_tasks import generate_chat_response


router = APIRouter()


async def get_user_from_token_or_header(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_session),
) -> User:
    """Get user from token (query param for SSE or header for regular requests)."""
    access_token = None
    
    # Try query parameter first (for SSE which can't use headers)
    if token:
        access_token = token
    # Fall back to Authorization header
    elif authorization and authorization.startswith("Bearer "):
        access_token = authorization.replace("Bearer ", "")
    
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = decode_token(access_token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        result = await db.execute(text("SELECT * FROM users WHERE id = :uid"), {"uid": user_id})
        user_data = result.first()
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**dict(user_data._mapping))
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication")


@router.get("/stream/{session_id}")
async def stream_chat_session(
    session_id: UUID,
    message_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_user_from_token_or_header),
):
    """
    Server-Sent Events endpoint for streaming chat responses.
    
    Subscribes to Redis pub/sub for real-time updates from Celery workers.
    Returns existing chunks if reconnecting to an in-progress stream.
    
    Auth: Accepts token via query param (?token=...) for SSE compatibility
    """
    # Verify session ownership
    own = await db.execute(
        text("SELECT 1 FROM ai_chat_sessions WHERE id=:sid AND user_id=:uid"),
        {"sid": str(session_id), "uid": str(current_user.id)},
    )
    if not own.first():
        raise HTTPException(status_code=404, detail="Session not found")
    
    redis_client = get_redis()
    pubsub = redis_client.pubsub()
    channel = f"chat:updates:{session_id}"
    
    async def event_generator():
        """Generate SSE events from Redis pub/sub."""
        try:
            # Subscribe to updates
            pubsub.subscribe(channel)
            
            # If message_id provided, send existing chunks first (reconnection)
            if message_id:
                stream_key = f"chat:stream:{session_id}:{message_id}"
                existing_chunks = redis_client.lrange(stream_key, 0, -1)
                
                for chunk_data in existing_chunks:
                    chunk = json.loads(chunk_data)
                    yield f"data: {json.dumps(chunk)}\n\n"
                    await asyncio.sleep(0.01)  # Simulate streaming
            
            # Stream new updates
            for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    yield f"data: {json.dumps(data)}\n\n"
                    
                    # Close stream on completion or error
                    if data.get("type") in ["complete", "error"]:
                        break
                        
        except Exception as e:
            logger.error(f"Error in SSE stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        finally:
            pubsub.unsubscribe(channel)
            pubsub.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.get("/status/{session_id}/{message_id}")
async def get_message_status(
    session_id: UUID,
    message_id: UUID,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current status of a message being generated.
    
    Returns: queued, generating, completed, error
    """
    redis_client = get_redis()
    status_key = f"chat:status:{session_id}:{message_id}"
    
    status = redis_client.get(status_key)
    if status:
        status = status.decode("utf-8")
    else:
        status = "unknown"
    
    # Get partial content if available
    stream_key = f"chat:stream:{session_id}:{message_id}"
    chunk_count = redis_client.llen(stream_key)
    
    partial_content = ""
    if chunk_count > 0:
        chunks = redis_client.lrange(stream_key, 0, -1)
        for chunk_data in chunks:
            chunk = json.loads(chunk_data)
            partial_content += chunk.get("chunk", "")
    
    return {
        "message_id": str(message_id),
        "session_id": str(session_id),
        "status": status,
        "chunk_count": chunk_count,
        "partial_content": partial_content,
        "content_length": len(partial_content)
    }


@router.get("/active-streams")
async def get_active_streams(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all active streaming messages for the current user.
    Useful for resuming streams after page refresh or session switch.
    """
    redis_client = get_redis()
    
    # Get user's sessions
    result = await db.execute(
        text("SELECT id FROM ai_chat_sessions WHERE user_id = :uid AND status = 'active'"),
        {"uid": str(current_user.id)}
    )
    session_ids = [row[0] for row in result.fetchall()]
    
    active_streams = []
    
    for session_id in session_ids:
        # Check for any generating messages
        pattern = f"chat:status:{session_id}:*"
        for key in redis_client.scan_iter(match=pattern):
            status = redis_client.get(key).decode("utf-8")
            if status in ["queued", "generating"]:
                # Extract message_id from key
                message_id = key.decode("utf-8").split(":")[-1]
                
                # Get partial content
                stream_key = f"chat:stream:{session_id}:{message_id}"
                chunk_count = redis_client.llen(stream_key)
                
                active_streams.append({
                    "session_id": str(session_id),
                    "message_id": message_id,
                    "status": status,
                    "chunk_count": chunk_count
                })
    
    return {
        "active_streams": active_streams,
        "count": len(active_streams)
    }
