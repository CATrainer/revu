"""
Action endpoints for handling actions from main service.

When users in the main app act on demo interactions (reply, delete, etc.),
those actions are sent here to simulate platform behavior.
"""

import asyncio
import logging
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.models.demo_interaction import DemoInteraction
from app.models.demo_profile import DemoProfile
from app.services.simulation_engine import SimulationEngine
from app.services.webhook_sender import WebhookSender

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/actions/reply")
async def handle_reply_action(
    payload: Dict,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Handle reply action from main service.
    
    This simulates posting a reply on the platform.
    Optionally generates a natural follow-up response.
    """
    interaction_id = payload.get("interaction_id")
    platform_id = payload.get("platform_id")
    reply_text = payload.get("reply_text")
    user_id = payload.get("user_id")
    
    logger.info(f"📤 Received reply action for {platform_id}: {reply_text[:50]}...")
    
    # Simulate network delay (realistic)
    await asyncio.sleep(random.uniform(0.5, 2.0))
    
    # Find the original interaction
    stmt = select(DemoInteraction).where(
        DemoInteraction.external_id == platform_id
    )
    result = await session.execute(stmt)
    original_interaction = result.scalar_one_or_none()
    
    if not original_interaction:
        logger.warning(f"Demo interaction not found: {platform_id}")
        # Still return success - platform might have deleted it
        return {"status": "success", "reply_id": f"reply_{uuid.uuid4().hex[:12]}"}
    
    # Mark as replied
    original_interaction.status = 'replied'
    await session.commit()
    
    logger.info(f"✅ Reply action processed for {platform_id}")
    
    # Generate natural follow-up (varied behavior)
    should_reply_back = _should_generate_follow_up(reply_text)
    
    if should_reply_back:
        delay_minutes = _calculate_follow_up_delay()
        logger.info(f"🔄 Scheduling follow-up reply in {delay_minutes} minutes")
        
        await _schedule_follow_up_reply(
            session,
            original_interaction,
            delay_minutes
        )
    else:
        logger.debug(f"No follow-up will be generated for {platform_id}")
    
    return {
        "status": "success",
        "reply_id": f"reply_{uuid.uuid4().hex[:12]}",
        "follow_up_scheduled": should_reply_back,
    }


@router.delete("/actions/delete/{platform_id}")
async def handle_delete_action(
    platform_id: str,
    user_id: str,
    platform: str,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Handle delete action from main service.
    
    This simulates deleting a comment/DM on the platform.
    """
    logger.info(f"🗑️ Received delete action for {platform_id}")
    
    # Simulate network delay
    await asyncio.sleep(random.uniform(0.3, 1.0))
    
    # Find and mark as deleted
    stmt = select(DemoInteraction).where(
        DemoInteraction.external_id == platform_id
    )
    result = await session.execute(stmt)
    interaction = result.scalar_one_or_none()
    
    if interaction:
        interaction.status = 'deleted'
        await session.commit()
        logger.info(f"✅ Demo interaction {platform_id} marked as deleted")
    else:
        logger.warning(f"Demo interaction not found: {platform_id}")
    
    return {"status": "deleted"}


@router.post("/actions/mark-read")
async def handle_mark_read_action(
    payload: Dict,
    session: AsyncSession = Depends(get_async_session)
):
    """Handle mark as read action."""
    platform_id = payload.get("platform_id")
    
    logger.debug(f"👀 Received mark-as-read action for {platform_id}")
    
    # Simulate delay
    await asyncio.sleep(random.uniform(0.1, 0.5))
    
    # Update interaction
    stmt = select(DemoInteraction).where(
        DemoInteraction.external_id == platform_id
    )
    result = await session.execute(stmt)
    interaction = result.scalar_one_or_none()
    
    if interaction:
        interaction.status = 'read'
        await session.commit()
    
    return {"status": "success"}


@router.post("/actions/react")
async def handle_react_action(
    payload: Dict,
    session: AsyncSession = Depends(get_async_session)
):
    """Handle react/like action."""
    platform_id = payload.get("platform_id")
    reaction_type = payload.get("reaction_type", "like")
    
    logger.debug(f"❤️ Received {reaction_type} action for {platform_id}")
    
    # Simulate delay
    await asyncio.sleep(random.uniform(0.2, 0.8))
    
    # Update interaction likes
    stmt = select(DemoInteraction).where(
        DemoInteraction.external_id == platform_id
    )
    result = await session.execute(stmt)
    interaction = result.scalar_one_or_none()
    
    if interaction:
        interaction.likes += 1
        await session.commit()
    
    return {"status": "success"}


# ===== Natural Follow-up Logic =====

def _should_generate_follow_up(reply_text: str) -> bool:
    """
    Determine if a follow-up should be generated based on the reply.
    
    Natural behavior:
    - Questions get responses 60% of the time
    - Helpful answers get thanks 40% of the time
    - Generic replies get responses 15% of the time
    """
    reply_lower = reply_text.lower()
    
    # Question indicators
    if '?' in reply_text or any(word in reply_lower for word in ['how', 'what', 'why', 'when', 'where']):
        # Asking a question - high chance of follow-up
        return random.random() < 0.60
    
    # Helpful indicators
    if any(word in reply_lower for word in ['thanks', 'check', 'here', 'link', 'video', 'tutorial']):
        # Providing help - medium chance of thanks
        return random.random() < 0.40
    
    # Generic reply
    return random.random() < 0.15


def _calculate_follow_up_delay() -> int:
    """
    Calculate realistic delay for follow-up in minutes.
    
    Natural behavior:
    - 30% respond within 5 minutes (very active)
    - 40% respond within 30 minutes (active)
    - 20% respond within 2 hours (casual)
    - 10% respond within 24 hours (late responder)
    """
    rand = random.random()
    
    if rand < 0.30:
        # Very active: 1-5 minutes
        return random.randint(1, 5)
    elif rand < 0.70:
        # Active: 10-30 minutes
        return random.randint(10, 30)
    elif rand < 0.90:
        # Casual: 1-2 hours
        return random.randint(60, 120)
    else:
        # Late: 4-24 hours
        return random.randint(240, 1440)


async def _schedule_follow_up_reply(
    session: AsyncSession,
    original_interaction: DemoInteraction,
    delay_minutes: int
):
    """
    Schedule a natural follow-up reply.
    
    This creates a new demo interaction that will be sent via webhook
    after the specified delay.
    """
    import asyncio
    from app.services.content_generator import ContentGenerator
    
    # Re-fetch with relationships
    stmt = select(DemoInteraction).options(
        selectinload(DemoInteraction.profile),
        selectinload(DemoInteraction.content)
    ).where(DemoInteraction.id == original_interaction.id)
    result = await session.execute(stmt)
    interaction = result.scalar_one()
    
    # Generate appropriate follow-up text using AI
    generator = ContentGenerator()
    
    follow_up_templates = [
        "Thanks so much! That really helps! 🙏",
        "Appreciate the quick response!",
        "Got it, thank you!",
        "Perfect, that's exactly what I needed!",
        "Thanks! Just subscribed! 🔔",
        "Awesome, I'll check that out!",
        "That worked! Thank you!",
        "Much appreciated! 👍",
    ]
    
    follow_up_text = random.choice(follow_up_templates)
    
    # Create new interaction scheduled for future delivery
    scheduled_time = datetime.utcnow() + timedelta(minutes=delay_minutes)
    
    new_interaction = DemoInteraction(
        profile_id=interaction.profile_id,
        content_id=interaction.content_id,
        platform=interaction.platform,
        interaction_type=interaction.interaction_type,
        author_username=interaction.author_username,
        author_display_name=interaction.author_display_name,
        author_avatar_url=interaction.author_avatar_url,
        author_verified=interaction.author_verified,
        author_subscriber_count=interaction.author_subscriber_count,
        content_text=follow_up_text,
        sentiment='positive',  # Follow-ups are usually positive
        likes=random.randint(0, 5),
        external_id=f"demo_followup_{uuid.uuid4().hex[:12]}",
        scheduled_for=scheduled_time,
        status='pending',
        is_reply=True,  # Mark as reply
        parent_external_id=interaction.external_id,  # Link to original
    )
    
    session.add(new_interaction)
    await session.commit()
    
    logger.info(
        f"✨ Follow-up scheduled for {delay_minutes} min from now: "
        f"{follow_up_text[:40]}..."
    )
