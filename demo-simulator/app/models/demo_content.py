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
    
    # For main app integration - acts as platform content ID
    external_id = Column(String(100), nullable=False, unique=True, index=True)
    
    # Engagement metrics (updated over time)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    
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
        Calculate engagement multiplier based on hours since publish.
        
        Hour 0-2: 100% (initial burst)
        Hour 2-6: 70% (declining)
        Hour 6-12: 40% (slowing)
        Hour 12-24: 20% (trickle)
        Hour 24+: 10% (occasional)
        """
        if hours_since_publish < 2:
            return 1.0
        elif hours_since_publish < 6:
            return 0.7
        elif hours_since_publish < 12:
            return 0.4
        elif hours_since_publish < 24:
            return 0.2
        else:
            return 0.1
    
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
