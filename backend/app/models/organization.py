"""Organization model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Organization(Base):
    """Organization model for businesses or agencies."""

    __tablename__ = "organizations"

    name = Column(String(255), nullable=False)
    type = Column(
        String(50),
        nullable=False,
        default="business",
        comment="Type: business or agency",
    )
    settings = Column(JSONB, default=dict, nullable=False)
    subscription_tier = Column(String(50), default="trial")
    subscription_status = Column(String(50), default="active")
    trial_ends_at = Column(DateTime(timezone=True))
    billing_email = Column(String(255))
    stripe_customer_id = Column(String(255), unique=True)
    stripe_subscription_id = Column(String(255), unique=True)

    # Relationships
    locations = relationship("Location", back_populates="organization", cascade="all, delete-orphan")
    memberships = relationship("UserMembership", back_populates="organization", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Organization(name='{self.name}', type='{self.type}')>"

    @property
    def is_trial(self) -> bool:
        """Check if organization is in trial period."""
        return self.subscription_tier == "trial" and (
            self.trial_ends_at is None or self.trial_ends_at > datetime.utcnow()
        )

    @property
    def is_active(self) -> bool:
        """Check if organization subscription is active."""
        return self.subscription_status == "active" or self.is_trial

    def get_location_limit(self) -> int:
        """Get the maximum number of locations allowed for this subscription tier."""
        limits = {
            "trial": 1,
            "essentials": 1,
            "professional": 3,
            "enterprise": 5,  # Base, can add more
        }
        return limits.get(self.subscription_tier, 1)

    def get_ai_response_limit(self) -> int:
        """Get the monthly AI response limit for this subscription tier."""
        limits = {
            "trial": 100,
            "essentials": 500,
            "professional": 2000,
            "enterprise": -1,  # Unlimited
        }
        return limits.get(self.subscription_tier, 100)