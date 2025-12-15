"""
Notification models for creators and shared notification infrastructure.

Agency notifications are in agency_notification.py.
This module contains creator notifications and shared preference models.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, String, Text, Index, Integer
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


# =============================================================================
# Creator Notification Model
# =============================================================================

class CreatorNotification(Base):
    """Notifications for creator dashboard users."""

    __tablename__ = "creator_notifications"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Notification type identifier (e.g., "engagement_spike", "new_superfan")
    type = Column(String(50), nullable=False, index=True)
    
    # Display content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    
    # Priority: low, normal, high, urgent
    priority = Column(String(20), nullable=False, default='normal')
    
    # Action/navigation
    action_url = Column(String(500), nullable=True, comment="URL to navigate to when clicked")
    action_label = Column(String(100), nullable=True, comment="Button text like 'View Details'")
    
    # Entity linking (for deduplication and context)
    entity_type = Column(String(50), nullable=True, comment="e.g., content, fan, deal")
    entity_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    # Status tracking
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    is_dismissed = Column(Boolean, nullable=False, default=False)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Email tracking
    email_sent = Column(Boolean, nullable=False, default=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    included_in_digest = Column(Boolean, nullable=False, default=False)
    digest_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional data (flexible JSON for type-specific info)
    data = Column(JSONB, nullable=False, default=dict)
    
    # Expiration (notifications auto-archive after 90 days)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="creator_notifications")

    __table_args__ = (
        Index("idx_creator_notif_user_read", "user_id", "is_read"),
        Index("idx_creator_notif_user_type", "user_id", "type"),
        Index("idx_creator_notif_created", "created_at"),
        Index("idx_creator_notif_entity", "entity_type", "entity_id"),
    )

    def __repr__(self) -> str:
        return f"<CreatorNotification(id={self.id}, type='{self.type}', user_id={self.user_id})>"

    def mark_read(self) -> None:
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()

    def dismiss(self) -> None:
        """Dismiss notification."""
        if not self.is_dismissed:
            self.is_dismissed = True
            self.dismissed_at = datetime.utcnow()


# =============================================================================
# Notification Delivery Log (for deduplication)
# =============================================================================

class NotificationDeliveryLog(Base):
    """
    Tracks notification deliveries for deduplication.
    
    Prevents sending duplicate notifications for the same event.
    """

    __tablename__ = "notification_delivery_logs"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # What type of notification
    notification_type = Column(String(50), nullable=False)
    
    # What entity it's about (optional)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    # Custom deduplication key (for complex scenarios)
    dedup_key = Column(String(255), nullable=True)
    
    # When it was delivered
    delivered_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    # Channel: 'in_app', 'email', 'digest'
    channel = Column(String(20), nullable=False, default='in_app')

    __table_args__ = (
        Index(
            "idx_notif_delivery_dedup",
            "user_id", "notification_type", "entity_type", "entity_id", "dedup_key"
        ),
        Index("idx_notif_delivery_time", "user_id", "notification_type", "delivered_at"),
    )

    def __repr__(self) -> str:
        return f"<NotificationDeliveryLog(user_id={self.user_id}, type='{self.notification_type}')>"


# =============================================================================
# Notification Type Definitions
# =============================================================================

# Creator notification types with metadata
CREATOR_NOTIFICATION_TYPES = {
    # Performance
    "engagement_spike": {
        "title": "Engagement Spike Alert",
        "category": "performance",
        "default_in_app": True,
        "default_email": True,
        "icon": "trending-up",
    },
    "viral_content": {
        "title": "Viral Content Alert",
        "category": "performance",
        "default_in_app": True,
        "default_email": True,
        "icon": "flame",
    },
    "content_milestone": {
        "title": "Content Milestone",
        "category": "performance",
        "default_in_app": True,
        "default_email": True,
        "icon": "trophy",
    },
    
    # Audience
    "new_superfan": {
        "title": "New Superfan Detected",
        "category": "audience",
        "default_in_app": True,
        "default_email": True,
        "icon": "star",
    },
    "superfan_activity": {
        "title": "Superfan Activity",
        "category": "audience",
        "default_in_app": True,
        "default_email": False,
        "icon": "heart",
    },
    
    # Moderation
    "negative_sentiment_spike": {
        "title": "Negative Sentiment Alert",
        "category": "moderation",
        "default_in_app": True,
        "default_email": True,
        "icon": "alert-triangle",
    },
    
    # Opportunities
    "brand_mention": {
        "title": "Brand Mention",
        "category": "opportunities",
        "default_in_app": True,
        "default_email": False,
        "icon": "at-sign",
    },
    "collab_opportunity": {
        "title": "Collaboration Opportunity",
        "category": "opportunities",
        "default_in_app": True,
        "default_email": True,
        "icon": "handshake",
    },
    
    # Deals
    "deal_offer": {
        "title": "New Deal Offer",
        "category": "deals",
        "default_in_app": True,
        "default_email": True,
        "icon": "dollar-sign",
    },
    "deal_status_change": {
        "title": "Deal Status Update",
        "category": "deals",
        "default_in_app": True,
        "default_email": True,
        "icon": "refresh-cw",
    },
    "payment_received": {
        "title": "Payment Received",
        "category": "deals",
        "default_in_app": True,
        "default_email": True,
        "icon": "check-circle",
    },
    
    # Insights
    "ai_insight": {
        "title": "AI-Generated Insight",
        "category": "insights",
        "default_in_app": True,
        "default_email": False,
        "icon": "sparkles",
    },
    
    # Scheduling
    "posting_reminder": {
        "title": "Best Time to Post",
        "category": "scheduling",
        "default_in_app": False,
        "default_email": False,
        "icon": "clock",
    },
    
    # System
    "platform_connected": {
        "title": "Platform Connected",
        "category": "system",
        "default_in_app": True,
        "default_email": False,
        "icon": "link",
    },
    "platform_disconnected": {
        "title": "Platform Disconnected",
        "category": "system",
        "default_in_app": True,
        "default_email": True,
        "icon": "unlink",
    },
    "sync_error": {
        "title": "Sync Error",
        "category": "system",
        "default_in_app": True,
        "default_email": True,
        "icon": "alert-circle",
    },
    
    # Agency
    "agency_invitation": {
        "title": "Agency Invitation",
        "category": "agency",
        "default_in_app": True,
        "default_email": True,
        "icon": "mail",
    },
    "agency_task_assigned": {
        "title": "Task Assigned by Agency",
        "category": "agency",
        "default_in_app": True,
        "default_email": True,
        "icon": "clipboard",
    },
}

# Agency notification types with metadata
AGENCY_NOTIFICATION_TYPES = {
    # Campaigns
    "deliverable_uploaded": {
        "title": "Deliverable Uploaded",
        "category": "campaigns",
        "default_in_app": True,
        "default_email": True,
        "icon": "upload",
    },
    "deliverable_due_soon": {
        "title": "Deliverable Due Soon",
        "category": "campaigns",
        "default_in_app": True,
        "default_email": True,
        "icon": "clock",
    },
    "deliverable_overdue": {
        "title": "Deliverable Overdue",
        "category": "campaigns",
        "default_in_app": True,
        "default_email": True,
        "icon": "alert-triangle",
    },
    "script_approval_needed": {
        "title": "Script Needs Approval",
        "category": "campaigns",
        "default_in_app": True,
        "default_email": True,
        "icon": "file-text",
    },
    "content_approval_needed": {
        "title": "Content Needs Approval",
        "category": "campaigns",
        "default_in_app": True,
        "default_email": True,
        "icon": "video",
    },
    "campaign_started": {
        "title": "Campaign Started",
        "category": "campaigns",
        "default_in_app": True,
        "default_email": False,
        "icon": "play",
    },
    "campaign_completed": {
        "title": "Campaign Completed",
        "category": "campaigns",
        "default_in_app": True,
        "default_email": True,
        "icon": "check-circle",
    },
    
    # Pipeline
    "deal_stage_changed": {
        "title": "Deal Stage Changed",
        "category": "pipeline",
        "default_in_app": True,
        "default_email": False,
        "icon": "git-branch",
    },
    "deal_stagnant": {
        "title": "Deal Needs Attention",
        "category": "pipeline",
        "default_in_app": True,
        "default_email": True,
        "icon": "alert-circle",
    },
    "deal_won": {
        "title": "Deal Won",
        "category": "pipeline",
        "default_in_app": True,
        "default_email": True,
        "icon": "trophy",
    },
    "deal_lost": {
        "title": "Deal Lost",
        "category": "pipeline",
        "default_in_app": True,
        "default_email": False,
        "icon": "x-circle",
    },
    
    # Finance
    "invoice_sent": {
        "title": "Invoice Sent",
        "category": "finance",
        "default_in_app": True,
        "default_email": False,
        "icon": "send",
    },
    "invoice_paid": {
        "title": "Invoice Paid",
        "category": "finance",
        "default_in_app": True,
        "default_email": True,
        "icon": "dollar-sign",
    },
    "invoice_overdue": {
        "title": "Invoice Overdue",
        "category": "finance",
        "default_in_app": True,
        "default_email": True,
        "icon": "alert-triangle",
    },
    "payout_due": {
        "title": "Creator Payout Due",
        "category": "finance",
        "default_in_app": True,
        "default_email": True,
        "icon": "calendar",
    },
    "payout_completed": {
        "title": "Payout Completed",
        "category": "finance",
        "default_in_app": True,
        "default_email": False,
        "icon": "check",
    },
    
    # Team
    "creator_joined": {
        "title": "Creator Joined Agency",
        "category": "team",
        "default_in_app": True,
        "default_email": True,
        "icon": "user-plus",
    },
    "creator_left": {
        "title": "Creator Left Agency",
        "category": "team",
        "default_in_app": True,
        "default_email": True,
        "icon": "user-minus",
    },
    "team_member_joined": {
        "title": "Team Member Joined",
        "category": "team",
        "default_in_app": True,
        "default_email": False,
        "icon": "users",
    },
    
    # Collaboration
    "mention": {
        "title": "You Were Mentioned",
        "category": "collaboration",
        "default_in_app": True,
        "default_email": True,
        "icon": "at-sign",
    },
    "comment_added": {
        "title": "New Comment",
        "category": "collaboration",
        "default_in_app": True,
        "default_email": False,
        "icon": "message-square",
    },
    
    # Tasks
    "task_assigned": {
        "title": "Task Assigned",
        "category": "tasks",
        "default_in_app": True,
        "default_email": True,
        "icon": "clipboard",
    },
    "task_due_soon": {
        "title": "Task Due Soon",
        "category": "tasks",
        "default_in_app": True,
        "default_email": True,
        "icon": "clock",
    },
    "task_overdue": {
        "title": "Task Overdue",
        "category": "tasks",
        "default_in_app": True,
        "default_email": True,
        "icon": "alert-triangle",
    },
    
    # Performance
    "performance_milestone": {
        "title": "Campaign Milestone",
        "category": "performance",
        "default_in_app": True,
        "default_email": True,
        "icon": "trending-up",
    },
}

# Category groupings for settings UI
NOTIFICATION_CATEGORIES = {
    "creator": {
        "performance": "Performance Alerts",
        "audience": "Audience & Fans",
        "moderation": "Moderation",
        "opportunities": "Opportunities",
        "deals": "Deals & Payments",
        "insights": "AI Insights",
        "scheduling": "Scheduling",
        "system": "System",
        "agency": "Agency",
    },
    "agency": {
        "campaigns": "Campaigns",
        "pipeline": "Deal Pipeline",
        "finance": "Finance",
        "team": "Team",
        "collaboration": "Collaboration",
        "tasks": "Tasks",
        "performance": "Performance",
    },
}
