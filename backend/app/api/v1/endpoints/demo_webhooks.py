"""Webhook receiver for demo simulator events."""
import logging
import hmac
import hashlib
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Dict

from app.core.database import get_async_session
from app.core.config import settings
from app.models.user import User
from app.models.interaction import Interaction
from app.models.fan import Fan
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter()


class DemoWebhookPayload(BaseModel):
    event: str
    data: Dict


@router.post("/webhooks/demo")
async def receive_demo_webhook(
    payload: DemoWebhookPayload,
    x_demo_signature: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_async_session),
):
    """Receive and process webhooks from demo simulator service."""
    
    logger.info(f"Demo webhook received - Event: {payload.event}")
    logger.debug(f"Demo webhook payload: {payload.dict()}")
    
    # Verify signature (but don't block if missing - log warning instead)
    webhook_secret = getattr(settings, 'DEMO_WEBHOOK_SECRET', None)
    
    if webhook_secret and x_demo_signature:
        if not verify_signature(payload.dict(), x_demo_signature, webhook_secret):
            logger.error("Demo webhook signature verification failed")
            raise HTTPException(401, "Invalid webhook signature")
    elif webhook_secret and not x_demo_signature:
        logger.warning("Demo webhook received without signature (secret is configured)")
    
    try:
        # Route to appropriate handler
        if payload.event == 'interaction.created':
            result = await handle_interaction_created(session, payload.data)
            logger.info(f"Demo interaction created successfully: {result}")
            return {"status": "received", "created": result}
        elif payload.event == 'content.published':
            await handle_content_published(session, payload.data)
            return {"status": "received"}
        else:
            logger.warning(f"Unknown demo event type: {payload.event}")
            return {"status": "received", "warning": "unknown_event_type"}
    except Exception as e:
        logger.error(f"Error processing demo webhook: {str(e)}", exc_info=True)
        # Re-raise so the demo service knows it failed
        raise HTTPException(500, f"Failed to process webhook: {str(e)}")


async def handle_interaction_created(session: AsyncSession, data: Dict) -> Dict:
    """Handle new interaction from demo simulator."""
    
    interaction_data = data.get('interaction', {})
    author_data = interaction_data.get('author', {})
    
    logger.debug(f"Processing demo interaction - data keys: {data.keys()}")
    logger.debug(f"Interaction data keys: {interaction_data.keys()}")
    
    # Get user_id from demo profile
    user_id_str = data.get('user_id')
    if not user_id_str:
        error_msg = "CRITICAL: Demo webhook missing user_id - interaction cannot be created"
        logger.error(error_msg)
        logger.error(f"Received data: {data}")
        raise ValueError(error_msg)
    
    try:
        user_id = uuid.UUID(user_id_str)
        logger.debug(f"Processing demo interaction for user_id: {user_id}")
    except (ValueError, TypeError) as e:
        error_msg = f"Invalid user_id format in demo webhook: {user_id_str}"
        logger.error(error_msg)
        raise ValueError(error_msg) from e
    
    # Verify user exists and is in demo mode
    user_stmt = select(User).where(User.id == user_id)
    user_result = await session.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    
    if not user:
        error_msg = f"User {user_id} not found - cannot create demo interaction"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    if not user.demo_mode:
        error_msg = f"User {user_id} is not in demo mode - rejecting demo data"
        logger.warning(error_msg)
        raise ValueError(error_msg)
    
    # Get or create fan
    fan = await get_or_create_fan(
        session,
        author_data.get('username'),
        author_data.get('display_name'),
        data.get('platform'),
        user_id,
    )
    
    # Create interaction
    interaction_id = uuid.uuid4()
    platform_id = interaction_data.get('id') or f"demo_{interaction_id}"
    
    logger.debug(f"Creating interaction with platform_id: {platform_id}")
    
    interaction = Interaction(
        id=interaction_id,
        platform=data.get('platform'),
        type=interaction_data.get('type', 'comment'),
        platform_id=platform_id,
        content=interaction_data.get('content'),
        author_username=author_data.get('username'),
        author_name=author_data.get('display_name'),  # Fixed: author_name not author_display_name
        author_avatar_url=author_data.get('avatar_url'),
        author_is_verified=author_data.get('verified', False),  # Fixed: author_is_verified not author_verified
        author_follower_count=author_data.get('subscriber_count', 0),
        like_count=interaction_data.get('engagement', {}).get('likes', 0),
        reply_count=interaction_data.get('engagement', {}).get('replies', 0),
        sentiment=interaction_data.get('sentiment', 'neutral'),
        status='unread',
        priority_score=calculate_priority(interaction_data),
        fan_id=fan.id if fan else None,
        user_id=user_id,
        organization_id=user.organization_id,  # Include organization_id
        is_demo=True,  # CRITICAL: Mark as demo data
    )
    
    # Check if interaction with this platform_id already exists (idempotent handling)
    existing_stmt = select(Interaction).where(Interaction.platform_id == platform_id)
    existing_result = await session.execute(existing_stmt)
    existing_interaction = existing_result.scalar_one_or_none()
    
    if existing_interaction:
        logger.info(f"Demo interaction with platform_id {platform_id} already exists (id: {existing_interaction.id}) - skipping duplicate")
        return {"interaction_id": str(existing_interaction.id), "user_id": str(user_id), "duplicate": True}
    
    session.add(interaction)
    
    try:
        await session.commit()
        logger.info(f"✅ Successfully created demo interaction {interaction.id} for user {user_id} (platform: {data.get('platform')}, is_demo: True)")
        
        return {"interaction_id": str(interaction.id), "user_id": str(user_id), "duplicate": False}
    except Exception as e:
        await session.rollback()
        
        # Check if this was a duplicate key error (race condition)
        if "duplicate key" in str(e).lower() and "platform_id" in str(e).lower():
            logger.warning(f"Race condition: interaction with platform_id {platform_id} was created by another request")
            # Try to fetch the existing one
            existing_stmt = select(Interaction).where(Interaction.platform_id == platform_id)
            existing_result = await session.execute(existing_stmt)
            existing_interaction = existing_result.scalar_one_or_none()
            if existing_interaction:
                return {"interaction_id": str(existing_interaction.id), "user_id": str(user_id), "duplicate": True}
        
        logger.error(f"Failed to commit demo interaction: {str(e)}", exc_info=True)
        raise


