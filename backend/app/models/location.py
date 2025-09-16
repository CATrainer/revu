"""Location model for business locations."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Location(Base):
    """Location model for business locations."""

    __tablename__ = "locations"

    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text)
    google_place_id = Column(String(255))
    timezone = Column(String(50), default="Europe/London", nullable=False)
    settings = Column(JSONB, default=dict, nullable=False)
    brand_voice_data = Column(JSONB, default=dict, nullable=False)
    business_info = Column(JSONB, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="locations")
    platform_connections = relationship("PlatformConnection", back_populates="location")
    response_templates = relationship("ResponseTemplate", back_populates="location")
    automation_rules = relationship("AutomationRule", back_populates="location")
    ai_training_data = relationship("AITrainingData", back_populates="location")
    analytics = relationship("Analytics", back_populates="location")

    def __repr__(self) -> str:
        return f"<Location(id='{self.id}', name='{self.name}')>"

    @property
    def display_name(self) -> str:
        """Get display name for the location."""
        return self.name

    def get_setting(self, key: str, default=None):
        """Get a specific setting value."""
        return self.settings.get(key, default)

    def update_setting(self, key: str, value):
        """Update a specific setting value."""
        if self.settings is None:
            self.settings = {}
        self.settings[key] = value
