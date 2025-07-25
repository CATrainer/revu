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
    auth_id = Column(String(255), unique=True, comment="Supabase Auth ID")
    hashed_password = Column(String(255))  # For local auth fallback
    last_login_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True, nullable=False)

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

    def __repr__(self) -> str:
        return f"<User(email='{self.email}')>"


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
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

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