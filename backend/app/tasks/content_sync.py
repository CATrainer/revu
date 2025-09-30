"""Celery tasks for automated content sync"""
from __future__ import annotations

from uuid import UUID
from sqlalchemy import text
from loguru import logger

from app.core.celery_app import celery
from app.core.database import get_db_context
from app.services.youtube_performance_sync import sync_youtube_to_performance


@celery.task(name="sync_all_youtube_content")
def sync_all_youtube_content():
    """
    Daily task to sync YouTube content for all active users.
    
    Schedule this to run once per day via Celery Beat.
    """
    logger.info("Starting daily YouTube content sync for all users")
    
    with get_db_context() as db:
        # Get all users with active YouTube connections
        result = db.execute(
            text("""
                SELECT DISTINCT yc.user_id, u.email
                FROM youtube_connections yc
                JOIN users u ON yc.user_id = u.id
                WHERE yc.access_token IS NOT NULL
                AND u.is_active = true
            """)
        )
        
        users = result.fetchall()
        total_users = len(users)
        success_count = 0
        error_count = 0
        
        logger.info(f"Found {total_users} users with YouTube connections")
        
        for user in users:
            try:
                user_id = UUID(str(user.user_id))
                logger.info(f"Syncing YouTube content for user {user.email}")
                
                # Sync last 90 days
                result = sync_youtube_to_performance(user_id, db, days_back=90)
                
                if result["success"]:
                    success_count += 1
                    logger.info(
                        f"Successfully synced {result['videos_synced']} videos "
                        f"for user {user.email}"
                    )
                else:
                    error_count += 1
                    logger.warning(
                        f"Failed to sync YouTube content for user {user.email}: "
                        f"{result.get('error', 'Unknown error')}"
                    )
                    
            except Exception as e:
                error_count += 1
                logger.error(f"Error syncing user {user.email}: {e}")
        
        logger.info(
            f"Daily YouTube sync complete. "
            f"Success: {success_count}, Errors: {error_count}, Total: {total_users}"
        )
        
        return {
            "total_users": total_users,
            "success_count": success_count,
            "error_count": error_count
        }


@celery.task(name="sync_user_youtube_content")
def sync_user_youtube_content(user_id: str):
    """
    Sync YouTube content for a specific user.
    
    Args:
        user_id: UUID string of the user
    """
    logger.info(f"Syncing YouTube content for user {user_id}")
    
    with get_db_context() as db:
        try:
            user_uuid = UUID(user_id)
            result = sync_youtube_to_performance(user_uuid, db, days_back=90)
            
            if result["success"]:
                logger.info(
                    f"Successfully synced {result['videos_synced']} videos "
                    f"for user {user_id}"
                )
            else:
                logger.warning(
                    f"Failed to sync YouTube content for user {user_id}: "
                    f"{result.get('error', 'Unknown error')}"
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error syncing user {user_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "videos_synced": 0
            }


@celery.task(name="sync_new_youtube_videos")
def sync_new_youtube_videos():
    """
    Quick sync to check for new videos (runs more frequently).
    
    Only syncs last 7 days to be faster.
    Schedule this to run every 6 hours.
    """
    logger.info("Starting quick YouTube sync for new videos")
    
    with get_db_context() as db:
        result = db.execute(
            text("""
                SELECT DISTINCT yc.user_id
                FROM youtube_connections yc
                JOIN users u ON yc.user_id = u.id
                WHERE yc.access_token IS NOT NULL
                AND u.is_active = true
            """)
        )
        
        users = result.fetchall()
        synced_count = 0
        
        for user in users:
            try:
                user_id = UUID(str(user.user_id))
                # Only sync last 7 days for quick updates
                result = sync_youtube_to_performance(user_id, db, days_back=7)
                
                if result["success"] and result["videos_synced"] > 0:
                    synced_count += 1
                    logger.info(
                        f"Found {result['videos_synced']} new videos for user {user_id}"
                    )
                    
            except Exception as e:
                logger.error(f"Error in quick sync for user {user.user_id}: {e}")
        
        logger.info(f"Quick sync complete. Updated {synced_count} users")
        
        return {"users_updated": synced_count}
