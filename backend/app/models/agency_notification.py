"""Agency notification and activity models."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, String, Text, Index
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


NOTIFICATION_TYPE_ENUM = PG_ENUM(
    'deliverable_uploaded', 'deliverable_due', 'deliverable_overdue',
    'invoice_paid', 'invoice_overdue', 'invoice_sent',
    'deal_moved', 'deal_stagnant', 'deal_won', 'deal_lost',
    'campaign_started', 'campaign_completed',
    'creator_added', 'creator_removed',
    'payment_received', 'payout_due', 'payout_completed',
    'mention', 'comment', 'approval_needed', 'approval_granted',
    'performance_milestone', 'system',
    name='notification_type_enum', create_type=False
)


class AgencyNotification(Base):
    """Notifications for agency team members."""

    __tablename__ = "agency_notifications"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User to notify"
    )

    # Notification content
    type = Column(NOTIFICATION_TYPE_ENUM, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True, comment="Icon name")

    # Link to action
    link_url = Column(String(500), nullable=True, comment="URL to navigate to")
    entity_type = Column(String(50), nullable=True, comment="e.g., campaign, invoice, deal")
    entity_id = Column(PGUUID(as_uuid=True), nullable=True, comment="ID of related entity")

    # Status
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    is_actioned = Column(Boolean, nullable=False, default=False, comment="User took action")
    actioned_at = Column(DateTime(timezone=True), nullable=True)

    # Priority
    priority = Column(
        PG_ENUM('low', 'normal', 'high', 'urgent', name='notification_priority_enum', create_type=False),
        nullable=False,
        default='normal'
    )

    # Metadata
    metadata = Column(JSONB, nullable=False, default=dict)

    # Relationships
    agency = relationship("Agency", backref="notifications")
    user = relationship("User", backref="agency_notifications")

    __table_args__ = (
        Index("idx_agency_notifications_user_read", "user_id", "is_read"),
        Index("idx_agency_notifications_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AgencyNotification(id={self.id}, type='{self.type}', user_id={self.user_id})>"


class AgencyActivity(Base):
    """Activity feed/audit log for agency actions."""

    __tablename__ = "agency_activities"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Actor
    actor_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    actor_name = Column(String(255), nullable=True)
    actor_type = Column(String(50), nullable=False, default='user', comment="user, system, integration")

    # Activity type
    action = Column(String(100), nullable=False, comment="e.g., created, updated, deleted, moved")
    entity_type = Column(String(50), nullable=False, comment="e.g., campaign, deal, invoice")
    entity_id = Column(PGUUID(as_uuid=True), nullable=True)
    entity_name = Column(String(255), nullable=True)

    # Description
    description = Column(Text, nullable=False)

    # Changes (for updates)
    changes = Column(JSONB, nullable=True, comment="Field changes for updates")
    previous_state = Column(JSONB, nullable=True)
    new_state = Column(JSONB, nullable=True)

    # Metadata
    metadata = Column(JSONB, nullable=False, default=dict)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Relationships
    agency = relationship("Agency", backref="activities")
    actor = relationship("User", backref="agency_activities")

    __table_args__ = (
        Index("idx_agency_activities_created", "created_at"),
        Index("idx_agency_activities_entity", "entity_type", "entity_id"),
    )


class AgencyReport(Base):
    """Campaign performance reports."""

    __tablename__ = "agency_reports"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_campaigns.id", ondelete="SET NULL"),
        nullable=True
    )

    # Report details
    title = Column(String(255), nullable=False)
    brand_name = Column(String(255), nullable=True)
    creator_names = Column(JSONB, nullable=False, default=list)
    campaign_date = Column(DateTime(timezone=True), nullable=True)

    # Status
    status = Column(
        PG_ENUM('draft', 'generated', 'sent', 'viewed', 'downloaded', 'archived',
                name='report_status_enum', create_type=False),
        nullable=False,
        default='draft'
    )

    # Generation
    generated_at = Column(DateTime(timezone=True), nullable=True)
    generated_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    template = Column(String(100), nullable=True, comment="Report template used")

    # Distribution
    sent_at = Column(DateTime(timezone=True), nullable=True)
    sent_to = Column(JSONB, nullable=False, default=list, comment="List of email addresses")
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    downloaded_at = Column(DateTime(timezone=True), nullable=True)

    # Files
    pdf_url = Column(String(500), nullable=True)
    data_url = Column(String(500), nullable=True, comment="Raw data export")

    # Metrics
    metrics = Column(JSONB, nullable=False, default=dict, comment="Performance metrics snapshot")
    custom_sections = Column(JSONB, nullable=False, default=list, comment="Custom report sections")

    # Relationships
    agency = relationship("Agency", backref="reports")
    campaign = relationship("AgencyCampaign", backref="reports")
    generator = relationship("User", backref="generated_reports")

    __table_args__ = (
        Index("idx_agency_reports_status", "status"),
    )


class AgencyTask(Base):
    """Task tracking for agency workflows."""

    __tablename__ = "agency_tasks"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Task details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(
        PG_ENUM('low', 'normal', 'high', 'urgent', name='task_priority_enum', create_type=False),
        nullable=False,
        default='normal'
    )

    # Status
    status = Column(
        PG_ENUM('todo', 'in_progress', 'blocked', 'completed', 'cancelled',
                name='task_status_enum', create_type=False),
        nullable=False,
        default='todo'
    )

    # Assignment
    assignee_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Dates
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Related entities
    related_type = Column(String(50), nullable=True, comment="campaign, deal, invoice, etc.")
    related_id = Column(PGUUID(as_uuid=True), nullable=True)

    # Auto-generated task tracking
    is_auto_generated = Column(Boolean, nullable=False, default=False)
    source = Column(String(100), nullable=True, comment="What generated this task")

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    agency = relationship("Agency", backref="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id], backref="assigned_tasks")
    creator = relationship("User", foreign_keys=[created_by], backref="created_tasks")

    __table_args__ = (
        Index("idx_agency_tasks_status", "status"),
        Index("idx_agency_tasks_assignee", "assignee_id"),
        Index("idx_agency_tasks_due_date", "due_date"),
    )
