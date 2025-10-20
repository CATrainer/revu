"""
Celery tasks for demo mode simulation.

These tasks run periodically to generate new content and interactions
for users in demo mode, ensuring realistic ongoing activity.
"""

import logging
import httpx
from datetime import datetime, timedelta
from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)


@shared_task(name="demo.generate_daily_content")
def generate_daily_content_sync():
    """
    Synchronous wrapper for async content generation task.
    Runs daily to generate new content for demo profiles.
    """
    import asyncio
    return asyncio.run(generate_daily_content())


async def generate_daily_content():
    """
    Generate new demo content for active demo profiles.
    
    This runs daily and creates 1-3 new pieces of content per profile
    based on their channel size/activity level.
    """
    logger.info("🎬 Starting daily demo content generation...")
    
    async with AsyncSessionLocal() as session:
        # Find all users in demo mode
        stmt = select(User).where(User.demo_mode == True)
        result = await session.execute(stmt)
        demo_users = result.scalars().all()
        
        if not demo_users:
            logger.info("No active demo users found")
            return {"status": "no_users"}
        
        logger.info(f"Found {len(demo_users)} demo users")
        
        generated_count = 0
        failed_count = 0
        
        for user in demo_users:
            try:
                # Check how long demo mode has been active
                # Don't generate if just enabled (initial batch is handled separately)
                if user.demo_mode_enabled_at:
                    hours_active = (datetime.utcnow() - user.demo_mode_enabled_at).total_seconds() / 3600
                    if hours_active < 24:
                        logger.debug(f"Skipping user {user.id} - demo mode active for < 24h")
                        continue
                
                # Call demo-simulator to generate new content
                demo_url = f"{settings.DEMO_SERVICE_URL}/generate/daily-content"
                
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        demo_url,
                        json={
                            "user_id": str(user.id),
                            "count": 2  # Generate 2 new pieces of content daily
                        }
                    )
                    
                    if response.status_code == 200:
                        logger.info(f"✅ Generated daily content for user {user.id}")
                        generated_count += 1
                    else:
                        logger.warning(f"Failed to generate content for user {user.id}: {response.status_code}")
                        failed_count += 1
                        
            except Exception as e:
                logger.error(f"Error generating content for user {user.id}: {e}", exc_info=True)
                failed_count += 1
        
        logger.info(f"Daily content generation complete: {generated_count} success, {failed_count} failed")
        
        return {
            "status": "completed",
            "users_processed": len(demo_users),
            "generated": generated_count,
            "failed": failed_count
        }


@shared_task(name="demo.generate_ongoing_interactions")
def generate_ongoing_interactions_sync():
    """
    Synchronous wrapper for ongoing interaction generation.
    Runs every few hours to add new comments/DMs to existing content.
    """
    import asyncio
    return asyncio.run(generate_ongoing_interactions())


async def generate_ongoing_interactions():
    """
    Generate ongoing interactions for existing demo content.
    
    Adds new comments to recent content and generates new DMs
    to simulate ongoing audience engagement.
    """
    logger.info("💬 Starting ongoing interaction generation...")
    
    async with AsyncSessionLocal() as session:
        # Find all users in demo mode who have been active for > 6 hours
        stmt = select(User).where(
            User.demo_mode == True,
        )
        result = await session.execute(stmt)
        demo_users = result.scalars().all()
        
        if not demo_users:
            logger.info("No active demo users found")
            return {"status": "no_users"}
        
        logger.info(f"Found {len(demo_users)} demo users for ongoing interactions")
        
        generated_count = 0
        failed_count = 0
        
        for user in demo_users:
            try:
                # Skip if demo mode just enabled (initial batch handles first interactions)
                if user.demo_mode_enabled_at:
                    hours_active = (datetime.utcnow() - user.demo_mode_enabled_at).total_seconds() / 3600
                    if hours_active < 6:
                        logger.debug(f"Skipping user {user.id} - demo mode active for < 6h")
                        continue
                
                # Call demo-simulator to generate new interactions
                demo_url = f"{settings.DEMO_SERVICE_URL}/generate/interactions"
                
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        demo_url,
                        json={
                            "user_id": str(user.id),
                            "comments": 10,  # Add 10 new comments
                            "dms": 5  # Add 5 new DMs
                        }
                    )
                    
                    if response.status_code == 200:
                        logger.info(f"✅ Generated ongoing interactions for user {user.id}")
                        generated_count += 1
                    else:
                        logger.warning(f"Failed to generate interactions for user {user.id}: {response.status_code}")
                        failed_count += 1
                        
            except Exception as e:
                logger.error(f"Error generating interactions for user {user.id}: {e}", exc_info=True)
                failed_count += 1
        
        logger.info(f"Ongoing interaction generation complete: {generated_count} success, {failed_count} failed")
        
        return {
            "status": "completed",
            "users_processed": len(demo_users),
            "generated": generated_count,
            "failed": failed_count
        }


@shared_task(name="demo.cleanup_old_data")
def cleanup_old_demo_data_sync():
    """
    Clean up old demo data to prevent database bloat.
    Runs weekly to remove demo data older than 30 days.
    """
    import asyncio
    return asyncio.run(cleanup_old_demo_data())


async def cleanup_old_demo_data():
    """
    Remove demo interactions and content older than 30 days.
    
    This prevents the database from growing indefinitely with demo data.
    """
    logger.info("🧹 Starting demo data cleanup...")
    
    async with AsyncSessionLocal() as session:
        from app.models.interaction import Interaction
        from sqlalchemy import delete
        
        # Delete interactions older than 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        stmt = delete(Interaction).where(
            Interaction.is_demo == True,
            Interaction.created_at < cutoff_date
        )
        
        result = await session.execute(stmt)
        await session.commit()
        
        deleted_count = result.rowcount
        logger.info(f"✅ Deleted {deleted_count} old demo interactions")
        
        return {
            "status": "completed",
            "deleted_interactions": deleted_count
        }
