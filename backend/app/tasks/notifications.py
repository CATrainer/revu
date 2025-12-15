"""
Notification Tasks

Celery tasks for detecting notification-worthy events and sending notifications.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

from celery import shared_task
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery import celery_app
from app.core.database import async_session_maker
from app.models.user import User
from app.models.notification import (
    CreatorNotification,
    NotificationDeliveryLog,
)
from app.models.creator_tools import NotificationPreference
from app.models.agency_notification import AgencyNotification
from app.models.content import ContentPiece, ContentPerformance
from app.models.fan import Fan
from app.models.interaction import Interaction
from app.models.agency_campaign import AgencyCampaign, CampaignDeliverable, AgencyDeal
from app.models.agency_notification import AgencyTask
from app.services.notification_service import NotificationService
from app.services.notification_email_service import render_daily_digest_email
from app.tasks.email import send_email

logger = logging.getLogger(__name__)


# =============================================================================
# Creator Notification Detection Tasks
# =============================================================================

@celery_app.task(name="notifications.check_engagement_spikes")
def check_engagement_spikes() -> Dict[str, Any]:
    """
    Check for engagement spikes on creator content.
    
    Trigger: Content receives 2x+ average engagement within 24h of posting.
    """
    return asyncio.run(_check_engagement_spikes_async())


async def _check_engagement_spikes_async() -> Dict[str, Any]:
    """Async implementation of engagement spike detection."""
    notifications_created = 0
    users_checked = 0
    
    async with async_session_maker() as session:
        service = NotificationService(session)
        
        # Get all active creators with connected platforms
        users_query = select(User).where(
            User.is_active == True,
            User.account_type == 'creator',
        )
        result = await session.execute(users_query)
        users = list(result.scalars().all())
        
        for user in users:
            users_checked += 1
            try:
                # Get content posted in last 24 hours
                cutoff = datetime.utcnow() - timedelta(hours=24)
                content_query = select(ContentPiece).where(
                    ContentPiece.user_id == user.id,
                    ContentPiece.published_at >= cutoff,
                )
                content_result = await session.execute(content_query)
                recent_content = list(content_result.scalars().all())
                
                if not recent_content:
                    continue
                
                # Calculate 30-day average engagement
                avg_query = select(
                    func.avg(ContentPerformance.likes + ContentPerformance.comments_count)
                ).join(ContentPiece).where(
                    ContentPiece.user_id == user.id,
                    ContentPerformance.recorded_at >= datetime.utcnow() - timedelta(days=30),
                )
                avg_result = await session.execute(avg_query)
                avg_engagement = avg_result.scalar() or 0
                
                if avg_engagement == 0:
                    continue
                
                # Check each recent content for spikes
                for content in recent_content:
                    # Get latest performance
                    perf_query = select(ContentPerformance).where(
                        ContentPerformance.content_id == content.id
                    ).order_by(ContentPerformance.recorded_at.desc()).limit(1)
                    perf_result = await session.execute(perf_query)
                    perf = perf_result.scalar_one_or_none()
                    
                    if not perf:
                        continue
                    
                    current_engagement = (perf.likes or 0) + (perf.comments_count or 0)
                    
                    # Check if 2x+ average
                    if current_engagement >= avg_engagement * 2:
                        notification = await service.create_creator_notification(
                            user_id=user.id,
                            notification_type="engagement_spike",
                            title="Engagement Spike Detected!",
                            message=f"Your content is getting {current_engagement / avg_engagement:.1f}x more engagement than average!",
                            priority="high",
                            action_url=f"/analytics?content={content.id}",
                            action_label="View Analytics",
                            entity_type="content",
                            entity_id=content.id,
                            data={
                                "content_title": content.title,
                                "current_engagement": current_engagement,
                                "average_engagement": avg_engagement,
                                "multiplier": current_engagement / avg_engagement,
                            },
                            dedup_hours=24,
                        )
                        if notification:
                            notifications_created += 1
                            
            except Exception as e:
                logger.error(f"Error checking engagement for user {user.id}: {e}")
    
    return {
        "users_checked": users_checked,
        "notifications_created": notifications_created,
    }


@celery_app.task(name="notifications.check_content_milestones")
def check_content_milestones() -> Dict[str, Any]:
    """
    Check for content view milestones (1K, 10K, 100K, 1M, 10M).
    """
    return asyncio.run(_check_content_milestones_async())


async def _check_content_milestones_async() -> Dict[str, Any]:
    """Async implementation of milestone detection."""
    milestones = [1000, 10000, 100000, 1000000, 10000000]
    milestone_names = {
        1000: "1K",
        10000: "10K",
        100000: "100K",
        1000000: "1M",
        10000000: "10M",
    }
    notifications_created = 0
    
    async with async_session_maker() as session:
        service = NotificationService(session)
        
        # Get all content with performance data
        query = select(ContentPiece, ContentPerformance).join(
            ContentPerformance, ContentPiece.id == ContentPerformance.content_id
        ).where(
            ContentPiece.is_demo == False,
        )
        result = await session.execute(query)
        
        for content, perf in result.all():
            views = perf.views or 0
            reached = content.milestones_reached or []
            
            for milestone in milestones:
                milestone_key = milestone_names[milestone]
                
                if views >= milestone and milestone_key not in reached:
                    # Create notification
                    notification = await service.create_creator_notification(
                        user_id=content.user_id,
                        notification_type="content_milestone",
                        title=f"🎉 {milestone_key} Views!",
                        message=f'Your content "{content.title[:50]}..." has reached {milestone_key} views!',
                        priority="normal",
                        action_url=content.url or f"/analytics?content={content.id}",
                        action_label="View Content",
                        entity_type="content",
                        entity_id=content.id,
                        data={
                            "milestone": milestone_key,
                            "views": views,
                            "content_title": content.title,
                        },
                        dedup_key=f"milestone_{milestone_key}",
                        dedup_hours=0,  # Never duplicate same milestone
                    )
                    
                    if notification:
                        # Update milestones_reached
                        reached.append(milestone_key)
                        content.milestones_reached = reached
                        notifications_created += 1
        
        await session.commit()
    
    return {"notifications_created": notifications_created}


@celery_app.task(name="notifications.check_superfans")
def check_superfans() -> Dict[str, Any]:
    """
    Check for new superfans (top 5% engagers).
    """
    return asyncio.run(_check_superfans_async())


async def _check_superfans_async() -> Dict[str, Any]:
    """Async implementation of superfan detection."""
    notifications_created = 0
    fans_promoted = 0
    
    async with async_session_maker() as session:
        service = NotificationService(session)
        
        # Get all users with fans
        users_query = select(User.id).where(
            User.is_active == True,
            User.account_type == 'creator',
        )
        result = await session.execute(users_query)
        user_ids = [r[0] for r in result.all()]
        
        for user_id in user_ids:
            try:
                # Get all fans for this user
                fans_query = select(Fan).where(
                    Fan.user_id == user_id,
                    Fan.is_demo == False,
                )
                fans_result = await session.execute(fans_query)
                fans = list(fans_result.scalars().all())
                
                if len(fans) < 20:  # Need minimum fans for meaningful threshold
                    continue
                
                # Calculate 95th percentile engagement score
                scores = sorted([f.engagement_score or 0 for f in fans], reverse=True)
                threshold_idx = max(1, len(scores) // 20)  # Top 5%
                threshold = scores[threshold_idx - 1]
                
                # Find fans that should be promoted to superfan
                for fan in fans:
                    if (fan.engagement_score or 0) >= threshold and not fan.is_superfan:
                        # Promote to superfan
                        fan.is_superfan = True
                        fan.became_superfan_at = datetime.utcnow()
                        fans_promoted += 1
                        
                        # Create notification
                        notification = await service.create_creator_notification(
                            user_id=user_id,
                            notification_type="new_superfan",
                            title="New Superfan Detected!",
                            message=f"@{fan.username} is now one of your top fans!",
                            priority="normal",
                            action_url=f"/fans/{fan.id}",
                            action_label="View Profile",
                            entity_type="fan",
                            entity_id=fan.id,
                            data={
                                "fan_username": fan.username,
                                "fan_name": fan.name,
                                "engagement_score": fan.engagement_score,
                            },
                            dedup_hours=0,  # One-time notification
                        )
                        if notification:
                            notifications_created += 1
                
                await session.commit()
                
            except Exception as e:
                logger.error(f"Error checking superfans for user {user_id}: {e}")
    
    return {
        "fans_promoted": fans_promoted,
        "notifications_created": notifications_created,
    }


@celery_app.task(name="notifications.check_negative_sentiment")
def check_negative_sentiment() -> Dict[str, Any]:
    """
    Check for negative sentiment spikes (>20% negative in last 24h).
    """
    return asyncio.run(_check_negative_sentiment_async())


async def _check_negative_sentiment_async() -> Dict[str, Any]:
    """Async implementation of sentiment spike detection."""
    notifications_created = 0
    
    async with async_session_maker() as session:
        service = NotificationService(session)
        cutoff = datetime.utcnow() - timedelta(hours=24)
        
        # Get users with recent interactions
        users_query = select(User.id).where(
            User.is_active == True,
            User.account_type == 'creator',
        )
        result = await session.execute(users_query)
        user_ids = [r[0] for r in result.all()]
        
        for user_id in user_ids:
            try:
                # Count total interactions in last 24h
                total_query = select(func.count()).select_from(Interaction).where(
                    Interaction.user_id == user_id,
                    Interaction.created_at >= cutoff,
                    Interaction.is_demo == False,
                )
                total_result = await session.execute(total_query)
                total = total_result.scalar() or 0
                
                if total < 10:  # Minimum threshold
                    continue
                
                # Count negative sentiment interactions
                negative_query = select(func.count()).select_from(Interaction).where(
                    Interaction.user_id == user_id,
                    Interaction.created_at >= cutoff,
                    Interaction.is_demo == False,
                    Interaction.sentiment == 'negative',
                )
                negative_result = await session.execute(negative_query)
                negative = negative_result.scalar() or 0
                
                # Check if >20% negative
                if negative / total > 0.2:
                    notification = await service.create_creator_notification(
                        user_id=user_id,
                        notification_type="negative_sentiment_spike",
                        title="Negative Sentiment Alert",
                        message=f"{int(negative/total*100)}% of recent comments have negative sentiment. You may want to review them.",
                        priority="high",
                        action_url="/interactions?sentiment=negative",
                        action_label="Review Comments",
                        entity_type=None,
                        entity_id=None,
                        data={
                            "total_comments": total,
                            "negative_comments": negative,
                            "percentage": negative / total * 100,
                        },
                        dedup_hours=24,  # One per day max
                    )
                    if notification:
                        notifications_created += 1
                        
            except Exception as e:
                logger.error(f"Error checking sentiment for user {user_id}: {e}")
    
    return {"notifications_created": notifications_created}


# =============================================================================
# Agency Notification Detection Tasks
# =============================================================================

@celery_app.task(name="notifications.check_deliverable_deadlines")
def check_deliverable_deadlines() -> Dict[str, Any]:
    """
    Check for deliverables due soon (48h) or overdue.
    """
    return asyncio.run(_check_deliverable_deadlines_async())


async def _check_deliverable_deadlines_async() -> Dict[str, Any]:
    """Async implementation of deliverable deadline checking."""
    due_soon_created = 0
    overdue_created = 0
    
    async with async_session_maker() as session:
        service = NotificationService(session)
        now = datetime.utcnow()
        due_soon_cutoff = now + timedelta(hours=48)
        
        # Find deliverables due within 48 hours
        due_soon_query = select(CampaignDeliverable).join(AgencyCampaign).where(
            CampaignDeliverable.due_date <= due_soon_cutoff,
            CampaignDeliverable.due_date > now,
            CampaignDeliverable.status.notin_(['completed', 'approved']),
        )
        result = await session.execute(due_soon_query)
        due_soon = list(result.scalars().all())
        
        for deliverable in due_soon:
            # Get campaign for agency_id
            campaign_query = select(AgencyCampaign).where(
                AgencyCampaign.id == deliverable.campaign_id
            )
            campaign_result = await session.execute(campaign_query)
            campaign = campaign_result.scalar_one_or_none()
            
            if not campaign:
                continue
            
            # Notify assignee and campaign owner
            recipients = set()
            if deliverable.owner_id:
                recipients.add(deliverable.owner_id)
            if campaign.owner_id:
                recipients.add(campaign.owner_id)
            
            for user_id in recipients:
                notification = await service.create_agency_notification(
                    agency_id=campaign.agency_id,
                    user_id=user_id,
                    notification_type="deliverable_due_soon",
                    title="Deliverable Due Soon",
                    description=f'"{deliverable.title}" is due in less than 48 hours',
                    priority="high",
                    link_url=f"/agency/campaigns/{campaign.id}",
                    entity_type="deliverable",
                    entity_id=deliverable.id,
                    metadata={
                        "deliverable_title": deliverable.title,
                        "campaign_name": campaign.title,
                        "due_date": deliverable.due_date.isoformat() if deliverable.due_date else None,
                    },
                    dedup_hours=24,
                )
                if notification:
                    due_soon_created += 1
        
        # Find overdue deliverables
        overdue_query = select(CampaignDeliverable).join(AgencyCampaign).where(
            CampaignDeliverable.due_date < now,
            CampaignDeliverable.status.notin_(['completed', 'approved']),
        )
        result = await session.execute(overdue_query)
        overdue = list(result.scalars().all())
        
        for deliverable in overdue:
            campaign_query = select(AgencyCampaign).where(
                AgencyCampaign.id == deliverable.campaign_id
            )
            campaign_result = await session.execute(campaign_query)
            campaign = campaign_result.scalar_one_or_none()
            
            if not campaign:
                continue
            
            recipients = set()
            if deliverable.owner_id:
                recipients.add(deliverable.owner_id)
            if campaign.owner_id:
                recipients.add(campaign.owner_id)
            
            for user_id in recipients:
                notification = await service.create_agency_notification(
                    agency_id=campaign.agency_id,
                    user_id=user_id,
                    notification_type="deliverable_overdue",
                    title="Deliverable Overdue",
                    description=f'"{deliverable.title}" is overdue!',
                    priority="urgent",
                    link_url=f"/agency/campaigns/{campaign.id}",
                    entity_type="deliverable",
                    entity_id=deliverable.id,
                    metadata={
                        "deliverable_title": deliverable.title,
                        "campaign_name": campaign.title,
                        "due_date": deliverable.due_date.isoformat() if deliverable.due_date else None,
                    },
                    dedup_hours=24,  # Remind daily
                )
                if notification:
                    overdue_created += 1
    
    return {
        "due_soon_notifications": due_soon_created,
        "overdue_notifications": overdue_created,
    }


@celery_app.task(name="notifications.check_deal_stagnation")
def check_deal_stagnation() -> Dict[str, Any]:
    """
    Check for deals that haven't moved in 7+ days.
    """
    return asyncio.run(_check_deal_stagnation_async())


async def _check_deal_stagnation_async() -> Dict[str, Any]:
    """Async implementation of deal stagnation checking."""
    notifications_created = 0
    
    async with async_session_maker() as session:
        service = NotificationService(session)
        cutoff = datetime.utcnow() - timedelta(days=7)
        
        # Find stagnant deals
        query = select(AgencyDeal).where(
            AgencyDeal.updated_at < cutoff,
            AgencyDeal.stage.notin_(['completed', 'lost', 'booked']),
        )
        result = await session.execute(query)
        stagnant_deals = list(result.scalars().all())
        
        for deal in stagnant_deals:
            # Notify deal owner
            if deal.owner_id:
                notification = await service.create_agency_notification(
                    agency_id=deal.agency_id,
                    user_id=deal.owner_id,
                    notification_type="deal_stagnant",
                    title="Deal Needs Attention",
                    description=f'"{deal.title}" hasn\'t been updated in over a week',
                    priority="normal",
                    link_url=f"/agency/pipeline/{deal.id}",
                    entity_type="deal",
                    entity_id=deal.id,
                    metadata={
                        "deal_title": deal.title,
                        "brand_name": deal.brand_name,
                        "stage": deal.stage,
                        "last_updated": deal.updated_at.isoformat() if deal.updated_at else None,
                    },
                    dedup_hours=168,  # Once per week
                )
                if notification:
                    notifications_created += 1
    
    return {"notifications_created": notifications_created}


@celery_app.task(name="notifications.check_task_deadlines")
def check_task_deadlines() -> Dict[str, Any]:
    """
    Check for tasks due soon (24h) or overdue.
    """
    return asyncio.run(_check_task_deadlines_async())


async def _check_task_deadlines_async() -> Dict[str, Any]:
    """Async implementation of task deadline checking."""
    due_soon_created = 0
    overdue_created = 0
    
    async with async_session_maker() as session:
        service = NotificationService(session)
        now = datetime.utcnow()
        due_soon_cutoff = now + timedelta(hours=24)
        
        # Tasks due within 24 hours
        due_soon_query = select(AgencyTask).where(
            AgencyTask.due_date <= due_soon_cutoff,
            AgencyTask.due_date > now,
            AgencyTask.status.notin_(['completed', 'cancelled']),
        )
        result = await session.execute(due_soon_query)
        due_soon = list(result.scalars().all())
        
        for task in due_soon:
            if task.assignee_id:
                notification = await service.create_agency_notification(
                    agency_id=task.agency_id,
                    user_id=task.assignee_id,
                    notification_type="task_due_soon",
                    title="Task Due Soon",
                    description=f'"{task.title}" is due in less than 24 hours',
                    priority="high",
                    link_url=f"/agency/tasks/{task.id}",
                    entity_type="task",
                    entity_id=task.id,
                    metadata={
                        "task_title": task.title,
                        "due_date": task.due_date.isoformat() if task.due_date else None,
                    },
                    dedup_hours=12,
                )
                if notification:
                    due_soon_created += 1
        
        # Overdue tasks
        overdue_query = select(AgencyTask).where(
            AgencyTask.due_date < now,
            AgencyTask.status.notin_(['completed', 'cancelled']),
        )
        result = await session.execute(overdue_query)
        overdue = list(result.scalars().all())
        
        for task in overdue:
            if task.assignee_id:
                notification = await service.create_agency_notification(
                    agency_id=task.agency_id,
                    user_id=task.assignee_id,
                    notification_type="task_overdue",
                    title="Task Overdue",
                    description=f'"{task.title}" is overdue!',
                    priority="urgent",
                    link_url=f"/agency/tasks/{task.id}",
                    entity_type="task",
                    entity_id=task.id,
                    metadata={
                        "task_title": task.title,
                        "due_date": task.due_date.isoformat() if task.due_date else None,
                    },
                    dedup_hours=24,
                )
                if notification:
                    overdue_created += 1
    
    return {
        "due_soon_notifications": due_soon_created,
        "overdue_notifications": overdue_created,
    }


# =============================================================================
# Daily Digest Task
# =============================================================================

@celery_app.task(name="notifications.send_daily_digests")
def send_daily_digests() -> Dict[str, Any]:
    """
    Send daily digest emails to users who have this preference enabled.
    """
    return asyncio.run(_send_daily_digests_async())


async def _send_daily_digests_async() -> Dict[str, Any]:
    """Async implementation of daily digest sending."""
    digests_sent = 0
    errors = 0
    current_hour = datetime.utcnow().hour
    
    async with async_session_maker() as session:
        # Find users who want digest at this hour
        prefs_query = select(NotificationPreference).where(
            NotificationPreference.email_enabled == True,
            NotificationPreference.email_frequency == 'daily_digest',
            NotificationPreference.digest_hour == current_hour,
            or_(
                NotificationPreference.last_digest_sent_at.is_(None),
                NotificationPreference.last_digest_sent_at < datetime.utcnow() - timedelta(hours=20),
            ),
        )
        result = await session.execute(prefs_query)
        prefs_list = list(result.scalars().all())
        
        for prefs in prefs_list:
            try:
                # Get user
                user_query = select(User).where(User.id == prefs.user_id)
                user_result = await session.execute(user_query)
                user = user_result.scalar_one_or_none()
                
                if not user or not user.email:
                    continue
                
                # Get unread notifications from last 24 hours
                cutoff = datetime.utcnow() - timedelta(hours=24)
                
                # Check if creator or agency user
                is_agency = user.account_type == 'agency'
                
                if is_agency:
                    notif_query = select(AgencyNotification).where(
                        AgencyNotification.user_id == user.id,
                        AgencyNotification.created_at >= cutoff,
                        AgencyNotification.is_read == False,
                    ).order_by(AgencyNotification.created_at.desc())
                else:
                    notif_query = select(CreatorNotification).where(
                        CreatorNotification.user_id == user.id,
                        CreatorNotification.created_at >= cutoff,
                        CreatorNotification.is_read == False,
                        CreatorNotification.included_in_digest == False,
                    ).order_by(CreatorNotification.created_at.desc())
                
                notif_result = await session.execute(notif_query)
                notifications = list(notif_result.scalars().all())
                
                if not notifications:
                    continue
                
                # Render and send digest
                subject, html = render_daily_digest_email(user, notifications, is_agency)
                send_email.delay(user.email, subject, html)
                
                # Mark notifications as included in digest
                if not is_agency:
                    for notif in notifications:
                        notif.included_in_digest = True
                        notif.digest_sent_at = datetime.utcnow()
                
                # Update last digest sent
                prefs.last_digest_sent_at = datetime.utcnow()
                await session.commit()
                
                digests_sent += 1
                
            except Exception as e:
                logger.error(f"Error sending digest to user {prefs.user_id}: {e}")
                errors += 1
    
    return {
        "digests_sent": digests_sent,
        "errors": errors,
    }


# =============================================================================
# Cleanup Task
# =============================================================================

@celery_app.task(name="notifications.cleanup_old_notifications")
def cleanup_old_notifications() -> Dict[str, Any]:
    """
    Delete notifications older than 90 days.
    """
    return asyncio.run(_cleanup_old_notifications_async())


async def _cleanup_old_notifications_async() -> Dict[str, Any]:
    """Async implementation of notification cleanup."""
    async with async_session_maker() as session:
        service = NotificationService(session)
        result = await service.cleanup_old_notifications()
        return result
