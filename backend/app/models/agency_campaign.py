"""Agency campaign and deliverable models for campaign management."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, String, Text,
    Integer, Numeric, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID as PGUUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


# Enums
CAMPAIGN_STATUS_ENUM = PG_ENUM(
    'draft', 'scheduled', 'in_progress', 'posted', 'completed', 'archived', 'cancelled',
    name='campaign_status_enum', create_type=False
)

DELIVERABLE_TYPE_ENUM = PG_ENUM(
    'brief_sent', 'product_shipped', 'script_draft', 'script_approved',
    'brand_approval', 'content_draft', 'content_revision', 'final_content',
    'content_posted', 'performance_report', 'custom',
    name='deliverable_type_enum', create_type=False
)

DELIVERABLE_STATUS_ENUM = PG_ENUM(
    'pending', 'in_progress', 'submitted', 'revision_requested',
    'approved', 'completed', 'overdue', 'cancelled',
    name='deliverable_status_enum', create_type=False
)

DELIVERABLE_OWNER_TYPE_ENUM = PG_ENUM(
    'agency', 'creator', 'brand',
    name='deliverable_owner_type_enum', create_type=False
)


class AgencyCampaign(Base):
    """Campaign model for tracking brand deals through execution."""

    __tablename__ = "agency_campaigns"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The agency running this campaign"
    )
    deal_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_deals.id", ondelete="SET NULL"),
        nullable=True,
        comment="Associated pipeline deal"
    )

    # Brand details
    brand_name = Column(String(255), nullable=False, comment="Brand/client name")
    brand_logo_url = Column(String(500), nullable=True, comment="Brand logo URL")
    brand_contact_name = Column(String(255), nullable=True, comment="Brand contact name")
    brand_contact_email = Column(String(255), nullable=True, comment="Brand contact email")

    # Campaign details
    title = Column(String(255), nullable=False, comment="Campaign title")
    description = Column(Text, nullable=True, comment="Campaign description/brief")
    campaign_type = Column(String(100), nullable=True, comment="e.g., Sponsored Post, Product Review")

    # Financial
    value = Column(Numeric(12, 2), nullable=False, default=0, comment="Total campaign value")
    currency = Column(String(3), nullable=False, default='USD', comment="Currency code")

    # Status and dates
    status = Column(CAMPAIGN_STATUS_ENUM, nullable=False, default='draft', comment="Campaign status")
    posting_date = Column(DateTime(timezone=True), nullable=True, comment="Target content posting date")
    start_date = Column(DateTime(timezone=True), nullable=True, comment="Campaign start date")
    end_date = Column(DateTime(timezone=True), nullable=True, comment="Campaign end date")

    # Assignment
    owner_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Team member responsible for this campaign"
    )

    # Metadata
    tags = Column(ARRAY(String), nullable=False, default=list, comment="Campaign tags")
    notes = Column(Text, nullable=True, comment="Internal notes")
    settings = Column(JSONB, nullable=False, default=dict, comment="Campaign settings")

    # Relationships
    agency = relationship("Agency", backref="campaigns")
    owner = relationship("User", backref="owned_campaigns")
    deliverables = relationship("CampaignDeliverable", back_populates="campaign", cascade="all, delete-orphan")
    creator_assignments = relationship("CampaignCreator", back_populates="campaign", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_agency_campaigns_agency_status", "agency_id", "status"),
        Index("idx_agency_campaigns_posting_date", "posting_date"),
    )

    def __repr__(self) -> str:
        return f"<AgencyCampaign(id={self.id}, title='{self.title}', brand='{self.brand_name}')>"


class CampaignCreator(Base):
    """Links creators to campaigns."""

    __tablename__ = "campaign_creators"

    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_campaigns.id", ondelete="CASCADE"),
        nullable=False
    )
    creator_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="Creator user ID"
    )

    # Creator-specific campaign details
    rate = Column(Numeric(12, 2), nullable=True, comment="Creator's rate for this campaign")
    currency = Column(String(3), nullable=False, default='USD', comment="Currency code")
    platform = Column(String(50), nullable=True, comment="Primary platform for this creator")
    deliverable_types = Column(ARRAY(String), nullable=False, default=list, comment="Types of content")

    # Status
    status = Column(String(50), nullable=False, default='assigned', comment="Assignment status")
    notes = Column(Text, nullable=True, comment="Notes about this assignment")

    # Relationships
    campaign = relationship("AgencyCampaign", back_populates="creator_assignments")
    creator = relationship("User", backref="campaign_assignments")

    __table_args__ = (
        UniqueConstraint("campaign_id", "creator_id", name="uq_campaign_creator"),
        Index("idx_campaign_creators_campaign_id", "campaign_id"),
        Index("idx_campaign_creators_creator_id", "creator_id"),
    )


class CampaignDeliverable(Base):
    """Deliverable/milestone tracking for campaigns."""

    __tablename__ = "campaign_deliverables"

    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_campaigns.id", ondelete="CASCADE"),
        nullable=False
    )

    # Deliverable details
    type = Column(DELIVERABLE_TYPE_ENUM, nullable=False, comment="Type of deliverable")
    title = Column(String(255), nullable=False, comment="Deliverable title")
    description = Column(Text, nullable=True, comment="Description/requirements")

    # Ownership
    owner_type = Column(DELIVERABLE_OWNER_TYPE_ENUM, nullable=False, default='agency', comment="Who is responsible")
    owner_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Specific person responsible"
    )
    creator_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Creator associated with this deliverable"
    )

    # Status and dates
    status = Column(DELIVERABLE_STATUS_ENUM, nullable=False, default='pending', comment="Current status")
    due_date = Column(DateTime(timezone=True), nullable=True, comment="Due date")
    completed_at = Column(DateTime(timezone=True), nullable=True, comment="Completion timestamp")

    # Files and feedback
    files = Column(JSONB, nullable=False, default=list, comment="Uploaded files metadata")
    feedback = Column(Text, nullable=True, comment="Feedback/revision notes")
    revision_count = Column(Integer, nullable=False, default=0, comment="Number of revisions")

    # Ordering
    order = Column(Integer, nullable=False, default=0, comment="Display order in workflow")

    # Relationships
    campaign = relationship("AgencyCampaign", back_populates="deliverables")
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_deliverables")
    creator = relationship("User", foreign_keys=[creator_id], backref="assigned_deliverables")

    __table_args__ = (
        Index("idx_campaign_deliverables_campaign_id", "campaign_id"),
        Index("idx_campaign_deliverables_status", "status"),
        Index("idx_campaign_deliverables_due_date", "due_date"),
    )

    def __repr__(self) -> str:
        return f"<CampaignDeliverable(id={self.id}, title='{self.title}', status='{self.status}')>"


class AgencyDeal(Base):
    """Pipeline deal tracking from prospect to booked."""

    __tablename__ = "agency_deals"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Brand details
    brand_name = Column(String(255), nullable=False, comment="Brand/prospect name")
    brand_logo_url = Column(String(500), nullable=True, comment="Brand logo URL")
    brand_contact_name = Column(String(255), nullable=True)
    brand_contact_email = Column(String(255), nullable=True)

    # Deal details
    title = Column(String(255), nullable=True, comment="Deal title/description")
    value = Column(Numeric(12, 2), nullable=False, default=0, comment="Deal value")
    currency = Column(String(3), nullable=False, default='USD')

    # Pipeline tracking
    stage = Column(
        PG_ENUM(
            'prospecting', 'pitch_sent', 'negotiating', 'booked',
            'in_progress', 'completed', 'lost',
            name='deal_stage_enum', create_type=False
        ),
        nullable=False,
        default='prospecting',
        comment="Pipeline stage"
    )
    status = Column(
        PG_ENUM(
            'on_track', 'action_needed', 'blocked', 'overdue',
            name='deal_status_enum', create_type=False
        ),
        nullable=False,
        default='on_track'
    )
    priority = Column(
        PG_ENUM('high', 'medium', 'low', 'none', name='deal_priority_enum', create_type=False),
        nullable=False,
        default='medium'
    )

    # Dates
    target_posting_date = Column(DateTime(timezone=True), nullable=True)
    expected_close_date = Column(DateTime(timezone=True), nullable=True)
    stage_changed_at = Column(DateTime(timezone=True), nullable=True)
    lost_at = Column(DateTime(timezone=True), nullable=True)
    lost_reason = Column(String(255), nullable=True)

    # Assignment and tracking
    owner_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    campaign_type = Column(String(100), nullable=True)
    tags = Column(ARRAY(String), nullable=False, default=list)
    notes = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True, comment="Next step/action needed")
    next_action_date = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    agency = relationship("Agency", backref="deals")
    owner = relationship("User", backref="owned_deals")
    creator_assignments = relationship("DealCreator", back_populates="deal", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_agency_deals_agency_stage", "agency_id", "stage"),
        Index("idx_agency_deals_stage", "stage"),
    )


class DealCreator(Base):
    """Links creators to pipeline deals."""

    __tablename__ = "deal_creators"

    deal_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_deals.id", ondelete="CASCADE"),
        nullable=False
    )
    creator_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # Creator details for this deal
    proposed_rate = Column(Numeric(12, 2), nullable=True)
    platform = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    deal = relationship("AgencyDeal", back_populates="creator_assignments")
    creator = relationship("User", backref="deal_assignments")

    __table_args__ = (
        UniqueConstraint("deal_id", "creator_id", name="uq_deal_creator"),
    )
