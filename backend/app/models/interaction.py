"""Interaction model for comments, DMs, and mentions."""
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Interaction(Base):
    """Unified model for all social media interactions (comments, DMs, mentions)."""
    
    __tablename__ = "interactions"
    
    # Platform info
    platform = Column(String(32), nullable=False)  # instagram, youtube, tiktok, twitter
    type = Column(String(16), nullable=False)  # comment, dm, mention
    platform_id = Column(String(255), nullable=False, unique=True, index=True)
    
    # Content
    content = Column(Text, nullable=False)
    media_urls = Column(ARRAY(Text))
    
    # Author information
    author_name = Column(String(255))
    author_username = Column(String(255), index=True)
    author_profile_url = Column(Text)
    author_avatar_url = Column(Text)
    author_follower_count = Column(Integer)
    author_is_verified = Column(Boolean, default=False)
    
    # Context (what they're replying to)
    parent_content_id = Column(String(255))  # Video/Post ID
    parent_content_title = Column(Text)
    parent_content_url = Column(Text)
    is_reply = Column(Boolean, default=False)
    reply_to_id = Column(PGUUID(as_uuid=True), ForeignKey('interactions.id'))
    
    # AI-enriched data
    sentiment = Column(String(16), index=True)  # positive, negative, neutral
    priority_score = Column(Integer, default=50, index=True)  # 1-100
    categories = Column(ARRAY(String(50)))  # question, collab, sales, spam, etc.
    detected_keywords = Column(ARRAY(String(100)))
    language = Column(String(10))
    
    # Relations
    thread_id = Column(PGUUID(as_uuid=True), ForeignKey('interaction_threads.id'), index=True)
    fan_id = Column(PGUUID(as_uuid=True), ForeignKey('fans.id'), index=True)
    
    # Workflow tracking
    triggered_workflows = Column(ARRAY(PGUUID(as_uuid=True)))
    applied_actions = Column(JSONB)  # [{action: 'tag', value: 'urgent'}, ...]
    
    # Management
    tags = Column(ARRAY(String(50)))
    status = Column(String(20), default='unread', index=True)  # unread, read, replied, archived, spam
    assigned_to_user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id'))
    internal_notes = Column(Text)
    
    # Engagement metrics
    like_count = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)
    
    # Timestamps
    platform_created_at = Column(DateTime)
    read_at = Column(DateTime)
    replied_at = Column(DateTime)
    
    # Foreign keys
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), index=True)
    
    # Relationships
    thread = relationship("InteractionThread", back_populates="interactions")
    fan = relationship("Fan", back_populates="interactions")
    replies = relationship("Interaction", backref="parent", remote_side='Interaction.id')
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id])
    
    def __repr__(self):
        return f"<Interaction {self.id} - {self.type} on {self.platform} by {self.author_username}>"
