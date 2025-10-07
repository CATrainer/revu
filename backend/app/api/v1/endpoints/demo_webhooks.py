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
    
    # Verify signature
    webhook_secret = getattr(settings, 'DEMO_WEBHOOK_SECRET', None)
    
    if webhook_secret and x_demo_signature:
        if not verify_signature(payload.dict(), x_demo_signature, webhook_secret):
            raise HTTPException(401, "Invalid webhook signature")
    
    # Route to appropriate handler
    if payload.event == 'interaction.created':
        await handle_interaction_created(session, payload.data)
    elif payload.event == 'content.published':
        await handle_content_published(session, payload.data)
    else:
        logger.warning(f"Unknown demo event type: {payload.event}")
    
    return {"status": "received"}


async def handle_interaction_created(session: AsyncSession, data: Dict):
    """Handle new interaction from demo simulator."""
    
    interaction_data = data.get('interaction', {})
    author_data = interaction_data.get('author', {})
    
    # Get or create fan
    fan = await get_or_create_fan(
        session,
        author_data.get('username'),
        author_data.get('display_name'),
        data.get('platform'),
    )
    
    # Create interaction
    interaction = Interaction(
        id=uuid.uuid4(),
        platform=data.get('platform'),
        interaction_type=interaction_data.get('type', 'comment'),
        external_id=interaction_data.get('id'),
        content=interaction_data.get('content'),
        author_username=author_data.get('username'),
        author_display_name=author_data.get('display_name'),
        author_avatar_url=author_data.get('avatar_url'),
        author_verified=author_data.get('verified', False),
        author_subscriber_count=author_data.get('subscriber_count', 0),
        like_count=interaction_data.get('engagement', {}).get('likes', 0),
        reply_count=interaction_data.get('engagement', {}).get('replies', 0),
        sentiment=interaction_data.get('sentiment', 'neutral'),
        status='unread',
        priority_score=calculate_priority(interaction_data),
        fan_id=fan.id if fan else None,
        # Will be set by middleware/dependency
        user_id=None,  # TODO: Get from demo profile mapping
    )
    
    session.add(interaction)
    await session.commit()
    
    logger.info(f"Created demo interaction: {interaction.id}")


async def handle_content_published(session: AsyncSession, data: Dict):
    """Handle new content published event."""
    # For future: could create content records, track analytics, etc.
    logger.info(f"Demo content published: {data.get('title')}")


async def get_or_create_fan(
    session: AsyncSession,
    username: str,
    display_name: str,
    platform: str,
) -> Optional[Fan]:
    """Get existing fan or create new one."""
    
    # Try to find existing fan
    stmt = select(Fan).where(
        Fan.username == username,
        Fan.platform == platform
    )
    result = await session.execute(stmt)
    fan = result.scalar_one_or_none()
    
    if fan:
        return fan
    
    # Create new fan
    fan = Fan(
        username=username,
        display_name=display_name,
        platform=platform,
        # TODO: Get user_id from demo profile mapping
        user_id=None,
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
