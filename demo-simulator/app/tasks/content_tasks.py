"""Celery tasks for content creation."""
import logging
import random
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models import DemoProfile
from app.services.simulation_engine import SimulationEngine
from sqlalchemy import select

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.content_tasks.upload_content_for_active_profiles")
def upload_content_for_active_profiles():
    """Upload new content for all active demo profiles."""
    import asyncio
    import nest_asyncio
    
    nest_asyncio.apply()
    asyncio.run(_upload_content_async())


async def _upload_content_async():
    """Async implementation of content upload."""
    async with AsyncSessionLocal() as session:
        # Get all active profiles
        stmt = select(DemoProfile).where(DemoProfile.is_active == True)
        result = await session.execute(stmt)
        profiles = list(result.scalars().all())
        
        if not profiles:
            logger.info("No active demo profiles found")
            return
        
        engine = SimulationEngine()
        
        for profile in profiles:
            try:
                # Determine which platforms to post on based on upload frequency
                platforms_to_post = _get_platforms_for_upload(profile)
                
                for platform in platforms_to_post:
                    await engine.create_content(session, profile, platform)
                
                # Update last activity
                from datetime import datetime
                profile.last_activity_at = datetime.utcnow()
                await session.commit()
                
            except Exception as e:
                logger.error(f"Error uploading content for profile {profile.id}: {str(e)}")
                await session.rollback()


def _get_platforms_for_upload(profile: DemoProfile) -> list:
    """Determine which platforms should get new content."""
    platforms = []
    
    # YouTube
    if _should_upload(profile.yt_upload_frequency):
        platforms.append('youtube')
    
    # Instagram
    if _should_upload(profile.ig_post_frequency):
        platforms.append('instagram')
    
    # TikTok
    if _should_upload(profile.tt_post_frequency):
        platforms.append('tiktok')
    
    return platforms


def _should_upload(frequency: str) -> bool:
    """Determine if content should be uploaded based on frequency setting."""
    # This task runs every 4 hours
    # daily = always upload
    # every_other_day = 50% chance
    # weekly = 14% chance (1/7)
    
    if frequency == 'daily':
        return True
    elif frequency == 'every_other_day':
        return random.random() < 0.5
    elif frequency == 'weekly':
        return random.random() < 0.15
    
    return True  # Default to daily
