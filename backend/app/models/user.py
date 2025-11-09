"""User and membership models."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID as PGUUID
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
    
    # Access control fields (legacy - kept for backward compatibility)
    access_status = Column(
        String(20), 
        nullable=False, 
        default="pending",
        comment="Access level: pending (new users), full (approved/legacy users)"
    )
    # Simple user category flag (content creator vs business - legacy)
    user_kind = Column(
        String(20),
        nullable=False,
        default="content",
        comment="User kind: content | business (legacy field)"
    )
    
    # New approval workflow fields
    account_type = Column(
        PG_ENUM('creator', 'agency', 'legacy', name='account_type_enum', create_type=False),
        nullable=True,
        comment="Account type: creator, agency, or legacy (pre-application users)"
    )
    approval_status = Column(
        PG_ENUM('pending', 'approved', 'rejected', name='approval_status_enum', create_type=False),
        nullable=False,
        default='pending',
        comment="Approval status for application-based signup"
    )
    application_submitted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When user submitted their application"
    )
    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When user was approved"
    )
    approved_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="Admin who approved the user"
    )
    rejected_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When user was rejected"
    )
    rejected_by = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="Admin who rejected the user"
    )
    rejection_reason = Column(
        Text,
        nullable=True,
        comment="Internal reason for rejection"
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
    
    # Demo mode for simulated platform connections (with state tracking)
    demo_mode = Column(Boolean, default=False, nullable=False, comment="DEPRECATED: Use demo_mode_status")
    demo_mode_enabled_at = Column(DateTime(timezone=True), nullable=True, comment="When demo mode was first enabled")
    demo_mode_status = Column(String(20), default='disabled', nullable=False, comment="Current demo mode state")
    demo_mode_error = Column(Text, nullable=True, comment="Error message if demo mode failed")
    demo_profile_id = Column(String(255), nullable=True, comment="ID of demo profile in demo service")
    demo_mode_disabled_at = Column(DateTime(timezone=True), nullable=True, comment="When demo mode was disabled")

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
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    feedback = relationship("UserFeedback", back_populates="user", cascade="all, delete-orphan")
    credit_usage_events = relationship("CreditUsageEvent", back_populates="user", cascade="all, delete-orphan")
    credit_balance = relationship("UserCreditBalance", back_populates="user", uselist=False, cascade="all, delete-orphan")
    content_pieces = relationship("ContentPiece", back_populates="user", cascade="all, delete-orphan")
    action_plans = relationship("ActionPlan", back_populates="user", cascade="all, delete-orphan")
    applications = relationship(
        "Application", 
        back_populates="user",
        primaryjoin="User.id==foreign(Application.user_id)",
        cascade="all, delete-orphan"
    )
    background_jobs = relationship("BackgroundJob", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    creator_profile = relationship("CreatorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    active_project = relationship("ActiveProject", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(email='{self.email}')>"
    
    @property
    def is_waiting_list(self) -> bool:
        """Deprecated: No longer using waiting list. Check approval_status instead."""
        return False
    
    @property
    def has_early_access(self) -> bool:
        """Deprecated: Check approval_status == 'approved' instead."""
        return self.approval_status == "approved" if self.approval_status else self.access_status == "full"
    
    @property
    def has_full_access(self) -> bool:
        """Check if user has full access (approved or legacy)."""
        # New workflow: must be approved
        if self.approval_status:
            return self.approval_status == "approved"
        # Legacy: check old field
        return self.access_status == "full"
    
    @property
    def can_access_dashboard(self) -> bool:
        """Check if user can access the main dashboard."""
        # Admins always have access
        if self.is_admin:
            return True
        # New workflow: must be approved
        if self.approval_status:
            return self.approval_status == "approved"
        # Legacy users with full access
        return self.access_status == "full"
    
    def grant_early_access(self) -> None:
        """Deprecated: Use approval workflow instead."""
        # Update both old and new fields for backward compatibility
        self.access_status = "full"
        self.approval_status = "approved"
        if not self.approved_at:
            self.approved_at = datetime.utcnow()

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