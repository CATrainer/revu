"""AI Context model for personalized AI assistance."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Integer, Float
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserAIContext(Base):
    """Store user context for personalized AI interactions."""
    
    __tablename__ = "user_ai_context"
    
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Auto-detected context from YouTube/platforms
    channel_name = Column(String(255), nullable=True, comment="Primary channel/account name")
    niche = Column(String(255), nullable=True, comment="Content niche (e.g., Tech Reviews, Gaming, Fitness)")
    content_type = Column(String(100), nullable=True, comment="Primary content format (e.g., Long-form, Shorts, Live)")
    avg_video_length = Column(Integer, nullable=True, comment="Average video length in seconds")
    upload_frequency = Column(String(100), nullable=True, comment="Upload schedule (e.g., Daily, 3x/week)")
    primary_platform = Column(String(50), nullable=True, comment="Main platform (YouTube, TikTok, etc.)")
    
    # Audience insights
    subscriber_count = Column(Integer, nullable=True)
    avg_views = Column(Integer, nullable=True, comment="Average views per video")
    engagement_rate = Column(Float, nullable=True, comment="Average engagement rate")
    primary_audience_age = Column(String(50), nullable=True, comment="e.g., 18-24, 25-34")
    primary_audience_geo = Column(String(100), nullable=True, comment="Primary geographic location")
    
    # Content strategy
    top_performing_topics = Column(JSONB, nullable=True, comment="Array of top performing topics/themes")
    content_pillars = Column(JSONB, nullable=True, comment="Main content categories")
    posting_times = Column(JSONB, nullable=True, comment="Best performing posting times")
    
    # User-provided overrides/additions
    goals = Column(Text, nullable=True, comment="User's content goals")
    target_audience = Column(Text, nullable=True, comment="User's description of target audience")
    brand_voice = Column(String(255), nullable=True, comment="Brand voice/tone (e.g., Casual, Professional)")
    custom_notes = Column(Text, nullable=True, comment="Additional context from user")
    
    # Metadata
    last_auto_update = Column(DateTime(timezone=True), comment="Last time context was auto-updated from platforms")
    last_user_edit = Column(DateTime(timezone=True), comment="Last time user manually edited context")
    data_sources = Column(JSONB, nullable=True, comment="Sources used to build context (youtube, tiktok, etc.)")
    
    # Relationships
    user = relationship("User", backref="ai_context")
    
    def to_context_string(self) -> str:
        """Generate a formatted context string for AI system prompt."""
        parts = []
        
        if self.channel_name:
            parts.append(f"Channel: {self.channel_name}")
        
        if self.niche:
            parts.append(f"Niche: {self.niche}")
        
        if self.content_type:
            parts.append(f"Content Type: {self.content_type}")
        
        if self.upload_frequency:
            parts.append(f"Upload Schedule: {self.upload_frequency}")
        
        if self.subscriber_count:
            parts.append(f"Subscribers: {self.subscriber_count:,}")
        
        if self.avg_views:
            parts.append(f"Average Views: {self.avg_views:,}")
        
        if self.goals:
            parts.append(f"Goals: {self.goals}")
        
        if self.target_audience:
            parts.append(f"Target Audience: {self.target_audience}")
        
        if self.brand_voice:
            parts.append(f"Brand Voice: {self.brand_voice}")
        
        if self.content_pillars:
            pillars = ", ".join(self.content_pillars) if isinstance(self.content_pillars, list) else str(self.content_pillars)
            parts.append(f"Content Pillars: {pillars}")
        
        if self.custom_notes:
            parts.append(f"Additional Notes: {self.custom_notes}")
        
        return " | ".join(parts) if parts else "No context available"
    
    def __repr__(self) -> str:
        return f"<UserAIContext(user_id='{self.user_id}', niche='{self.niche}')>"
