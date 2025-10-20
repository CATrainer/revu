"""Fan CRM model for tracking valuable relationships."""
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class Fan(Base):
    """Fan/Customer relationship management."""
    
    __tablename__ = "fans"
    
    # Identity
    username = Column(String(255), nullable=False, index=True)
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    
    # Profile
    avatar_url = Column(Text)
    profile_url = Column(Text)
    bio = Column(Text)
    platforms = Column(JSONB)  # {"instagram": "@username", "youtube": "@channel"}
    
    # Engagement metrics
    total_interactions = Column(Integer, default=0)
    first_interaction_at = Column(DateTime, index=True)
    last_interaction_at = Column(DateTime, index=True)
    avg_sentiment = Column(String(16))  # Overall sentiment
    engagement_score = Column(Integer, default=0, index=True)  # 1-100
    
    # Classification
    is_superfan = Column(Boolean, default=False, index=True)
    is_vip = Column(Boolean, default=False, index=True)
    is_customer = Column(Boolean, default=False, index=True)
    is_blocked = Column(Boolean, default=False)
    tags = Column(ARRAY(String(50)))
    
    # Demo mode separation - CRITICAL for data integrity
    is_demo = Column(Boolean, default=False, nullable=False, index=True)
    
    # Revenue tracking
    lifetime_value = Column(Numeric(10, 2), default=0)
    purchase_count = Column(Integer, default=0)
    last_purchase_at = Column(DateTime)
    
    # Notes and custom data
    notes = Column(Text)
    custom_fields = Column(JSONB)  # Flexible custom data
    
    # Foreign keys
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), index=True)
    
    # Relationships
    interactions = relationship("Interaction", back_populates="fan")
    threads = relationship("InteractionThread", back_populates="fan")
    
    def __repr__(self):
        return f"<Fan {self.id} - {self.username} (Score: {self.engagement_score})>"
