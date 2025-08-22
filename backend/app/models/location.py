"""Location model."""

from sqlalchemy import Boolean, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Location(Base):
    """Location model for individual business locations."""

    __tablename__ = "locations"

    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text)
    google_place_id = Column(String(255), unique=True, index=True)
    timezone = Column(String(50), default="Europe/London")
    settings = Column(JSONB, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    # Distinguish location type: business_location | agency_client
    kind = Column(String(50), default="business_location", nullable=False)
    
    # AI Training Data
    brand_voice_data = Column(JSONB, default=dict, nullable=False)
    business_info = Column(JSONB, default=dict, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="locations")
    reviews = relationship("Review", back_populates="location", cascade="all, delete-orphan")
    platform_connections = relationship("PlatformConnection", back_populates="location", cascade="all, delete-orphan")
    response_templates = relationship("ResponseTemplate", back_populates="location", cascade="all, delete-orphan")
    automation_rules = relationship("AutomationRule", back_populates="location", cascade="all, delete-orphan")
    competitors = relationship("Competitor", back_populates="location", cascade="all, delete-orphan")
    analytics_snapshots = relationship("AnalyticsSnapshot", back_populates="location", cascade="all, delete-orphan")
    memberships = relationship("UserMembership", back_populates="location")
    ai_training_data = relationship("AITrainingData", back_populates="location", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Location(name='{self.name}', org_id='{self.organization_id}')>"

    def get_brand_voice(self) -> dict:
        """Get the brand voice configuration."""
        default_voice = {
            "tone": "professional",
            "style": "friendly",
            "personality_traits": [],
            "do_list": [],
            "dont_list": [],
            "example_responses": [],
        }
        return {**default_voice, **self.brand_voice_data}

    def get_business_info(self) -> dict:
        """Get the business information for AI context."""
        default_info = {
            "business_type": "",
            "specialties": [],
            "unique_features": [],
            "target_audience": "",
            "key_staff": [],
            "hours": {},
        }
        return {**default_info, **self.business_info}