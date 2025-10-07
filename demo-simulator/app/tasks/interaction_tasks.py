"""Celery tasks for interaction generation and delivery."""
import logging
from datetime import datetime, timedelta
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models import DemoProfile, DemoContent, DemoInteraction
from app.services.simulation_engine import SimulationEngine
from app.services.webhook_sender import WebhookSender
from sqlalchemy import select, and_

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.interaction_tasks.generate_comments_batch")
def generate_comments_batch():
    """Generate comments for recent content."""
    import asyncio
    asyncio.run(_generate_comments_async())


async def _generate_comments_async():
    """Async implementation of comment generation."""
    async with AsyncSessionLocal() as session:
        # Get content from last 48 hours that still needs comments
        cutoff = datetime.utcnow() - timedelta(hours=48)
        
        stmt = select(DemoContent).where(
            and_(
                DemoContent.published_at >= cutoff,
                DemoContent.engagement_complete == False
            )
        ).limit(20)  # Process 20 pieces of content at a time
        
        result = await session.execute(stmt)
        content_items = list(result.scalars().all())
        
        if not content_items:
            logger.info("No content needing comments")
            return
        
        engine = SimulationEngine()
        
        for content in content_items:
            try:
                remaining = content.get_remaining_comments()
                
                if remaining <= 0:
                    content.engagement_complete = True
                    await session.commit()
                    continue
                
                # Generate comments based on engagement wave
                hours_since_publish = (datetime.utcnow() - content.published_at).total_seconds() / 3600
                wave_multiplier = content.calculate_engagement_wave(int(hours_since_publish))
                
                # Generate 10-30 comments per batch, adjusted by wave
                batch_size = int(min(remaining, random.randint(10, 30) * wave_multiplier))
                
                if batch_size > 0:
                    await engine.generate_comments_for_content(
                        session,
                        content,
                        batch_size
                    )
                
            except Exception as e:
                logger.error(f"Error generating comments for content {content.id}: {str(e)}")
                await session.rollback()


@celery_app.task(name="app.tasks.interaction_tasks.generate_dms_batch")
def generate_dms_batch():
    """Generate DMs for active profiles."""
    import asyncio
    asyncio.run(_generate_dms_async())


async def _generate_dms_async():
    """Async implementation of DM generation."""
    async with AsyncSessionLocal() as session:
        # Get all active profiles
        stmt = select(DemoProfile).where(DemoProfile.is_active == True)
        result = await session.execute(stmt)
        profiles = list(result.scalars().all())
        
        if not profiles:
            return
        
        engine = SimulationEngine()
        
        for profile in profiles:
            try:
                # Generate 1-5 DMs per batch based on frequency
                target = profile.get_dm_target()
                
                # This runs every 30 minutes, so daily target / 48 runs
                batch_size = max(1, target // 48)
                
                for _ in range(batch_size):
                    await engine.generate_dm(session, profile)
                
            except Exception as e:
                logger.error(f"Error generating DMs for profile {profile.id}: {str(e)}")
                await session.rollback()


@celery_app.task(name="app.tasks.interaction_tasks.send_queued_interactions")
def send_queued_interactions():
    """Send queued interactions to main app via webhooks."""
    import asyncio
    asyncio.run(_send_interactions_async())


async def _send_interactions_async():
    """Async implementation of interaction sending."""
    async with AsyncSessionLocal() as session:
        # Get pending interactions scheduled for now or earlier
        now = datetime.utcnow()
        
        stmt = select(DemoInteraction).where(
            and_(
                DemoInteraction.status == 'pending',
                DemoInteraction.scheduled_for <= now
            )
        ).limit(50)  # Send 50 at a time
        
        result = await session.execute(stmt)
        interactions = list(result.scalars().all())
        
        if not interactions:
            return
        
        webhook = WebhookSender()
        sent_count = 0
        failed_count = 0
        
        for interaction in interactions:
            try:
                # Convert to webhook payload
                payload = interaction.to_webhook_payload()
                
                # Send webhook
                success = await webhook.send_interaction_created(payload)
                
                if success:
                    interaction.status = 'sent'
                    interaction.sent_at = datetime.utcnow()
                    sent_count += 1
                else:
                    interaction.status = 'failed'
                    interaction.error_message = "Webhook delivery failed"
                    failed_count += 1
                
                await session.commit()
                
            except Exception as e:
                logger.error(f"Error sending interaction {interaction.id}: {str(e)}")
                interaction.status = 'failed'
                interaction.error_message = str(e)
                await session.commit()
                failed_count += 1
        
        logger.info(f"Sent {sent_count} interactions, {failed_count} failed")


import random
