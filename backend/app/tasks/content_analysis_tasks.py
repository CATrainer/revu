"""Celery tasks for content analysis and classification.

These tasks run periodically to:
1. Classify content into performance categories
2. Generate AI analysis for top/underperforming content
3. Identify themes and patterns
"""
import asyncio
from datetime import datetime, timedelta
from uuid import UUID
from typing import Optional

from celery import shared_task
from sqlalchemy import select, and_
from loguru import logger

from app.core.celery import celery_app
from app.core.database import async_session_maker
from app.models.user import User
from app.models.content import ContentPiece, ContentPerformance
from app.services.content_analysis_service import ContentAnalysisService


@celery_app.task(
    name="content_analysis.classify_all_users",
    queue="analytics",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def classify_all_users_content(self):
    """Classify content for all active users.
    
    This task runs periodically (e.g., daily) to ensure all content
    is properly categorized as top performer, average, or underperformer.
    """
    logger.info("Starting content classification for all users")
    
    async def _run():
        async with async_session_maker() as session:
            # Get all users with content
            result = await session.execute(
                select(User.id, User.demo_mode_status)
                .where(User.is_active == True)
            )
            users = result.fetchall()
            
            classified_count = 0
            for user_id, demo_status in users:
                try:
                    service = ContentAnalysisService(session)
                    
                    # Classify real content
                    if demo_status != 'enabled':
                        counts = await service.classify_content(user_id, is_demo=False)
                        classified_count += sum(counts.values())
                    
                    # Classify demo content if in demo mode
                    if demo_status == 'enabled':
                        counts = await service.classify_content(user_id, is_demo=True)
                        classified_count += sum(counts.values())
                        
                except Exception as e:
                    logger.error(f"Error classifying content for user {user_id}: {e}")
                    continue
            
            logger.info(f"Classified {classified_count} pieces of content")
            return classified_count
    
    try:
        return asyncio.run(_run())
    except Exception as e:
        logger.error(f"Content classification task failed: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="content_analysis.classify_user",
    queue="analytics",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def classify_user_content(self, user_id: str, is_demo: bool = False):
    """Classify content for a specific user.
    
    Can be triggered on-demand when user views insights.
    """
    logger.info(f"Classifying content for user {user_id}")
    
    async def _run():
        async with async_session_maker() as session:
            service = ContentAnalysisService(session)
            counts = await service.classify_content(
                UUID(user_id), 
                is_demo=is_demo,
                force_reclassify=True
            )
            return counts
    
    try:
        return asyncio.run(_run())
    except Exception as e:
        logger.error(f"User content classification failed: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="content_analysis.generate_analysis_batch",
    queue="analytics",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def generate_analysis_batch(self, user_id: str, is_demo: bool = False, limit: int = 5):
    """Generate AI analysis for top/underperforming content that doesn't have analysis yet.
    
    This can be run lazily when user first views the insights pages,
    or periodically to pre-generate analysis.
    """
    logger.info(f"Generating analysis batch for user {user_id}")
    
    async def _run():
        async with async_session_maker() as session:
            service = ContentAnalysisService(session)
            baseline = await service.calculate_user_baseline(UUID(user_id), is_demo=is_demo)
            
            if baseline['total_content'] == 0:
                return {"generated": 0, "reason": "No content"}
            
            # Get top performers without analysis
            top_performers = await service.get_top_performers(
                UUID(user_id), is_demo, limit=limit
            )
            
            # Get underperformers without analysis
            underperformers = await service.get_underperformers(
                UUID(user_id), is_demo, limit=limit
            )
            
            generated = 0
            
            # Generate analysis for top performers
            for p in top_performers:
                if not p.get('insights'):  # No existing insights
                    try:
                        await service.generate_content_analysis(
                            p['content'], p['performance'], baseline, is_top_performer=True
                        )
                        generated += 1
                    except Exception as e:
                        logger.error(f"Error generating analysis: {e}")
            
            # Generate analysis for underperformers
            for p in underperformers:
                if not p.get('insights'):
                    try:
                        await service.generate_content_analysis(
                            p['content'], p['performance'], baseline, is_top_performer=False
                        )
                        generated += 1
                    except Exception as e:
                        logger.error(f"Error generating analysis: {e}")
            
            return {"generated": generated}
    
    try:
        return asyncio.run(_run())
    except Exception as e:
        logger.error(f"Analysis batch generation failed: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="content_analysis.update_themes",
    queue="analytics",
    bind=True,
    max_retries=2,
)
def update_content_themes(self, user_id: str, is_demo: bool = False):
    """Update theme aggregations for a user's content.
    
    Recalculates theme performance metrics.
    """
    logger.info(f"Updating themes for user {user_id}")
    
    async def _run():
        async with async_session_maker() as session:
            service = ContentAnalysisService(session)
            themes = await service.identify_top_themes(UUID(user_id), is_demo=is_demo)
            return {"themes_found": len(themes)}
    
    try:
        return asyncio.run(_run())
    except Exception as e:
        logger.error(f"Theme update failed: {e}")
        raise self.retry(exc=e)
