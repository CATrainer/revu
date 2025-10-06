"""Response template model."""

from sqlalchemy import Column, ForeignKey, Integer, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class ResponseTemplate(Base):
    """Response template model for reusable response templates.
    
    NOTE: location_id is nullable to support user-based templates for content creators.
    For location-based businesses: set location_id
    For content creators: set user_id (via created_by_id)
    
    Enhanced for interaction management with shortcuts, variables, and conversion tracking.
    """

    __tablename__ = "response_templates"

    # Legacy support
    location_id = Column(PGUUID(as_uuid=True), ForeignKey("locations.id"), nullable=True)
    
    # Basic info
    name = Column(String(255), nullable=False)
    shortcut = Column(String(50), index=True)  # /thanks, /merch for quick access
    category = Column(String(100))
    template_text = Column(Text, nullable=False)
    
    # Variables (legacy: placeholders, new: variables)
    placeholders = Column(ARRAY(String), default=list)  # For backwards compatibility
    variables = Column(ARRAY(String(50)))  # New enhanced variables
    has_conditionals = Column(Boolean, default=False)  # If template has conditional logic
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime)
    conversion_count = Column(Integer, default=0)  # If leads to sale/conversion
    
    # Organization
    is_shared = Column(Boolean, default=False)  # Share with team
    tags = Column(ARRAY(String(50)))
    
    # Ownership
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"))

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