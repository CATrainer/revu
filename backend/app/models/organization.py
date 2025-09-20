"""Organization model for multi-tenant support."""

from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Organization(Base):
    """Organization model for multi-tenant support."""

    __tablename__ = "organizations"

    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    settings = Column(JSONB, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    users = relationship("User", back_populates="organization")
    locations = relationship("Location", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Organization(id='{self.id}', name='{self.name}')>"

    @property
    def display_name(self) -> str:
        """Get display name for the organization."""
        return self.name

    def get_setting(self, key: str, default=None):
        """Get a specific setting value."""
        return self.settings.get(key, default)

    def update_setting(self, key: str, value):
        """Update a specific setting value."""
        if self.settings is None:
            self.settings = {}
        self.settings[key] = value
