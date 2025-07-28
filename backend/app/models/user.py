"""User and membership models."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, UniqueConstraint
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
        default="waiting_list",
        comment="Access level: waiting_list, early_access, full_access"
    )
    joined_waiting_list_at = Column(DateTime(timezone=True))
    early_access_granted_at = Column(DateTime(timezone=True))
    demo_requested = Column(Boolean, default=False, nullable=False)
    demo_requested_at = Column(DateTime(timezone=True))

    # Relationships
    memberships = relationship("UserMembership", back_populates="user", cascade="all, delete-orphan")
    # Fix: Specify foreign_keys as a list [column_object]
    review_responses_created = relationship(
        "ReviewResponse", 
        foreign_keys="[ReviewResponse.created_by_id]",
        back_populates="created_by"
    )
    review_responses_approved = relationship(
        "ReviewResponse",
        foreign_keys="[ReviewResponse.approval_by_id]",
        back_populates="approval_by"
    )
    response_templates = relationship("ResponseTemplate", back_populates="created_by")
    automation_rules = relationship("AutomationRule", back_populates="created_by")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(email='{self.email}')>"
    
    @property
    def is_waiting_list(self) -> bool:
        """Check if user is on waiting list."""
        return self.access_status == "waiting_list"
    
    @property
    def has_early_access(self) -> bool:
        """Check if user has early access."""
        return self.access_status == "early_access"
    
    @property
    def has_full_access(self) -> bool:
        """Check if user has full access."""
        return self.access_status == "full_access"
    
    @property
    def can_access_dashboard(self) -> bool:
        """Check if user can access the main dashboard."""
        return self.access_status in ["early_access", "full_access"]
    
    def grant_early_access(self) -> None:
        """Grant early access to user."""
        self.access_status = "early_access"
        if not self.early_access_granted_at:
            self.early_access_granted_at = datetime.utcnow()
    
    def request_demo(self) -> None:
        """Mark user as having requested a demo."""
        self.demo_requested = True
        if not self.demo_requested_at:
            self.demo_requested_at = datetime.utcnow()


class UserMembership(Base):
    """User membership in organizations with role-based permissions."""

    __tablename__ = "user_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", "location_id", name="uq_user_org_location"),
    )

    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    role = Column(
        String(50),
        nullable=False,
        comment="Role: owner, admin, manager, member",
    )
    location_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("locations.id"),
        nullable=True,
        comment="NULL for org-wide roles",
    )
    permissions = Column(JSONB, default=dict, nullable=False)

    # Relationships
    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="memberships")
    location = relationship("Location", back_populates="memberships")
    
    #audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<UserMembership(user_id='{self.user_id}', org_id='{self.organization_id}', role='{self.role}')>"

    @property
    def is_owner(self) -> bool:
        """Check if user is an owner."""
        return self.role == "owner"

    @property
    def is_admin(self) -> bool:
        """Check if user is an admin or higher."""
        return self.role in ["owner", "admin"]

    @property
    def is_manager(self) -> bool:
        """Check if user is a manager or higher."""
        return self.role in ["owner", "admin", "manager"]

    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission."""
        # Owners have all permissions
        if self.is_owner:
            return True

        # Check role-based permissions
        role_permissions = {
            "admin": [
                "manage_locations",
                "manage_members",
                "manage_billing",
                "view_analytics",
                "manage_reviews",
                "manage_automation",
            ],
            "manager": [
                "view_analytics",
                "manage_reviews",
                "manage_automation",
                "manage_responses",
            ],
            "member": [
                "view_reviews",
                "create_responses",
                "view_basic_analytics",
            ],
        }

        if self.role in role_permissions and permission in role_permissions[self.role]:
            return True

        # Check custom permissions
        return self.permissions.get(permission, False)