"""Agency models for talent management agencies."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, String, Text,
    UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Agency(Base):
    """Agency model for talent management agencies."""

    __tablename__ = "agencies"

    name = Column(String(255), nullable=False, comment="Agency display name")
    slug = Column(String(255), unique=True, nullable=False, index=True, comment="URL-friendly unique identifier")
    owner_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="User who created/owns the agency"
    )

    logo_url = Column(String(500), nullable=True, comment="URL to agency logo")
    website = Column(String(500), nullable=True, comment="Agency website URL")
    description = Column(Text, nullable=True, comment="Agency description")

    settings = Column(JSONB, nullable=False, default=dict, comment="Agency settings and preferences")
    is_active = Column(Boolean, default=True, nullable=False, comment="Whether agency is active")

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_agencies")
    members = relationship("AgencyMember", back_populates="agency", cascade="all, delete-orphan")
    invitations = relationship("AgencyInvitation", back_populates="agency", cascade="all, delete-orphan")
    opportunities = relationship("AgencyOpportunity", back_populates="agency", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_agencies_owner_id", "owner_id"),
        Index("idx_agencies_is_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Agency(id={self.id}, name='{self.name}', slug='{self.slug}')>"


class AgencyMember(Base):
    """Agency member model - links users to agencies with roles."""

    __tablename__ = "agency_members"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        comment="The agency this membership belongs to"
    )
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="The user who is a member"
    )

    role = Column(
        PG_ENUM('owner', 'admin', 'member', name='agency_member_role_enum', create_type=False),
        nullable=False,
        default='member',
        comment="Member's role in the agency"
    )
    status = Column(
        PG_ENUM('pending_invite', 'pending_request', 'active', 'removed', name='agency_member_status_enum', create_type=False),
        nullable=False,
        default='pending_invite',
        comment="Membership status"
    )

    invited_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="User who sent the invitation"
    )
    invited_at = Column(DateTime(timezone=True), nullable=True, comment="When invitation was sent")
    joined_at = Column(DateTime(timezone=True), nullable=True, comment="When user joined/accepted")

    # Relationships
    agency = relationship("Agency", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], backref="agency_memberships")
    inviter = relationship("User", foreign_keys=[invited_by])

    __table_args__ = (
        UniqueConstraint("agency_id", "user_id", name="uq_agency_members_agency_user"),
        Index("idx_agency_members_agency_id", "agency_id"),
        Index("idx_agency_members_user_id", "user_id"),
        Index("idx_agency_members_status", "status"),
        Index("idx_agency_members_role", "role"),
    )

    def __repr__(self) -> str:
        return f"<AgencyMember(agency_id={self.agency_id}, user_id={self.user_id}, role='{self.role}', status='{self.status}')>"


class AgencyInvitation(Base):
    """Agency invitation model - for inviting non-users by email."""

    __tablename__ = "agency_invitations"

    agency_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="CASCADE"),
        nullable=False,
        comment="The agency sending the invitation"
    )
    email = Column(String(255), nullable=False, comment="Email address of invitee")
    token = Column(String(255), unique=True, nullable=False, comment="Unique invitation token")

    invited_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="User who sent the invitation"
    )

    expires_at = Column(DateTime(timezone=True), nullable=False, comment="When invitation expires")
    accepted_at = Column(DateTime(timezone=True), nullable=True, comment="When invitation was accepted")

    status = Column(
        PG_ENUM('pending', 'accepted', 'expired', 'cancelled', name='agency_invitation_status_enum', create_type=False),
        nullable=False,
        default='pending',
        comment="Invitation status"
    )

    # Relationships
    agency = relationship("Agency", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[invited_by])

    __table_args__ = (
        Index("idx_agency_invitations_agency_id", "agency_id"),
        Index("idx_agency_invitations_email", "email"),
        Index("idx_agency_invitations_token", "token"),
        Index("idx_agency_invitations_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<AgencyInvitation(agency_id={self.agency_id}, email='{self.email}', status='{self.status}')>"
