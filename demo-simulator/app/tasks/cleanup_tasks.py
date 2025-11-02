"""Cleanup tasks for old demo data."""
import logging
from datetime import datetime, timedelta
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models import DemoProfile, DemoContent, DemoInteraction, GenerationCache
from sqlalchemy import select, delete, and_

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.cleanup_tasks.cleanup_old_demo_data")
def cleanup_old_demo_data():
    """Clean up old demo data to save space."""
    import asyncio
    import nest_asyncio
    
    nest_asyncio.apply()
    asyncio.run(_cleanup_async())


async def _cleanup_async():
    """Async implementation of cleanup."""
    async with AsyncSessionLocal() as session:
        # Delete sent interactions older than 30 days
        cutoff_interactions = datetime.utcnow() - timedelta(days=30)
        
        stmt = delete(DemoInteraction).where(
            and_(
                DemoInteraction.status == 'sent',
                DemoInteraction.sent_at < cutoff_interactions
            )
        )
        result = await session.execute(stmt)
        await session.commit()
        logger.info(f"Deleted {result.rowcount} old interactions")
        
        # Delete content older than 60 days
        cutoff_content = datetime.utcnow() - timedelta(days=60)
        
        stmt = delete(DemoContent).where(
            DemoContent.published_at < cutoff_content
        )
        result = await session.execute(stmt)
        await session.commit()
        logger.info(f"Deleted {result.rowcount} old content items")
        
        # Clean up unused cache entries (not used in 7 days)
        cutoff_cache = datetime.utcnow() - timedelta(days=7)
        
        stmt = delete(GenerationCache).where(
            GenerationCache.last_used_at < cutoff_cache
        )
        result = await session.execute(stmt)
        await session.commit()
        logger.info(f"Deleted {result.rowcount} unused cache entries")
        
        # Deactivate profiles with no activity in 30 days
        stmt = select(DemoProfile).where(
            and_(
                DemoProfile.is_active == True,
                DemoProfile.last_activity_at < cutoff_interactions
            )
        )
        result = await session.execute(stmt)
        inactive_profiles = list(result.scalars().all())
        
        for profile in inactive_profiles:
            profile.is_active = False
        
        if inactive_profiles:
            await session.commit()
            logger.info(f"Deactivated {len(inactive_profiles)} inactive profiles")
