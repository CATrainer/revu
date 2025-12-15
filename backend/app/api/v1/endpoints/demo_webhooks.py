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
from app.models.content import ContentPiece, ContentPerformance
from sqlalchemy import select, and_

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
            result = await handle_content_published(session, payload.data)
            logger.info(f"Demo content created successfully: {result}")
            return {"status": "received", "created": result}
        elif payload.event == 'content.metrics_updated':
            result = await handle_content_metrics_updated(session, payload.data)
            return {"status": "received", "updated": result}
        elif payload.event == 'reply.followup':
            result = await handle_interaction_created(session, payload.data)
            logger.info(f"Demo reply followup created: {result}")
            return {"status": "received", "created": result}
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
    
    # Check if user is in demo mode (use demo_mode_status, not deprecated demo_mode)
    if user.demo_mode_status != 'enabled':
        error_msg = f"User {user_id} is not in demo mode (status: {user.demo_mode_status}) - rejecting demo data"
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
    
    # Extract parent content data (what the interaction is about)
    content_data = data.get('content', {})
    parent_content_id = content_data.get('id')
    parent_content_title = content_data.get('title')
    parent_content_url = None  # Demo service doesn't provide URL yet, but we can generate it
    if parent_content_id:
        # Generate a realistic demo URL based on platform
        platform = data.get('platform', 'youtube')
        if platform == 'youtube':
            parent_content_url = f"https://youtube.com/watch?v={parent_content_id}"
        elif platform == 'instagram':
            parent_content_url = f"https://instagram.com/p/{parent_content_id}"
        elif platform == 'tiktok':
            parent_content_url = f"https://tiktok.com/@demo/video/{parent_content_id}"
    
    # Create interaction
    interaction_id = uuid.uuid4()
    platform_id = interaction_data.get('id') or f"demo_{interaction_id}"
    
    logger.debug(f"Creating interaction with platform_id: {platform_id}, parent_content: {parent_content_title}")
    
    # Try to find existing interactions from same author on same content (for threading)
    thread_id = None
    reply_to_id = None
    if parent_content_id and author_data.get('username'):
        # Look for previous interactions from this author on this content
        thread_stmt = select(Interaction).where(
            and_(
                Interaction.user_id == user_id,
                Interaction.parent_content_id == parent_content_id,
                Interaction.author_username == author_data.get('username'),
                Interaction.is_demo == True
            )
        ).order_by(Interaction.created_at.desc()).limit(1)
        
        thread_result = await session.execute(thread_stmt)
        previous_interaction = thread_result.scalar_one_or_none()
        
        if previous_interaction:
            # This is a follow-up from the same user
            thread_id = previous_interaction.thread_id or previous_interaction.id
            reply_to_id = previous_interaction.id
            logger.info(f"Linking new interaction to thread {thread_id} (replying to {reply_to_id})")
    
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
        # Add parent content metadata for rich context
        parent_content_id=parent_content_id,
        parent_content_title=parent_content_title,
        parent_content_url=parent_content_url,
        # Thread linking
        thread_id=thread_id,
        reply_to_id=reply_to_id,
        is_reply=reply_to_id is not None,
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


