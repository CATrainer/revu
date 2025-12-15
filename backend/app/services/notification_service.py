"""
Notification Service

Handles creation, delivery, and management of notifications for both
creators and agency users.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID

from sqlalchemy import select, and_, or_, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import (
    CreatorNotification,
    NotificationDeliveryLog,
    CREATOR_NOTIFICATION_TYPES,
    AGENCY_NOTIFICATION_TYPES,
)
from app.models.creator_tools import NotificationPreference
from app.models.agency_notification import AgencyNotification
from app.models.user import User

logger = logging.getLogger(__name__)

# Notification retention period
NOTIFICATION_RETENTION_DAYS = 90


class NotificationService:
    """Service for managing notifications."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # =========================================================================
    # Creator Notifications
    # =========================================================================

    async def create_creator_notification(
        self,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        priority: str = "normal",
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        data: Optional[Dict[str, Any]] = None,
        dedup_key: Optional[str] = None,
        dedup_hours: int = 24,
        send_email: bool = True,
    ) -> Optional[CreatorNotification]:
        """
        Create a notification for a creator.
        
        Args:
            user_id: The user to notify
            notification_type: Type identifier (e.g., "engagement_spike")
            title: Notification title
            message: Optional detailed message
            priority: low, normal, high, urgent
            action_url: URL to navigate to when clicked
            action_label: Button text
            entity_type: Related entity type (for linking)
            entity_id: Related entity ID
            data: Additional JSON data
            dedup_key: Custom deduplication key
            dedup_hours: Hours to check for duplicates (0 to disable)
            send_email: Whether to send email notification
        
        Returns:
            Created notification or None if deduplicated/preferences disabled
        """
        # Check user preferences
        prefs = await self.get_or_create_preferences(user_id)
        
        if not prefs.is_type_enabled(notification_type, 'in_app'):
            logger.debug(f"Notification {notification_type} disabled for user {user_id}")
            return None
        
        # Check entity muting
        if entity_type and entity_id and prefs.is_entity_muted(entity_type, str(entity_id)):
            logger.debug(f"Entity {entity_type}:{entity_id} muted for user {user_id}")
            return None
        
        # Check deduplication
        if dedup_hours > 0:
            is_duplicate = await self._check_duplicate(
                user_id, notification_type, entity_type, entity_id, dedup_key, dedup_hours
            )
            if is_duplicate:
                logger.debug(f"Duplicate notification {notification_type} for user {user_id}")
                return None
        
        # Create notification
        notification = CreatorNotification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            priority=priority,
            action_url=action_url,
            action_label=action_label,
            entity_type=entity_type,
            entity_id=entity_id,
            data=data or {},
            expires_at=datetime.utcnow() + timedelta(days=NOTIFICATION_RETENTION_DAYS),
        )
        
        self.session.add(notification)
        
        # Log delivery for deduplication
        delivery_log = NotificationDeliveryLog(
            user_id=user_id,
            notification_type=notification_type,
            entity_type=entity_type,
            entity_id=entity_id,
            dedup_key=dedup_key,
            channel='in_app',
        )
        self.session.add(delivery_log)
        
        await self.session.commit()
        await self.session.refresh(notification)
        
        logger.info(f"Created notification {notification.id} type={notification_type} for user {user_id}")
        
        # Handle email notification
        if send_email and prefs.is_type_enabled(notification_type, 'email'):
            if prefs.email_frequency == 'instant':
                await self._send_instant_email(notification, prefs)
            # For daily_digest, the notification will be picked up by the digest job
        
        return notification

    async def get_creator_notifications(
        self,
        user_id: UUID,
        unread_only: bool = False,
        notification_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[CreatorNotification]:
        """Get notifications for a creator."""
        query = select(CreatorNotification).where(
            CreatorNotification.user_id == user_id,
            CreatorNotification.is_dismissed == False,
            or_(
                CreatorNotification.expires_at.is_(None),
                CreatorNotification.expires_at > datetime.utcnow()
            )
        )
        
        if unread_only:
            query = query.where(CreatorNotification.is_read == False)
        
        if notification_type:
            query = query.where(CreatorNotification.type == notification_type)
        
        query = query.order_by(CreatorNotification.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_creator_unread_count(self, user_id: UUID) -> int:
        """Get count of unread notifications for a creator."""
        query = select(func.count()).select_from(CreatorNotification).where(
            CreatorNotification.user_id == user_id,
            CreatorNotification.is_read == False,
            CreatorNotification.is_dismissed == False,
            or_(
                CreatorNotification.expires_at.is_(None),
                CreatorNotification.expires_at > datetime.utcnow()
            )
        )
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def mark_creator_notification_read(
        self, notification_id: UUID, user_id: UUID
    ) -> Optional[CreatorNotification]:
        """Mark a notification as read."""
        query = select(CreatorNotification).where(
            CreatorNotification.id == notification_id,
            CreatorNotification.user_id == user_id,
        )
        result = await self.session.execute(query)
        notification = result.scalar_one_or_none()
        
        if notification:
            notification.mark_read()
            await self.session.commit()
        
        return notification

    async def mark_all_creator_notifications_read(self, user_id: UUID) -> int:
        """Mark all notifications as read for a user. Returns count updated."""
        from sqlalchemy import update
        
        stmt = (
            update(CreatorNotification)
            .where(
                CreatorNotification.user_id == user_id,
                CreatorNotification.is_read == False,
            )
            .values(is_read=True, read_at=datetime.utcnow())
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount

    async def dismiss_creator_notification(
        self, notification_id: UUID, user_id: UUID
    ) -> Optional[CreatorNotification]:
        """Dismiss a notification."""
        query = select(CreatorNotification).where(
            CreatorNotification.id == notification_id,
            CreatorNotification.user_id == user_id,
        )
        result = await self.session.execute(query)
        notification = result.scalar_one_or_none()
        
        if notification:
            notification.dismiss()
            await self.session.commit()
        
        return notification

    # =========================================================================
    # Agency Notifications
    # =========================================================================

    async def create_agency_notification(
        self,
        agency_id: UUID,
        user_id: UUID,
        notification_type: str,
        title: str,
        description: Optional[str] = None,
        priority: str = "normal",
        link_url: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
        dedup_key: Optional[str] = None,
        dedup_hours: int = 24,
        send_email: bool = True,
    ) -> Optional[AgencyNotification]:
        """Create a notification for an agency team member."""
        # Check user preferences
        prefs = await self.get_or_create_preferences(user_id)
        
        if not prefs.is_type_enabled(notification_type, 'in_app'):
            return None
        
        # Check entity muting
        if entity_type and entity_id and prefs.is_entity_muted(entity_type, str(entity_id)):
            return None
        
        # Check deduplication
        if dedup_hours > 0:
            is_duplicate = await self._check_duplicate(
                user_id, notification_type, entity_type, entity_id, dedup_key, dedup_hours
            )
            if is_duplicate:
                return None
        
        # Map icon based on type
        type_config = AGENCY_NOTIFICATION_TYPES.get(notification_type, {})
        icon = type_config.get('icon', 'bell')
        
        notification = AgencyNotification(
            agency_id=agency_id,
            user_id=user_id,
            type=notification_type,
            title=title,
            description=description,
            priority=priority,
            link_url=link_url,
            entity_type=entity_type,
            entity_id=entity_id,
            icon=icon,
            notification_metadata=metadata or {},
        )
        
        self.session.add(notification)
        
        # Log delivery
        delivery_log = NotificationDeliveryLog(
            user_id=user_id,
            notification_type=notification_type,
            entity_type=entity_type,
            entity_id=entity_id,
            dedup_key=dedup_key,
            channel='in_app',
        )
        self.session.add(delivery_log)
        
        await self.session.commit()
        await self.session.refresh(notification)
        
        logger.info(f"Created agency notification {notification.id} type={notification_type}")
        
        # Handle email
        if send_email and prefs.is_type_enabled(notification_type, 'email'):
            if prefs.email_frequency == 'instant':
                await self._send_agency_instant_email(notification, prefs)
        
        return notification

    async def get_agency_notifications(
        self,
        user_id: UUID,
        agency_id: UUID,
        unread_only: bool = False,
        notification_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AgencyNotification]:
        """Get notifications for an agency user."""
        query = select(AgencyNotification).where(
            AgencyNotification.user_id == user_id,
            AgencyNotification.agency_id == agency_id,
        )
        
        if unread_only:
            query = query.where(AgencyNotification.is_read == False)
        
        if notification_type:
            query = query.where(AgencyNotification.type == notification_type)
        
        query = query.order_by(AgencyNotification.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_agency_unread_count(self, user_id: UUID, agency_id: UUID) -> int:
        """Get count of unread agency notifications."""
        query = select(func.count()).select_from(AgencyNotification).where(
            AgencyNotification.user_id == user_id,
            AgencyNotification.agency_id == agency_id,
            AgencyNotification.is_read == False,
        )
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def mark_agency_notification_read(
        self, notification_id: UUID, user_id: UUID
    ) -> Optional[AgencyNotification]:
        """Mark an agency notification as read."""
        query = select(AgencyNotification).where(
            AgencyNotification.id == notification_id,
            AgencyNotification.user_id == user_id,
        )
        result = await self.session.execute(query)
        notification = result.scalar_one_or_none()
        
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            await self.session.commit()
        
        return notification

    async def mark_all_agency_notifications_read(
        self, user_id: UUID, agency_id: UUID
    ) -> int:
        """Mark all agency notifications as read."""
        from sqlalchemy import update
        
        stmt = (
            update(AgencyNotification)
            .where(
                AgencyNotification.user_id == user_id,
                AgencyNotification.agency_id == agency_id,
                AgencyNotification.is_read == False,
            )
            .values(is_read=True, read_at=datetime.utcnow())
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount

    # =========================================================================
    # Preferences
    # =========================================================================

    async def get_or_create_preferences(self, user_id: UUID) -> NotificationPreference:
        """Get or create notification preferences for a user."""
        query = select(NotificationPreference).where(
            NotificationPreference.user_id == user_id
        )
        result = await self.session.execute(query)
        prefs = result.scalar_one_or_none()
        
        if not prefs:
            prefs = NotificationPreference(user_id=user_id)
            self.session.add(prefs)
            await self.session.commit()
            await self.session.refresh(prefs)
        
        return prefs

    async def update_preferences(
        self,
        user_id: UUID,
        in_app_enabled: Optional[bool] = None,
        email_enabled: Optional[bool] = None,
        email_frequency: Optional[str] = None,
        digest_hour: Optional[int] = None,
        type_settings: Optional[Dict[str, Dict[str, bool]]] = None,
    ) -> NotificationPreference:
        """Update notification preferences."""
        prefs = await self.get_or_create_preferences(user_id)
        
        if in_app_enabled is not None:
            prefs.in_app_enabled = in_app_enabled
        if email_enabled is not None:
            prefs.email_enabled = email_enabled
        if email_frequency is not None:
            prefs.email_frequency = email_frequency
        if digest_hour is not None:
            prefs.digest_hour = digest_hour
        if type_settings is not None:
            prefs.type_settings = type_settings
        
        await self.session.commit()
        await self.session.refresh(prefs)
        
        return prefs

    async def mute_entity(
        self, user_id: UUID, entity_type: str, entity_id: str
    ) -> NotificationPreference:
        """Mute notifications for a specific entity."""
        prefs = await self.get_or_create_preferences(user_id)
        
        muted = list(prefs.muted_entities or [])
        if not any(m.get('type') == entity_type and m.get('id') == entity_id for m in muted):
            muted.append({'type': entity_type, 'id': entity_id})
            prefs.muted_entities = muted
            await self.session.commit()
        
        return prefs

    async def unmute_entity(
        self, user_id: UUID, entity_type: str, entity_id: str
    ) -> NotificationPreference:
        """Unmute notifications for a specific entity."""
        prefs = await self.get_or_create_preferences(user_id)
        
        muted = [
            m for m in (prefs.muted_entities or [])
            if not (m.get('type') == entity_type and m.get('id') == entity_id)
        ]
        prefs.muted_entities = muted
        await self.session.commit()
        
        return prefs

    # =========================================================================
    # Helpers
    # =========================================================================

    async def _check_duplicate(
        self,
        user_id: UUID,
        notification_type: str,
        entity_type: Optional[str],
        entity_id: Optional[UUID],
        dedup_key: Optional[str],
        hours: int,
    ) -> bool:
        """Check if a similar notification was recently sent."""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        query = select(NotificationDeliveryLog).where(
            NotificationDeliveryLog.user_id == user_id,
            NotificationDeliveryLog.notification_type == notification_type,
            NotificationDeliveryLog.delivered_at > cutoff,
        )
        
        if entity_type:
            query = query.where(NotificationDeliveryLog.entity_type == entity_type)
        if entity_id:
            query = query.where(NotificationDeliveryLog.entity_id == entity_id)
        if dedup_key:
            query = query.where(NotificationDeliveryLog.dedup_key == dedup_key)
        
        result = await self.session.execute(query)
        return result.scalar_one_or_none() is not None

    async def _send_instant_email(
        self, notification: CreatorNotification, prefs: NotificationPreference
    ) -> bool:
        """Send instant email notification."""
        from app.tasks.email import send_email
        from app.services.notification_email_service import render_creator_notification_email
        
        try:
            # Get user email
            user_query = select(User).where(User.id == notification.user_id)
            result = await self.session.execute(user_query)
            user = result.scalar_one_or_none()
            
            if not user or not user.email:
                return False
            
            # Render email
            subject, html = render_creator_notification_email(notification, user)
            
            # Send via Celery task
            send_email.delay(user.email, subject, html)
            
            # Update notification
            notification.email_sent = True
            notification.email_sent_at = datetime.utcnow()
            await self.session.commit()
            
            return True
        except Exception as e:
            logger.error(f"Failed to send instant email for notification {notification.id}: {e}")
            return False

    async def _send_agency_instant_email(
        self, notification: AgencyNotification, prefs: NotificationPreference
    ) -> bool:
        """Send instant email for agency notification."""
        from app.tasks.email import send_email
        from app.services.notification_email_service import render_agency_notification_email
        
        try:
            user_query = select(User).where(User.id == notification.user_id)
            result = await self.session.execute(user_query)
            user = result.scalar_one_or_none()
            
            if not user or not user.email:
                return False
            
            subject, html = render_agency_notification_email(notification, user)
            send_email.delay(user.email, subject, html)
            
            return True
        except Exception as e:
            logger.error(f"Failed to send agency email for notification {notification.id}: {e}")
            return False

    # =========================================================================
    # Cleanup
    # =========================================================================

    async def cleanup_old_notifications(self) -> Dict[str, int]:
        """Delete notifications older than retention period."""
        cutoff = datetime.utcnow() - timedelta(days=NOTIFICATION_RETENTION_DAYS)
        
        # Delete old creator notifications
        creator_stmt = delete(CreatorNotification).where(
            CreatorNotification.created_at < cutoff
        )
        creator_result = await self.session.execute(creator_stmt)
        
        # Delete old delivery logs
        log_stmt = delete(NotificationDeliveryLog).where(
            NotificationDeliveryLog.delivered_at < cutoff
        )
        log_result = await self.session.execute(log_stmt)
        
        await self.session.commit()
        
        return {
            "creator_notifications_deleted": creator_result.rowcount,
            "delivery_logs_deleted": log_result.rowcount,
        }


# =============================================================================
# Helper function to get service instance
# =============================================================================

def get_notification_service(session: AsyncSession) -> NotificationService:
    """Get a notification service instance."""
    return NotificationService(session)
