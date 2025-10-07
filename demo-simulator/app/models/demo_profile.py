"""Demo profile model - stores user's demo configuration."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class DemoProfile(Base):
    """Demo profile configuration for a user."""
    
    __tablename__ = "demo_profiles"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True, unique=True)
    
    # Profile configuration
    profile_type = Column(String(20), nullable=False)  # 'auto' or 'manual'
    niche = Column(String(50), nullable=False)  # tech, gaming, beauty, etc.
    personality = Column(String(50), nullable=False)  # friendly, professional, casual, etc.
    
    # YouTube configuration
    yt_subscribers = Column(Integer, default=100000)
    yt_avg_views = Column(Integer, default=50000)
    yt_engagement_rate = Column(Float, default=0.05)  # 5%
    yt_upload_frequency = Column(String(20), default='daily')  # daily, weekly, etc.
    
    # Instagram configuration
    ig_followers = Column(Integer, default=50000)
    ig_avg_likes = Column(Integer, default=2500)
    ig_story_views = Column(Integer, default=10000)
    ig_post_frequency = Column(String(20), default='daily')
    
    # TikTok configuration
    tt_followers = Column(Integer, default=200000)
    tt_avg_views = Column(Integer, default=100000)
    tt_engagement_rate = Column(Float, default=0.08)  # 8%
    tt_post_frequency = Column(String(20), default='daily')
    
    # Activity configuration
    comment_volume = Column(String(20), default='medium')  # low, medium, high, viral
    dm_frequency = Column(String(20), default='medium')  # low, medium, high
    
    # Status
    is_active = Column(Boolean, default=True)
    last_activity_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    content = relationship("DemoContent", back_populates="profile", cascade="all, delete-orphan")
    interactions = relationship("DemoInteraction", back_populates="profile", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DemoProfile {self.id} - {self.niche} - {self.profile_type}>"
    
    def get_comment_target(self) -> int:
        """Get target number of comments per content based on volume setting."""
        if self.comment_volume == 'low':
            return 50
        elif self.comment_volume == 'medium':
            return 150
        elif self.comment_volume == 'high':
            return 300
        elif self.comment_volume == 'viral':
            return 1000
        return 150
    
    def get_dm_target(self) -> int:
        """Get target number of DMs per day."""
        if self.dm_frequency == 'low':
            return 5
        elif self.dm_frequency == 'medium':
            return 20
        elif self.dm_frequency == 'high':
            return 50
        return 20
    
    def calculate_expected_views(self, platform: str, content_type: str = 'video') -> int:
        """Calculate expected views for new content."""
        import random
        
        if platform == 'youtube':
            base = self.yt_avg_views
        elif platform == 'instagram':
            base = self.ig_avg_likes * 4  # Approximate views from likes
        elif platform == 'tiktok':
            base = self.tt_avg_views
        else:
            base = 10000
        
        # Add 20% variance
        variance = int(base * 0.2)
        return random.randint(base - variance, base + variance)
