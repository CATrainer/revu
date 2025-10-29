"""Celery tasks for demo mode operations."""

from datetime import datetime
from typing import Optional
from uuid import UUID
import httpx

from loguru import logger
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery import celery
from app.core.config import settings
from app.core.database import get_async_session_context
from app.models.user import User
from app.models.background_job import BackgroundJob
from app.models.interaction import Interaction
from app.models.content import ContentPiece
from app.services.background_jobs import BackgroundJobService


@celery.task(
    name="demo.enable",
    bind=True,
    max_retries=2,
    time_limit=300,  # 5 minute hard limit
    soft_time_limit=240,  # 4 minute soft limit
)
def enable_demo_mode_task(self, user_id: str, job_id: str):
    """
    Celery task to enable demo mode for a user.
    
    This task:
    1. Calls the demo service to create a profile
    2. Updates user.demo_mode_status to 'enabled'
    3. Stores demo profile ID
    4. Marks background job as completed
    
    Args:
        user_id: User ID (string UUID)
        job_id: Background job ID (string UUID)
    
    Timeout: 5 minutes hard limit, 4 minutes soft limit
    """
    import asyncio
    try:
        asyncio.run(_enable_demo_mode_async(user_id, job_id))
    except Exception as e:
        logger.error(f"Fatal error in enable_demo_mode_task: {e}", exc_info=True)
        # The async function should handle DB updates, but log here too
        raise


