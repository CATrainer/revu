"""Celery tasks for archive lifecycle management."""
from celery import shared_task
from sqlalchemy import select
from loguru import logger

from app.core.database import get_sync_session
from app.models.user import User
from app.services.archive_service import SyncArchiveService


@shared_task(name="tasks.run_archive_lifecycle")
def run_archive_lifecycle():
    """Run daily archive lifecycle for all users.
    
    This task:
    1. Auto-archives interactions with no activity for X days (per user setting)
    2. Auto-deletes archived interactions older than Y days (per user setting)
    
    Should be scheduled to run daily via Celery Beat.
    """
    logger.info("Starting archive lifecycle task")
    
    total_archived = 0
    total_deleted = 0
    users_processed = 0
    
    with get_sync_session() as session:
        # Get all active users
        result = session.execute(
            select(User).where(User.is_active == True)
        )
        users = result.scalars().all()
        
        for user in users:
            try:
                # Create archive service for this user
                archive_service = SyncArchiveService(session)
                
                # Auto-archive inactive interactions
                archived = archive_service.auto_archive_inactive_sync(user.id)
                total_archived += archived
                
                # Auto-delete old archived interactions
                deleted = archive_service.auto_delete_old_archived_sync(user.id)
                total_deleted += deleted
                
                users_processed += 1
                
            except Exception as e:
                logger.error(f"Error processing archive lifecycle for user {user.id}: {e}")
                continue
        
        session.commit()
    
    logger.info(
        f"Archive lifecycle complete: processed {users_processed} users, "
        f"archived {total_archived} interactions, deleted {total_deleted} interactions"
    )
    
    return {
        'users_processed': users_processed,
        'total_archived': total_archived,
        'total_deleted': total_deleted,
    }


@shared_task(name="tasks.archive_interactions_for_user")
def archive_interactions_for_user(user_id: str):
    """Run archive lifecycle for a specific user.
    
    Args:
        user_id: UUID string of the user
    """
    from uuid import UUID
    
    logger.info(f"Running archive lifecycle for user {user_id}")
    
    with get_sync_session() as session:
        archive_service = SyncArchiveService(session)
        
        uid = UUID(user_id)
        archived = archive_service.auto_archive_inactive_sync(uid)
        deleted = archive_service.auto_delete_old_archived_sync(uid)
        
        session.commit()
    
    logger.info(f"User {user_id}: archived {archived}, deleted {deleted}")
    
    return {
        'user_id': user_id,
        'archived': archived,
        'deleted': deleted,
    }
