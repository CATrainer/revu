"""Application models for user onboarding workflow."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Application(Base):
    """Application model for creator/agency signup applications."""

    __tablename__ = "applications"

    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_type = Column(
        PG_ENUM('creator', 'agency', 'legacy', name='account_type_enum', create_type=False),
        nullable=False,
        comment="Type of account being applied for"
    )
    application_data = Column(
        JSONB,
        nullable=False,
        comment="JSONB containing all application form data"
    )
    submitted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="When the application was submitted"
    )
    reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When admin reviewed the application"
    )
    reviewed_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="Admin who reviewed the application"
    )
    status = Column(
        PG_ENUM('pending', 'approved', 'rejected', name='application_status_enum', create_type=False),
        nullable=False,
        default='pending',
        comment="Current status of the application"
    )
    admin_notes = Column(
        Text,
        nullable=True,
        comment="Internal admin notes about the application"
    )

    # Relationships
    user = relationship("User", back_populates="applications", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    def __repr__(self) -> str:
        return f"<Application(user_id='{self.user_id}', account_type='{self.account_type}', status='{self.status}')>"


class AdminNotificationSettings(Base):
    """Admin notification settings for application notifications."""

    __tablename__ = "admin_notification_settings"

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        comment="Email address to send notifications to"
    )
    notification_types = Column(
        JSONB,
        nullable=False,
        default={"creator_applications": True, "agency_applications": True},
        comment="Types of notifications to receive"
    )
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether notifications are active"
    )
    added_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="Admin who added this notification setting"
    )
    added_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="When this notification setting was added"
    )

    # Relationships
    added_by_user = relationship("User", foreign_keys=[added_by])

    def __repr__(self) -> str:
        return f"<AdminNotificationSettings(email='{self.email}', is_active={self.is_active})>"
