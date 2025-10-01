"""Response template model."""

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class ResponseTemplate(Base):
    """Response template model for reusable response templates.
    
    NOTE: location_id is nullable to support user-based templates for content creators.
    For location-based businesses: set location_id
    For content creators: set user_id (via created_by_id)
    """

    __tablename__ = "response_templates"

    location_id = Column(PGUUID(as_uuid=True), ForeignKey("locations.id"), nullable=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    template_text = Column(Text, nullable=False)
    placeholders = Column(ARRAY(String), default=list)
    usage_count = Column(Integer, default=0, nullable=False)
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Relationships
    location = relationship("Location", back_populates="response_templates")
    created_by = relationship("User", back_populates="response_templates")

    def __repr__(self) -> str:
        return f"<ResponseTemplate(name='{self.name}', category='{self.category}')>"

    def fill_placeholders(self, values: dict) -> str:
        """Fill template placeholders with provided values."""
        text = self.template_text
        for placeholder in self.placeholders:
            key = placeholder.strip("{}")
            if key in values:
                text = text.replace(placeholder, str(values[key]))
        return text

    def increment_usage(self) -> None:
        """Increment the usage counter."""
        self.usage_count += 1