"""InteractionViewTag model for AI-based view filtering."""
from sqlalchemy import Column, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class InteractionViewTag(Base):
    """Tracks which interactions match which AI-filtered views.
    
    When an interaction comes in, it's evaluated against all AI views
    for that user. A tag record is created for each view indicating
    whether the interaction matches the view's criteria.
    """
    
    __tablename__ = "interaction_view_tags"
    
    # Foreign keys
    interaction_id = Column(PGUUID(as_uuid=True), ForeignKey('interactions.id', ondelete='CASCADE'), nullable=False, index=True)
    view_id = Column(PGUUID(as_uuid=True), ForeignKey('interaction_views.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Classification result
    matches = Column(Boolean, nullable=False, default=True)  # True if interaction matches view criteria
    confidence = Column(Float, nullable=True)  # LLM confidence score (0-1)
    
    # Tracking
    evaluated_at = Column(DateTime, nullable=False)  # When the LLM evaluated this
    prompt_hash = Column(String(64), nullable=True)  # Hash of the prompt used for evaluation
    
    # Relationships
    interaction = relationship("Interaction", backref="view_tags")
    view = relationship("InteractionView", backref="interaction_tags")
    
    def __repr__(self):
        return f"<InteractionViewTag interaction={self.interaction_id} view={self.view_id} matches={self.matches}>"
