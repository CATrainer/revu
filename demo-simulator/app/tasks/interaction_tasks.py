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
    """
    Async implementation of comment generation.
    
    OPTIMIZATION: Batch multiple videos into ONE API call to reduce costs by 10x.
    Instead of 10 videos = 10 API calls, we do 10 videos = 1 API call.
    """
    from sqlalchemy.orm import selectinload
    import random
    
    async with AsyncSessionLocal() as session:
        # Get content from last 48 hours that still needs comments
        cutoff = datetime.utcnow() - timedelta(hours=48)
        
        # Use selectinload to eager load relationships and prevent lazy loading
        stmt = select(DemoContent).options(
            selectinload(DemoContent.profile)
        ).where(
            and_(
                DemoContent.published_at >= cutoff,
                DemoContent.engagement_complete == False
            )
        ).limit(10)  # Reduced from 20 to 10 to keep prompt size manageable
        
        result = await session.execute(stmt)
        content_items = list(result.scalars().all())
        
        if not content_items:
            logger.info("No content needing comments")
            return
        
        # OPTIMIZATION: Batch all videos into one API call
        engine = SimulationEngine()
        
        # Prepare batch data
        batch_requests = []
        for content in content_items:
            try:
                target_comments = content.target_comments
                comments_count = content.comments_count
                published_at = content.published_at
                
                remaining = max(0, target_comments - comments_count)
                
                if remaining <= 0:
                    content.engagement_complete = True
                    await session.commit()
                    continue
                
                # Calculate how many comments to generate (2-5 per video to keep totals reasonable)
                batch_size = min(remaining, random.randint(2, 5))
                
                if batch_size > 0:
                    batch_requests.append({
                        'content': content,
                        'count': batch_size,
                        'title': content.title
                    })
                
            except Exception as e:
                logger.error(f"Error preparing content {content.id}: {str(e)}")
        
        if not batch_requests:
            logger.info("No comments to generate")
            return
        
        # Generate ALL comments in ONE API call (massive cost savings!)
        try:
            logger.info(f"🚀 Batching {len(batch_requests)} videos into ONE API call ({sum(r['count'] for r in batch_requests)} total comments)")
            await engine.generate_comments_batch_optimized(session, batch_requests)
            logger.info(f"✅ Successfully generated comments for {len(batch_requests)} videos in single API call")
        except Exception as e:
            logger.error(f"Error in batched comment generation: {str(e)}")
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
        profiles = result.scalars().all()
        
        if not profiles:
            return
        
        engine = SimulationEngine()
        
        for profile in profiles:
            profile_id = None
            try:
                # Access attributes within session context to avoid detached state
                profile_id = profile.id
                dm_frequency = profile.dm_frequency
                
                # Generate 1-5 DMs per batch based on frequency
                # Inline get_dm_target logic
                if dm_frequency == 'low':
                    target = 5
                elif dm_frequency == 'high':
                    target = 50
                else:
                    target = 20
                
                # This runs every 30 minutes, so daily target / 48 runs
                batch_size = max(1, target // 48)
                
                for _ in range(batch_size):
                    await engine.generate_dm(session, profile)
                
            except Exception as e:
                logger.error(f"Error generating DMs for profile {profile_id or 'unknown'}: {str(e)}")
                await session.rollback()


@celery_app.task(name="app.tasks.interaction_tasks.send_queued_interactions")
def send_queued_interactions():
    """Send queued interactions to main app via webhooks."""
    import asyncio
    asyncio.run(_send_interactions_async())


async def _send_interactions_async():
    """Async implementation of interaction sending."""
    from sqlalchemy.orm import selectinload
    
    async with AsyncSessionLocal() as session:
        # Get pending interactions scheduled for now or earlier
        now = datetime.utcnow()
        
        # Eager load profile and content relationships to avoid lazy loading
        stmt = select(DemoInteraction).options(
            selectinload(DemoInteraction.profile),
            selectinload(DemoInteraction.content)
        ).where(
            and_(
                DemoInteraction.status == 'pending',
                DemoInteraction.scheduled_for <= now
            )
        ).limit(50)  # Send 50 at a time
        
        result = await session.execute(stmt)
        interactions = result.scalars().all()
        
        if not interactions:
            return
        
        webhook = WebhookSender()
        sent_count = 0
        failed_count = 0
        
        for interaction in interactions:
            interaction_id = None
            try:
                # Access id within try block to avoid lazy loading issues
                interaction_id = interaction.id
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
                logger.error(f"Error sending interaction {interaction_id or 'unknown'}: {str(e)}")
                try:
                    interaction.status = 'failed'
                    interaction.error_message = str(e)
                    await session.commit()
                except Exception:
                    pass  # If we can't update the status, just continue
                failed_count += 1
        
        logger.info(f"Sent {sent_count} interactions, {failed_count} failed")


import random
