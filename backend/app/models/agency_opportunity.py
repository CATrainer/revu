"""Agency opportunity model for sponsorship deals pushed to creators."""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, DateTime, ForeignKey, String, Text, Index
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AgencyOpportunity(Base):
    """Agency opportunity model - sponsorship deals pushed from agencies to creators."""

    __tablename__ = "agency_opportunities"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        comment="The agency creating/sending this opportunity"
    )
    creator_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="The creator this opportunity is for"
    )
    created_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="Agency user who created this opportunity"
    )

    # Opportunity Details
    title = Column(String(255), nullable=False, comment="Opportunity title")
    brand_name = Column(String(255), nullable=False, comment="Brand/sponsor name")
    brand_logo_url = Column(String(500), nullable=True, comment="URL to brand logo")
    description = Column(Text, nullable=False, comment="Detailed opportunity description")

    # Structured Data
    requirements = Column(
        JSONB,
        nullable=False,
        default=dict,
        comment="Deliverables and content requirements"
    )
    # Example requirements structure:
    # {
    #   "deliverables": ["1x YouTube video (10+ min)", "3x Instagram stories"],
    #   "content_guidelines": "Family-friendly, mention product within first 2 minutes",
    #   "talking_points": ["Feature A", "Feature B"],
    #   "restrictions": ["No competitor mentions"]
    # }

    compensation = Column(
        JSONB,
        nullable=False,
        default=dict,
        comment="Payment terms and compensation details"
    )
    # Example compensation structure:
    # {
    #   "type": "flat_fee" | "cpm" | "hybrid" | "product_only",
    #   "amount": 5000,
    #   "currency": "USD",
    #   "payment_terms": "50% upfront, 50% on delivery",
    #   "product_value": 500,
    #   "notes": "Bonus $500 if video exceeds 100k views"
    # }

    deadline = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Deadline to respond to the opportunity"
    )
    content_deadline = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Deadline to deliver the content"
    )

    # Status Tracking
    status = Column(
        PG_ENUM(
            'draft', 'sent', 'viewed', 'accepted', 'declined', 'completed', 'cancelled',
            name='agency_opportunity_status_enum',
            create_type=False
        ),
        nullable=False,
        default='draft',
        comment="Current opportunity status"
    )

    sent_at = Column(DateTime(timezone=True), nullable=True, comment="When opportunity was sent to creator")
    viewed_at = Column(DateTime(timezone=True), nullable=True, comment="When creator first viewed the opportunity")
    creator_response_at = Column(DateTime(timezone=True), nullable=True, comment="When creator responded")
    creator_notes = Column(Text, nullable=True, comment="Notes from creator (on accept/decline)")

    # Link to monetization project (created on acceptance)
    project_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("active_projects.id", ondelete="SET NULL"),
        nullable=True,
        comment="Linked monetization project (created when accepted)"
    )

    # Relationships
    agency = relationship("Agency", back_populates="opportunities")
    creator = relationship("User", foreign_keys=[creator_id], backref="agency_opportunities_received")
    created_by_user = relationship("User", foreign_keys=[created_by])
    project = relationship("ActiveProject", backref="agency_opportunity")

    __table_args__ = (
        Index("idx_agency_opportunities_agency_id", "agency_id"),
        Index("idx_agency_opportunities_creator_id", "creator_id"),
        Index("idx_agency_opportunities_status", "status"),
        Index("idx_agency_opportunities_created_by", "created_by"),
        Index("idx_agency_opportunities_sent_at", "sent_at"),
    )

    def __repr__(self) -> str:
        return f"<AgencyOpportunity(id={self.id}, title='{self.title}', status='{self.status}')>"
