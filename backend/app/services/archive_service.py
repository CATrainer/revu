"""Archive service for managing interaction lifecycle."""
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.interaction import Interaction
from app.models.user import User


class ArchiveService:
    """Service for managing interaction archive lifecycle.
    
    Handles:
    - Auto-archive: Interactions with no activity for X days
    - Auto-delete: Archived interactions older than Y days
    - Manual archive/unarchive
    - Auto-unarchive on new activity
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def auto_archive_inactive(self, user_id: UUID) -> int:
        """Archive interactions with no activity for X days.
        
        Args:
            user_id: The user whose interactions to process
            
        Returns:
            Number of interactions archived
        """
        # Get user's archive settings
        user = await self.session.get(User, user_id)
        if not user:
            logger.warning(f"User {user_id} not found for auto-archive")
            return 0
        
        inactive_days = getattr(user, 'archive_inactive_days', 7) or 7
        threshold = datetime.utcnow() - timedelta(days=inactive_days)
        
        # Find and archive inactive interactions
        result = await self.session.execute(
            update(Interaction)
            .where(
                and_(
                    Interaction.user_id == user_id,
                    Interaction.archived_at.is_(None),
                    Interaction.last_activity_at < threshold,
                    Interaction.status.notin_(['awaiting_approval'])  # Don't auto-archive pending approvals
                )
            )
            .values(
                archived_at=datetime.utcnow(),
                archive_source='auto'
            )
        )
        
        archived_count = result.rowcount
        if archived_count > 0:
            logger.info(f"Auto-archived {archived_count} interactions for user {user_id}")
        
        return archived_count
    
    async def auto_delete_old_archived(self, user_id: UUID) -> int:
        """Delete archived interactions older than Y days.
        
        Args:
            user_id: The user whose archived interactions to process
            
        Returns:
            Number of interactions deleted
        """
        # Get user's archive settings
        user = await self.session.get(User, user_id)
        if not user:
            logger.warning(f"User {user_id} not found for auto-delete")
            return 0
        
        delete_days = getattr(user, 'archive_delete_days', 30) or 30
        threshold = datetime.utcnow() - timedelta(days=delete_days)
        
        # Delete old archived interactions
        result = await self.session.execute(
            delete(Interaction)
            .where(
                and_(
                    Interaction.user_id == user_id,
                    Interaction.archived_at.isnot(None),
                    Interaction.archived_at < threshold
                )
            )
        )
        
        deleted_count = result.rowcount
        if deleted_count > 0:
            logger.info(f"Auto-deleted {deleted_count} archived interactions for user {user_id}")
        
        return deleted_count
    
    async def manual_archive(
        self,
        interaction_ids: List[UUID],
        user_id: UUID
    ) -> int:
        """Manually archive interactions.
        
        Args:
            interaction_ids: List of interaction IDs to archive
            user_id: The user performing the action (for authorization)
            
        Returns:
            Number of interactions archived
        """
        result = await self.session.execute(
            update(Interaction)
            .where(
                and_(
                    Interaction.id.in_(interaction_ids),
                    Interaction.user_id == user_id,
                    Interaction.archived_at.is_(None)
                )
            )
            .values(
                archived_at=datetime.utcnow(),
                archive_source='manual'
            )
        )
        
        archived_count = result.rowcount
        logger.info(f"Manually archived {archived_count} interactions for user {user_id}")
        
        return archived_count
    
    async def unarchive(
        self,
        interaction_ids: List[UUID],
        user_id: UUID
    ) -> int:
        """Restore archived interactions.
        
        Args:
            interaction_ids: List of interaction IDs to unarchive
            user_id: The user performing the action (for authorization)
            
        Returns:
            Number of interactions unarchived
        """
        result = await self.session.execute(
            update(Interaction)
            .where(
                and_(
                    Interaction.id.in_(interaction_ids),
                    Interaction.user_id == user_id,
                    Interaction.archived_at.isnot(None)
                )
            )
            .values(
                archived_at=None,
                archive_source=None,
                last_activity_at=datetime.utcnow()
            )
        )
        
        unarchived_count = result.rowcount
        logger.info(f"Unarchived {unarchived_count} interactions for user {user_id}")
        
        return unarchived_count
    
    async def permanent_delete(
        self,
        interaction_ids: List[UUID],
        user_id: UUID
    ) -> int:
        """Permanently delete archived interactions.
        
        Args:
            interaction_ids: List of interaction IDs to delete
            user_id: The user performing the action (for authorization)
            
        Returns:
            Number of interactions deleted
        """
        # Only allow deleting archived interactions
        result = await self.session.execute(
            delete(Interaction)
            .where(
                and_(
                    Interaction.id.in_(interaction_ids),
                    Interaction.user_id == user_id,
                    Interaction.archived_at.isnot(None)  # Must be archived first
                )
            )
        )
        
        deleted_count = result.rowcount
        logger.info(f"Permanently deleted {deleted_count} interactions for user {user_id}")
        
        return deleted_count
    
    async def auto_unarchive_on_activity(self, interaction_id: UUID) -> bool:
        """Automatically unarchive if new activity detected.
        
        Called when a new message arrives in a DM conversation or
        a reply is received on a comment.
        
        Args:
            interaction_id: The interaction that received new activity
            
        Returns:
            True if interaction was unarchived, False otherwise
        """
        interaction = await self.session.get(Interaction, interaction_id)
        
        if not interaction:
            return False
        
        if interaction.archived_at:
            interaction.archived_at = None
            interaction.archive_source = None
            interaction.last_activity_at = datetime.utcnow()
            logger.info(f"Auto-unarchived interaction {interaction_id} due to new activity")
            return True
        
        # Just update last_activity_at if not archived
        interaction.last_activity_at = datetime.utcnow()
        return False
    
    async def archive_by_workflow(
        self,
        interaction_id: UUID,
        workflow_id: UUID
    ) -> bool:
        """Archive an interaction via workflow action.
        
        Args:
            interaction_id: The interaction to archive
            workflow_id: The workflow that triggered the archive
            
        Returns:
            True if archived, False otherwise
        """
        result = await self.session.execute(
            update(Interaction)
            .where(
                and_(
                    Interaction.id == interaction_id,
                    Interaction.archived_at.is_(None)
                )
            )
            .values(
                archived_at=datetime.utcnow(),
                archive_source='workflow',
                processed_by_workflow_id=workflow_id,
                processed_at=datetime.utcnow()
            )
        )
        
        return result.rowcount > 0
    
    async def get_archive_stats(self, user_id: UUID) -> dict:
        """Get archive statistics for a user.
        
        Args:
            user_id: The user to get stats for
            
        Returns:
            Dictionary with archive statistics
        """
        # Count archived interactions
        archived_result = await self.session.execute(
            select(Interaction)
            .where(
                and_(
                    Interaction.user_id == user_id,
                    Interaction.archived_at.isnot(None)
                )
            )
        )
        archived_count = len(archived_result.scalars().all())
        
        # Count by archive source
        auto_archived = await self.session.execute(
            select(Interaction)
            .where(
                and_(
                    Interaction.user_id == user_id,
                    Interaction.archive_source == 'auto'
                )
            )
        )
        auto_count = len(auto_archived.scalars().all())
        
        manual_archived = await self.session.execute(
            select(Interaction)
            .where(
                and_(
                    Interaction.user_id == user_id,
                    Interaction.archive_source == 'manual'
                )
            )
        )
        manual_count = len(manual_archived.scalars().all())
        
        workflow_archived = await self.session.execute(
            select(Interaction)
            .where(
                and_(
                    Interaction.user_id == user_id,
                    Interaction.archive_source == 'workflow'
                )
            )
        )
        workflow_count = len(workflow_archived.scalars().all())
        
        return {
            'total_archived': archived_count,
            'auto_archived': auto_count,
            'manual_archived': manual_count,
            'workflow_archived': workflow_count,
        }


def get_archive_service(session: AsyncSession) -> ArchiveService:
    """Factory function to get an ArchiveService instance."""
    return ArchiveService(session)


class SyncArchiveService:
    """Synchronous version of ArchiveService for Celery tasks."""
    
    def __init__(self, session):
        self.session = session
    
    def auto_archive_inactive_sync(self, user_id: UUID) -> int:
        """Synchronous version of auto_archive_inactive."""
        from sqlalchemy import update as sql_update
        
        user = self.session.get(User, user_id)
        if not user:
            return 0
        
        inactive_days = getattr(user, 'archive_inactive_days', 7) or 7
        threshold = datetime.utcnow() - timedelta(days=inactive_days)
        
        result = self.session.execute(
            sql_update(Interaction)
            .where(
                and_(
                    Interaction.user_id == user_id,
                    Interaction.archived_at.is_(None),
                    Interaction.last_activity_at < threshold,
                    Interaction.status.notin_(['awaiting_approval'])
                )
            )
            .values(
                archived_at=datetime.utcnow(),
                archive_source='auto'
            )
        )
        
        return result.rowcount
    
    def auto_delete_old_archived_sync(self, user_id: UUID) -> int:
        """Synchronous version of auto_delete_old_archived."""
        user = self.session.get(User, user_id)
        if not user:
            return 0
        
        delete_days = getattr(user, 'archive_delete_days', 30) or 30
        threshold = datetime.utcnow() - timedelta(days=delete_days)
        
        result = self.session.execute(
            delete(Interaction)
            .where(
                and_(
                    Interaction.user_id == user_id,
                    Interaction.archived_at.isnot(None),
                    Interaction.archived_at < threshold
                )
            )
        )
        
        return result.rowcount