async def handle_content_published(session: AsyncSession, data: Dict) -> Dict:
    """Handle new content published event - creates ContentPiece in production DB."""
    
    user_id_str = data.get('user_id')
    if not user_id_str:
        logger.error("Demo content webhook missing user_id")
        raise ValueError("Missing user_id in content.published webhook")
    
    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid user_id format: {user_id_str}") from e
    
    # Verify user exists and is in demo mode
    user_stmt = select(User).where(User.id == user_id)
    user_result = await session.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise ValueError(f"User {user_id} not found")
    
    if user.demo_mode_status != 'enabled':
        raise ValueError(f"User {user_id} is not in demo mode")
    
    # Extract content data
    platform = data.get('platform', 'youtube')
    platform_id = data.get('id') or data.get('external_id')
    content_type = data.get('type', 'video')
    title = data.get('title', 'Demo Content')
    description = data.get('description', '')
    thumbnail_url = data.get('thumbnail_url')
    url = data.get('url')
    duration_seconds = data.get('duration_seconds')
    hashtags = data.get('hashtags', [])
    theme = data.get('theme')
    published_at_str = data.get('published_at')
    
    # Parse published_at
    if published_at_str:
        try:
            published_at = datetime.fromisoformat(published_at_str.replace('Z', '+00:00'))
        except:
            published_at = datetime.utcnow()
    else:
        published_at = datetime.utcnow()
    
    # Generate URL if not provided
    if not url:
        if platform == 'youtube':
            url = f"https://youtube.com/watch?v={platform_id}"
        elif platform == 'instagram':
            url = f"https://instagram.com/p/{platform_id}"
        elif platform == 'tiktok':
            url = f"https://tiktok.com/@demo/video/{platform_id}"
    
    # Check if content already exists
    existing_stmt = select(ContentPiece).where(ContentPiece.platform_id == platform_id)
    existing_result = await session.execute(existing_stmt)
    existing_content = existing_result.scalar_one_or_none()
    
    if existing_content:
        logger.info(f"Demo content {platform_id} already exists - skipping")
        return {"content_id": str(existing_content.id), "duplicate": True}
    
    # Create ContentPiece
    content = ContentPiece(
        id=uuid.uuid4(),
        user_id=user_id,
        organization_id=user.organization_id,
        platform=platform,
        platform_id=platform_id,
        content_type=content_type,
        title=title,
        description=description,
        url=url,
        thumbnail_url=thumbnail_url,
        duration_seconds=duration_seconds,
        hashtags=hashtags if isinstance(hashtags, list) else [],
        theme=theme,
        published_at=published_at,
        is_demo=True,  # CRITICAL: Mark as demo data
    )
    
    session.add(content)
    
    # Create initial ContentPerformance record
    metrics = data.get('metrics', {})
    performance = ContentPerformance(
        id=uuid.uuid4(),
        content_id=content.id,
        views=metrics.get('views', 0),
        likes=metrics.get('likes', 0),
        comments_count=metrics.get('comments_count', 0),
        shares=metrics.get('shares', 0),
        saves=metrics.get('saves', 0),
        watch_time_minutes=metrics.get('watch_time_minutes', 0),
        average_view_duration_seconds=metrics.get('avg_view_duration_seconds'),
        retention_rate=metrics.get('retention_rate'),
        engagement_rate=metrics.get('engagement_rate'),
    )
    
    session.add(performance)
    
    await session.commit()
    
    logger.info(f"✅ Created demo content {content.id} for user {user_id} (platform: {platform}, is_demo: True)")
    
    return {"content_id": str(content.id), "user_id": str(user_id), "duplicate": False}


async def handle_content_metrics_updated(session: AsyncSession, data: Dict) -> Dict:
    """Handle content metrics update event."""
    
    platform_id = data.get('platform_id') or data.get('id')
    if not platform_id:
        raise ValueError("Missing platform_id in metrics update")
    
    # Find the content piece
    content_stmt = select(ContentPiece).where(
        and_(
            ContentPiece.platform_id == platform_id,
            ContentPiece.is_demo == True
        )
    )
    content_result = await session.execute(content_stmt)
    content = content_result.scalar_one_or_none()
    
    if not content:
        logger.warning(f"Demo content {platform_id} not found for metrics update")
        return {"updated": False, "reason": "content_not_found"}
    
    # Update performance metrics
    metrics = data.get('metrics', {})
    
    if content.performance:
        perf = content.performance
        perf.views = metrics.get('views', perf.views)
        perf.likes = metrics.get('likes', perf.likes)
        perf.comments_count = metrics.get('comments_count', perf.comments_count)
        perf.shares = metrics.get('shares', perf.shares)
        perf.saves = metrics.get('saves', perf.saves)
        perf.watch_time_minutes = metrics.get('watch_time_minutes', perf.watch_time_minutes)
        if metrics.get('engagement_rate'):
            perf.engagement_rate = metrics['engagement_rate']
        perf.last_updated = datetime.utcnow()
    else:
        # Create performance record if missing
        performance = ContentPerformance(
            id=uuid.uuid4(),
            content_id=content.id,
            views=metrics.get('views', 0),
            likes=metrics.get('likes', 0),
            comments_count=metrics.get('comments_count', 0),
            shares=metrics.get('shares', 0),
            saves=metrics.get('saves', 0),
        )
        session.add(performance)
    
    await session.commit()
    
    logger.info(f"Updated metrics for demo content {content.id}")
    return {"content_id": str(content.id), "updated": True}


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
    
    # Create new fan - CRITICAL: Mark as demo data
    fan = Fan(
        username=username,
        name=display_name,
        platforms={platform: f"@{username}"},
        user_id=user_id,
        is_demo=True,  # CRITICAL: Prevent demo/real data mixing
    )
    
    session.add(fan)
    await session.commit()
    await session.refresh(fan)
    
    logger.debug(f"Created demo fan: {username} (is_demo=True)")
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