async def _enable_demo_mode_async(user_id: str, job_id: str):
    """Async implementation of demo enable task."""
    async with get_async_session_context() as db:
        try:
            # Get user and job
            user = await db.get(User, UUID(user_id))
            job = await db.get(BackgroundJob, UUID(job_id))
            
            if not user:
                raise ValueError(f"User {user_id} not found")
            if not job:
                raise ValueError(f"Job {job_id} not found")
            
            # Mark job as running
            job.mark_running()
            await db.commit()
            
            # Call demo service to create profile
            demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
            if not demo_service_url:
                raise ValueError("DEMO_SERVICE_URL not configured")
            
            # Prepare payload (basic config - could be extended)
            payload = {
                "user_id": str(user.id),
                "profile_type": "auto",
                "channel_name": "TechReview Pro",  # Can be randomized or user-configured
                "niche": "tech_reviews",
                "personality": "friendly_professional",
                "yt_subscribers": 100000,
                "yt_avg_views": 50000,
                "yt_upload_frequency": "daily",
                "ig_followers": 50000,
                "ig_post_frequency": "daily",
                "tt_followers": 200000,
                "tt_post_frequency": "daily",
                "comment_volume": "medium",
                "dm_frequency": "medium",
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    response = await client.post(
                        f"{demo_service_url}/profiles",
                        json=payload,
                    )
                    
                    # If profile already exists, deactivate and retry
                    if response.status_code == 400 and "already has an active" in response.text:
                        logger.info(f"Deactivating existing demo profile for user {user_id}")
                        await client.delete(f"{demo_service_url}/profiles/{user_id}")
                        response = await client.post(f"{demo_service_url}/profiles", json=payload)
                    
                    if response.status_code != 200:
                        raise ValueError(f"Demo service returned {response.status_code}: {response.text}")
                    
                    profile_data = response.json()
                    
                except httpx.TimeoutException:
                    raise ValueError("Demo service timed out")
                except httpx.RequestError as e:
                    raise ValueError(f"Demo service unavailable: {str(e)}")
            
            # Update user status to enabled
            user.demo_mode_status = 'enabled'
            user.demo_profile_id = profile_data.get('id')
            user.demo_mode_error = None
            if not user.demo_mode_enabled_at:
                user.demo_mode_enabled_at = datetime.utcnow()
            
            # Mark job as completed
            job.mark_completed(result_data=profile_data)
            
            await db.commit()
            
            logger.info(f"✅ Demo mode enabled for user {user_id}, profile {profile_data.get('id')}")
            
        except Exception as e:
            # Rollback on error
            await db.rollback()
            
            # Update user status to failed
            user = await db.get(User, UUID(user_id))
            if user:
                user.demo_mode_status = 'failed'
                user.demo_mode_error = str(e)
            
            # Mark job as failed
            job = await db.get(BackgroundJob, UUID(job_id))
            if job:
                job.mark_failed(
                    error_message=str(e),
                    error_details={"error_type": type(e).__name__}
                )
            
            await db.commit()
            
            logger.error(f"❌ Failed to enable demo mode for user {user_id}: {e}")
            raise


@celery.task(
    name="demo.disable",
    bind=True,
    max_retries=2,
    time_limit=180,  # 3 minute hard limit
    soft_time_limit=150,  # 2.5 minute soft limit
)
def disable_demo_mode_task(self, user_id: str, job_id: str):
    """
    Celery task to disable demo mode for a user.
    
    This task:
    1. Calls the demo service to deactivate profile
    2. Deletes all demo data (interactions, content)
    3. Updates user.demo_mode_status to 'disabled'
    4. Marks background job as completed
    
    Args:
        user_id: User ID (string UUID)
        job_id: Background job ID (string UUID)
    
    Timeout: 3 minutes hard limit, 2.5 minutes soft limit
    """
    import asyncio
    try:
        asyncio.run(_disable_demo_mode_async(user_id, job_id))
    except Exception as e:
        logger.error(f"Fatal error in disable_demo_mode_task: {e}", exc_info=True)
        # The async function should handle DB updates, but log here too
        raise


async def _disable_demo_mode_async(user_id: str, job_id: str):
    """Async implementation of demo disable task."""
    async with get_async_session_context() as db:
        try:
            # Get user and job
            user = await db.get(User, UUID(user_id))
            job = await db.get(BackgroundJob, UUID(job_id))
            
            if not user:
                raise ValueError(f"User {user_id} not found")
            if not job:
                raise ValueError(f"Job {job_id} not found")
            
            # Mark job as running
            job.mark_running()
            await db.commit()
            
            # Step 1: Deactivate demo service profile
            demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
            if demo_service_url:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    try:
                        await client.delete(f"{demo_service_url}/profiles/{user_id}")
                        logger.info(f"Deactivated demo profile for user {user_id}")
                    except (httpx.RequestError, httpx.TimeoutException) as e:
                        # Continue even if deactivation fails
                        logger.warning(f"Failed to deactivate demo profile: {e}")
            
            # Step 2: Count demo data before deletion
            interactions_count_stmt = select(func.count(Interaction.id)).where(
                Interaction.user_id == user.id,
                Interaction.is_demo == True
            )
            interactions_count_result = await db.execute(interactions_count_stmt)
            interactions_count = interactions_count_result.scalar() or 0
            
            content_count_stmt = select(func.count(ContentPiece.id)).where(
                ContentPiece.user_id == user.id,
                ContentPiece.is_demo == True
            )
            content_count_result = await db.execute(content_count_stmt)
            content_count = content_count_result.scalar() or 0
            
            logger.info(f"Found {interactions_count} demo interactions and {content_count} demo content pieces to delete")
            
            # Step 3: Bulk delete demo data
            delete_interactions_stmt = delete(Interaction).where(
                Interaction.user_id == user.id,
                Interaction.is_demo == True
            )
            await db.execute(delete_interactions_stmt)
            
            delete_content_stmt = delete(ContentPiece).where(
                ContentPiece.user_id == user.id,
                ContentPiece.is_demo == True
            )
            await db.execute(delete_content_stmt)
            
            logger.info(f"✅ Cleaned up {interactions_count} interactions and {content_count} content pieces")
            
            # Step 4: Update user status to disabled
            user.demo_mode_status = 'disabled'
            user.demo_mode_disabled_at = datetime.utcnow()
            user.demo_mode_error = None
            user.demo_profile_id = None
            
            # Mark job as completed
            job.mark_completed(result_data={
                "interactions_deleted": interactions_count,
                "content_deleted": content_count,
            })
            
            await db.commit()
            
            logger.info(f"✅ Demo mode disabled for user {user_id}")
            
        except Exception as e:
            # Rollback on error
            await db.rollback()
            
            # Update user status to failed
            user = await db.get(User, UUID(user_id))
            if user:
                user.demo_mode_status = 'failed'
                user.demo_mode_error = f"Failed to disable: {str(e)}"
            
            # Mark job as failed
            job = await db.get(BackgroundJob, UUID(job_id))
            if job:
                job.mark_failed(
                    error_message=str(e),
                    error_details={"error_type": type(e).__name__}
                )
            
            await db.commit()
            
            logger.error(f"❌ Failed to disable demo mode for user {user_id}: {e}")
            raise


@celery.task(name="demo.cleanup_stuck_jobs")
def cleanup_stuck_demo_jobs():
    """
    Periodic task to cleanup stuck demo enable/disable jobs.
    
    Runs every 10 minutes via Celery Beat to catch jobs that:
    - Have been pending/running for >5 minutes
    - Never completed due to worker crashes or timeouts
    
    This prevents users from being stuck forever in 'enabling' or 'disabling' states.
    """
    import asyncio
    asyncio.run(_cleanup_stuck_jobs_async())


async def _cleanup_stuck_jobs_async():
    """Async implementation of stuck job cleanup."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select, and_
    
    async with get_async_session_context() as db:
        try:
            stuck_threshold = datetime.now(timezone.utc) - timedelta(minutes=5)
            
            # Find stuck jobs (pending/running for >5 minutes)
            stmt = select(BackgroundJob).where(
                and_(
                    BackgroundJob.job_type.in_(['demo_enable', 'demo_disable']),
                    BackgroundJob.status.in_(['pending', 'running']),
                    BackgroundJob.created_at < stuck_threshold
                )
            )
            
            result = await db.execute(stmt)
            stuck_jobs = result.scalars().all()
            
            if not stuck_jobs:
                logger.debug("No stuck demo jobs found")
                return
            
            logger.warning(f"Found {len(stuck_jobs)} stuck demo jobs, cleaning up...")
            
            for job in stuck_jobs:
                try:
                    # Mark job as failed
                    job.mark_failed(
                        error_message="Job timed out and was auto-cleaned up",
                        error_details={"reason": "auto_cleanup", "stuck_since": job.created_at.isoformat()}
                    )
                    
                    # Get user and reset status
                    user = await db.get(User, job.user_id)
                    if user:
                        if user.demo_mode_status == 'enabling':
                            user.demo_mode_status = 'disabled'
                            user.demo_mode_error = "Setup timed out. Please try again."
                        elif user.demo_mode_status == 'disabling':
                            user.demo_mode_status = 'enabled'
                            user.demo_mode_error = "Cleanup timed out. Please try again."
                        
                        logger.info(f"Reset user {user.id} from stuck '{job.job_type}' state")
                    
                except Exception as e:
                    logger.error(f"Failed to cleanup job {job.id}: {e}")
                    continue
            
            await db.commit()
            logger.info(f"✅ Cleaned up {len(stuck_jobs)} stuck demo jobs")
            
        except Exception as e:
            logger.error(f"Error in cleanup_stuck_demo_jobs: {e}", exc_info=True)
            await db.rollback()
