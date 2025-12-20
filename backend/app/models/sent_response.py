"""SentResponse model for tracking all sent responses."""
from sqlalchemy import Column, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SentResponse(Base):
    """Track all sent responses for the Sent view.
    
    This table stores a history of every response sent, whether manual,
    semi-automated (AI-generated but human-approved), or fully automated.
    """
    
    __tablename__ = "sent_responses"
    
    # Link to the interaction this response was for
    interaction_id = Column(PGUUID(as_uuid=True), ForeignKey('interactions.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # The actual response text that was sent
    response_text = Column(Text, nullable=False)
    
    # Response type classification
    response_type = Column(String(20), nullable=False)  # 'manual' | 'semi_automated' | 'automated'
    
    # AI generation details (if applicable)
    ai_model = Column(String(50), nullable=True)  # e.g., 'claude-3-5-sonnet-latest'
    ai_confidence = Column(Float, nullable=True)  # 0.0 - 1.0
    was_edited = Column(Boolean, default=False)  # True if user edited AI response before sending
    original_ai_text = Column(Text, nullable=True)  # Original AI text before user edits
    
    # Workflow attribution (if sent by a workflow)
    workflow_id = Column(PGUUID(as_uuid=True), ForeignKey('workflows.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Platform response tracking
    platform_response_id = Column(String(255), nullable=True)  # ID returned by platform API
    platform_error = Column(Text, nullable=True)  # Error message if send failed
    
    # Timestamps
    sent_at = Column(DateTime(timezone=True), nullable=False)  # When the response was actually sent
    
    # Ownership
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True, index=True)
    
    # Demo mode separation
    is_demo = Column(Boolean, default=False, nullable=False, index=True)
    
    # Relationships
    interaction = relationship("Interaction", foreign_keys=[interaction_id])
    workflow = relationship("Workflow", foreign_keys=[workflow_id])
    user = relationship("User", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<SentResponse {self.id} - {self.response_type} for interaction {self.interaction_id}>"
