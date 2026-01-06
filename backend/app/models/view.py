"""Custom View model for organizing interactions."""
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class InteractionView(Base):
    """Custom views for filtering and organizing interactions."""
    
    __tablename__ = "interaction_views"
    
    # Basic info
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(50), default='📋')
    color = Column(String(20), default='#3b82f6')
    type = Column(String(20), default='custom')  # smart, custom, workflow
    
    # Filter mode: 'ai' for natural language filtering, 'manual' for traditional filters
    filter_mode = Column(String(20), default='ai', nullable=False)
    
    # AI filtering: natural language prompt describing what interactions to show
    ai_prompt = Column(Text)  # e.g., "Show me all brand deal inquiries and collaboration requests"
    ai_prompt_hash = Column(String(64))  # Hash to detect prompt changes for re-tagging
    
    # Manual filter configuration (flexible JSON structure)
    filters = Column(JSONB, nullable=False, server_default='{}')
    # Example: {
    #   "platforms": ["instagram", "youtube"],
    #   "keywords": ["merch", "shop"],
    #   "sentiment": "positive",
    #   "priority_min": 70,
    #   "status": ["unread"],
    #   "date_range": {"start": "2024-01-01", "end": "2024-12-31"}
    # }
    
    # Display preferences
    display = Column(JSONB, nullable=False, server_default='{"sortBy": "newest", "showReplies": true, "density": "comfortable"}')
    # Example: {
    #   "sortBy": "newest" | "oldest" | "priority" | "engagement",
    #   "groupBy": null | "platform" | "date" | "author",
    #   "showReplies": true,
    #   "density": "comfortable" | "compact"
    # }
    
    # Metadata
    is_pinned = Column(Boolean, default=False, index=True)
    is_shared = Column(Boolean, default=False, index=True)  # Share with team
    is_template = Column(Boolean, default=False)  # Template for other users
    is_system = Column(Boolean, default=False)  # Built-in system view
    order_index = Column(Integer, default=0)  # Sort order in sidebar
    
    # Connected workflows
    workflow_ids = Column(ARRAY(PGUUID(as_uuid=True)))
    
    # Foreign keys
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), index=True)
    
    # Relationships
    analytics = relationship("InteractionAnalytics", back_populates="view", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<InteractionView {self.id} - {self.name} ({self.type})>"
