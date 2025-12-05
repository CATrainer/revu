"""Agency finance models for invoices and creator payouts."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, String, Text,
    Integer, Numeric, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


# Enums
INVOICE_STATUS_ENUM = PG_ENUM(
    'draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded',
    name='invoice_status_enum', create_type=False
)

PAYOUT_STATUS_ENUM = PG_ENUM(
    'pending', 'approved', 'processing', 'paid', 'overdue', 'cancelled', 'failed',
    name='payout_status_enum', create_type=False
)


class AgencyInvoice(Base):
    """Invoice model for billing brands/clients."""

    __tablename__ = "agency_invoices"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Invoice identification
    invoice_number = Column(String(50), nullable=False, comment="Invoice number")
    reference = Column(String(100), nullable=True, comment="External reference")

    # Linked entities
    deal_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_deals.id", ondelete="SET NULL"),
        nullable=True
    )
    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_campaigns.id", ondelete="SET NULL"),
        nullable=True
    )

    # Brand/client details
    brand_name = Column(String(255), nullable=False)
    brand_contact_name = Column(String(255), nullable=True)
    brand_contact_email = Column(String(255), nullable=True)
    billing_address = Column(Text, nullable=True)

    # Financial
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=True, comment="Tax rate percentage")
    tax_amount = Column(Numeric(12, 2), nullable=True, default=0)
    discount_amount = Column(Numeric(12, 2), nullable=True, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default='USD')

    # Payment tracking
    status = Column(INVOICE_STATUS_ENUM, nullable=False, default='draft')
    due_date = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    paid_amount = Column(Numeric(12, 2), nullable=True, default=0)
    payment_method = Column(String(100), nullable=True)
    payment_reference = Column(String(255), nullable=True)

    # Content
    line_items = Column(JSONB, nullable=False, default=list, comment="Invoice line items")
    notes = Column(Text, nullable=True, comment="Notes to client")
    terms = Column(Text, nullable=True, comment="Payment terms")
    footer = Column(Text, nullable=True, comment="Invoice footer")

    # PDF storage
    pdf_url = Column(String(500), nullable=True)

    # Relationships
    agency = relationship("Agency", backref="invoices")

    __table_args__ = (
        Index("idx_agency_invoices_agency_status", "agency_id", "status"),
        Index("idx_agency_invoices_due_date", "due_date"),
        UniqueConstraint("agency_id", "invoice_number", name="uq_agency_invoice_number"),
    )

    def __repr__(self) -> str:
        return f"<AgencyInvoice(id={self.id}, number='{self.invoice_number}', status='{self.status}')>"


class CreatorPayout(Base):
    """Payout tracking for paying creators their share."""

    __tablename__ = "creator_payouts"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    creator_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Linked entities
    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_campaigns.id", ondelete="SET NULL"),
        nullable=True
    )
    invoice_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_invoices.id", ondelete="SET NULL"),
        nullable=True,
        comment="Linked invoice if applicable"
    )

    # Campaign details for reference
    campaign_name = Column(String(255), nullable=True)
    brand_name = Column(String(255), nullable=True)

    # Financial
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default='USD')
    agency_fee = Column(Numeric(12, 2), nullable=True, comment="Agency's commission")
    agency_fee_percent = Column(Numeric(5, 2), nullable=True)

    # Payment tracking
    status = Column(PAYOUT_STATUS_ENUM, nullable=False, default='pending')
    due_date = Column(DateTime(timezone=True), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payment_method = Column(String(100), nullable=True)
    transaction_reference = Column(String(255), nullable=True)
    failure_reason = Column(Text, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    agency = relationship("Agency", backref="creator_payouts")
    creator = relationship("User", foreign_keys=[creator_id], backref="payouts")
    approver = relationship("User", foreign_keys=[approved_by])
    campaign = relationship("AgencyCampaign", backref="payouts")
    invoice = relationship("AgencyInvoice", backref="creator_payouts")

    __table_args__ = (
        Index("idx_creator_payouts_agency_status", "agency_id", "status"),
        Index("idx_creator_payouts_creator_id", "creator_id"),
        Index("idx_creator_payouts_due_date", "due_date"),
    )

    def __repr__(self) -> str:
        return f"<CreatorPayout(id={self.id}, creator_id={self.creator_id}, status='{self.status}')>"


class AgencyCreatorProfile(Base):
    """Extended creator profile for agency management."""

    __tablename__ = "agency_creator_profiles"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    creator_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Contact override (if different from user profile)
    display_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)

    # Platforms (agency's view of creator's platforms)
    platforms = Column(JSONB, nullable=False, default=list, comment="Platform data")
    niches = Column(JSONB, nullable=False, default=list, comment="Content niches/categories")

    # Rates
    standard_rate = Column(Numeric(12, 2), nullable=True)
    rate_currency = Column(String(3), nullable=False, default='USD')
    rate_card = Column(JSONB, nullable=False, default=dict, comment="Detailed rate card")

    # Relationship status
    relationship_status = Column(
        PG_ENUM('active', 'past', 'potential', name='creator_relationship_enum', create_type=False),
        nullable=False,
        default='active'
    )
    first_campaign_date = Column(DateTime(timezone=True), nullable=True)
    last_campaign_date = Column(DateTime(timezone=True), nullable=True)

    # Performance metrics (calculated)
    total_campaigns = Column(Integer, nullable=False, default=0)
    total_revenue = Column(Numeric(12, 2), nullable=False, default=0)
    on_time_delivery_rate = Column(Numeric(5, 2), nullable=True, comment="Percentage")
    avg_engagement_rate = Column(Numeric(5, 2), nullable=True)
    brand_rating = Column(Numeric(3, 2), nullable=True, comment="Average brand satisfaction")

    # Agency notes
    internal_notes = Column(Text, nullable=True)
    tags = Column(JSONB, nullable=False, default=list)

    # Availability preferences
    availability_status = Column(
        PG_ENUM('available', 'limited', 'busy', 'unavailable', name='creator_availability_enum', create_type=False),
        nullable=False,
        default='available'
    )
    max_concurrent_campaigns = Column(Integer, nullable=True, default=3)

    # Relationships
    agency = relationship("Agency", backref="creator_profiles")
    creator = relationship("User", backref="agency_profiles")

    __table_args__ = (
        UniqueConstraint("agency_id", "creator_id", name="uq_agency_creator_profile"),
        Index("idx_agency_creator_profiles_status", "relationship_status"),
    )


class CreatorGroup(Base):
    """Creator groups/segments for organization."""

    __tablename__ = "creator_groups"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=False, default='#6366f1')
    icon = Column(String(50), nullable=True)

    # Settings
    is_smart = Column(Boolean, nullable=False, default=False, comment="Auto-populated based on criteria")
    smart_criteria = Column(JSONB, nullable=True, comment="Criteria for smart groups")

    # Relationships
    agency = relationship("Agency", backref="creator_groups")
    memberships = relationship("CreatorGroupMember", back_populates="group", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("agency_id", "name", name="uq_agency_group_name"),
    )


class CreatorGroupMember(Base):
    """Group membership for creators."""

    __tablename__ = "creator_group_members"

    group_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("creator_groups.id", ondelete="CASCADE"),
        nullable=False
    )
    creator_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # Relationships
    group = relationship("CreatorGroup", back_populates="memberships")
    creator = relationship("User", backref="group_memberships")

    __table_args__ = (
        UniqueConstraint("group_id", "creator_id", name="uq_group_member"),
    )


class CreatorAvailability(Base):
    """Creator availability calendar."""

    __tablename__ = "creator_availability"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    creator_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        PG_ENUM('available', 'booked', 'tentative', 'unavailable', name='availability_day_enum', create_type=False),
        nullable=False,
        default='available'
    )

    # If booked, link to campaign
    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_campaigns.id", ondelete="SET NULL"),
        nullable=True
    )
    campaign_name = Column(String(255), nullable=True)
    brand_name = Column(String(255), nullable=True)

    notes = Column(Text, nullable=True)

    # Relationships
    agency = relationship("Agency")
    creator = relationship("User", backref="availability_entries")
    campaign = relationship("AgencyCampaign")

    __table_args__ = (
        UniqueConstraint("creator_id", "date", name="uq_creator_date_availability"),
        Index("idx_creator_availability_date", "date"),
    )
