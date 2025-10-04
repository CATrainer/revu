"""User and membership models."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """User model for authentication and profile information."""

    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255))
    phone = Column(String(50), nullable=True, comment="Phone number for contact")
    company_name = Column(String(255), nullable=True, comment="Company/Organization name")
    industry = Column(String(100), nullable=True, comment="Industry/Business type")
    has_account = Column(Boolean, default=True, nullable=False, comment="Whether user completed full account creation")
    auth_id = Column(String(255), unique=True, comment="Supabase Auth ID")
    hashed_password = Column(String(255))  # For local auth fallback
    last_login_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False, comment="Admin user flag")
    
    # Access control fields
    access_status = Column(
        String(20), 
        nullable=False, 
        default="waiting",
        comment="Access level: waiting, full"
    )
    # Simple user category flag (content creator vs business)
    user_kind = Column(
        String(20),
        nullable=False,
        default="content",
        comment="User kind: content | business"
    )
    joined_waiting_list_at = Column(DateTime(timezone=True))
    early_access_granted_at = Column(DateTime(timezone=True))
    demo_requested = Column(Boolean, default=False, nullable=False)
    demo_requested_at = Column(DateTime(timezone=True))
    demo_scheduled_at = Column(DateTime(timezone=True))
    demo_completed = Column(Boolean, default=False, nullable=False)
    demo_completed_at = Column(DateTime(timezone=True))
    
    # Marketing preferences & deliverability tracking
    marketing_opt_in = Column(Boolean, default=True, nullable=False)
    marketing_opt_in_at = Column(DateTime(timezone=True))
    marketing_unsubscribed_at = Column(DateTime(timezone=True))
    marketing_bounced_at = Column(DateTime(timezone=True))
    marketing_last_event = Column(String(32))
    marketing_last_event_at = Column(DateTime(timezone=True))
    
    # Waitlist campaign send markers
    countdown_t14_sent_at = Column(DateTime(timezone=True))
    countdown_t7_sent_at = Column(DateTime(timezone=True))
    countdown_t1_sent_at = Column(DateTime(timezone=True))
    launch_sent_at = Column(DateTime(timezone=True))
    
    # Trial/subscription tracking
    trial_start_date = Column(DateTime(timezone=True), nullable=True, comment="When user started trial")
    trial_end_date = Column(DateTime(timezone=True), nullable=True, comment="When trial expires")
    trial_notified_7d = Column(Boolean, default=False, nullable=False, comment="7-day expiration notice sent")
    trial_notified_3d = Column(Boolean, default=False, nullable=False, comment="3-day expiration notice sent")
    trial_notified_1d = Column(Boolean, default=False, nullable=False, comment="1-day expiration notice sent")
    subscription_status = Column(String(20), default="trial", nullable=False, comment="trial, active, cancelled, expired")

    # Demo-specific information
    company_size = Column(String(50))
    current_solution = Column(String(255))
    
    # Admin notes for demo preparation
    demo_prep_notes = Column(Text)
    follow_up_reminders = Column(Text)
    user_qualification_notes = Column(Text)

    # Foreign keys
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    response_templates = relationship("ResponseTemplate", back_populates="created_by")
    automation_rules = relationship("AutomationRule", back_populates="created_by")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    # tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")  # TODO: Create Tag model if needed

    def __repr__(self) -> str:
        return f"<User(email='{self.email}')>"
    
    @property
    def is_waiting_list(self) -> bool:
        """Check if user is on waiting list."""
        # Support legacy value waiting_list as well
        return self.access_status in ("waiting", "waiting_list")
    
    @property
    def has_early_access(self) -> bool:
        """Deprecated: early access collapsed into full access."""
        return False
    
    @property
    def has_full_access(self) -> bool:
        """Check if user has full access."""
        return self.access_status in ("full", "full_access")
    
    @property
    def can_access_dashboard(self) -> bool:
        """Check if user can access the main dashboard."""
        return self.access_status in ("full", "full_access")
    
    def grant_early_access(self) -> None:
        """Deprecated: map to full access."""
        self.access_status = "full"
        if not self.early_access_granted_at:
            self.early_access_granted_at = datetime.utcnow()

    @property
    def is_content(self) -> bool:
        return (self.user_kind or "content") == "content"

    @property
    def is_business(self) -> bool:
        return (self.user_kind or "content") == "business"
    
    def request_demo(self) -> None:
        """Mark user as having requested a demo."""
        self.demo_requested = True
        if not self.demo_requested_at:
            self.demo_requested_at = datetime.utcnow()


# UserMembership class removed - not needed for social media focus