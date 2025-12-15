"""Demo content model - generated videos/posts."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class DemoContent(Base):
    """Generated content (videos/posts) for demo profiles."""
    
    __tablename__ = "demo_content"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(PGUUID(as_uuid=True), ForeignKey('demo_profiles.id'), nullable=False, index=True)
    
    # Platform and type
    platform = Column(String(20), nullable=False, index=True)  # youtube, instagram, tiktok
    content_type = Column(String(20), nullable=False)  # video, post, story, reel, short
    
    # Content details
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    url = Column(Text, nullable=True)  # Platform URL
    
    # Video-specific metadata
    duration_seconds = Column(Integer, nullable=True)
    
    # Content metadata
    hashtags = Column(Text, nullable=True)  # JSON array as string
    theme = Column(String(100), nullable=True)  # Tutorial, Review, etc.
    
    # For main app integration - acts as platform content ID
    external_id = Column(String(100), nullable=False, unique=True, index=True)
    
    # Engagement metrics (updated over time)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    
    # Video-specific metrics
    watch_time_minutes = Column(Integer, default=0)
    avg_view_duration_seconds = Column(Integer, nullable=True)
    retention_rate = Column(Integer, nullable=True)  # Percentage 0-100
    
    # Engagement targets
    target_views = Column(Integer, nullable=False)
    target_comments = Column(Integer, nullable=False)
    
    # Lifecycle
    published_at = Column(DateTime, nullable=False)
    engagement_complete = Column(Boolean, default=False)  # All comments generated
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("DemoProfile", back_populates="content")
    interactions = relationship("DemoInteraction", back_populates="content", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DemoContent {self.platform} - {self.title[:50]}>"
    
    def calculate_engagement_wave(self, hours_since_publish: int) -> float:
        """
        Calculate engagement multiplier based on time since publish.
        
        Realistic YouTube engagement curve based on actual data:
        - 0-1 hour: 40% of total engagement (4.0x multiplier)
        - 1-6 hours: 30% of total (1.5x multiplier)
        - 6-24 hours: 20% of total (0.8x multiplier)
        - 24-48 hours: 8% of total (0.3x multiplier)
        - 48+ hours: 2% long tail (0.1x multiplier)
        """
        if hours_since_publish < 1:
            return 4.0  # Peak engagement - first hour is critical
        elif hours_since_publish < 6:
            return 1.5  # Still strong
        elif hours_since_publish < 24:
            return 0.8  # Moderate
        elif hours_since_publish < 48:
            return 0.3  # Declining
        else:
            return 0.1  # Long tail - occasional discovery 
    
    def get_remaining_comments(self) -> int:
        """Get number of comments still to be generated."""
        return max(0, self.target_comments - self.comments_count)
    
    def increment_engagement(self, comments: int = 0, likes: int = 0, shares: int = 0):
        """Increment engagement metrics."""
        self.comments_count += comments
        self.likes += likes
        self.shares += shares
        
        if self.comments_count >= self.target_comments:
            self.engagement_complete = True