async def handle_content_published(session: AsyncSession, data: Dict):
    """Handle new content published event."""
    # For future: could create content records, track analytics, etc.
    logger.info(f"Demo content published: {data.get('title')}")


async def get_or_create_fan(
    session: AsyncSession,
    username: str,
    display_name: str,
    platform: str,
    user_id: uuid.UUID,
) -> Optional[Fan]:
    """Get existing fan or create new one."""
    
    # Try to find existing fan for this user by username
    stmt = select(Fan).where(
        Fan.username == username,
        Fan.user_id == user_id
    )
    result = await session.execute(stmt)
    fan = result.scalar_one_or_none()
    
    if fan:
        # Update platforms JSONB if needed
        if fan.platforms is None:
            fan.platforms = {}
        if platform not in fan.platforms:
            fan.platforms[platform] = f"@{username}"
            await session.commit()
        return fan
    
    # Create new fan
    fan = Fan(
        username=username,
        name=display_name,
        platforms={platform: f"@{username}"},
        user_id=user_id,
    )
    
    session.add(fan)
    await session.commit()
    await session.refresh(fan)
    
    return fan


def calculate_priority(interaction_data: Dict) -> int:
    """Calculate priority score for interaction."""
    score = 50  # Base score
    
    # Boost for verified authors
    if interaction_data.get('author', {}).get('verified'):
        score += 20
    
    # Boost for high subscriber count
    subs = interaction_data.get('author', {}).get('subscriber_count', 0)
    if subs > 100000:
        score += 15
    elif subs > 10000:
        score += 10
    elif subs > 1000:
        score += 5
    
    # Boost for engagement
    likes = interaction_data.get('engagement', {}).get('likes', 0)
    if likes > 100:
        score += 10
    elif likes > 10:
        score += 5
    
    # Sentiment impact
    sentiment = interaction_data.get('sentiment', 'neutral')
    if sentiment == 'positive':
        score += 5
    elif sentiment == 'negative':
        score += 15  # Negative needs attention
    
    return min(100, max(0, score))


def verify_signature(payload: Dict, signature: str, secret: str) -> bool:
    """Verify HMAC signature from demo service."""
    import json
    
    payload_str = json.dumps(payload, sort_keys=True)
    expected = hmac.new(
        secret.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)
