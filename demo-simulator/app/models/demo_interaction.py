"""Demo interaction model - generated comments/DMs."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class DemoInteraction(Base):
    """Generated interactions (comments/DMs) for demo content."""
    
    __tablename__ = "demo_interactions"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(PGUUID(as_uuid=True), ForeignKey('demo_profiles.id'), nullable=False, index=True)
    content_id = Column(PGUUID(as_uuid=True), ForeignKey('demo_content.id'), nullable=True, index=True)
    
    # Platform and type
    platform = Column(String(20), nullable=False, index=True)
    interaction_type = Column(String(20), nullable=False, index=True)  # comment, dm, reply, mention
    
    # Author (generated persona)
    author_username = Column(String(100), nullable=False)
    author_display_name = Column(String(100), nullable=False)
    author_avatar_url = Column(Text, nullable=True)
    author_verified = Column(Boolean, default=False)
    author_subscriber_count = Column(Integer, default=0)
    
    # Content
    content_text = Column(Text, nullable=False)
    sentiment = Column(String(20), nullable=False)  # positive, negative, neutral
    
    # Engagement on this interaction
    likes = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)
    
    # For main app - acts as platform interaction ID
    external_id = Column(String(100), nullable=False, unique=True, index=True)
    
    # Metadata for webhook
    webhook_data = Column(JSONB, nullable=True)
    
    # Sending status
    status = Column(String(20), default='pending', index=True)  # pending, sent, failed
    scheduled_for = Column(DateTime, nullable=False, index=True)
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("DemoProfile", back_populates="interactions")
    content = relationship("DemoContent", back_populates="interactions")
    
    def __repr__(self):
        return f"<DemoInteraction {self.platform} {self.interaction_type} - {self.sentiment}>"
    
    def to_webhook_payload(self) -> dict:
        """Convert to webhook payload for main app."""
        payload = {
            'event_type': f'{self.interaction_type}.created',
            'platform': self.platform,
            'user_id': str(self.profile.user_id),  # Include user_id from profile
            'interaction': {
                'id': self.external_id,
                'type': self.interaction_type,
                'content': self.content_text,
                'sentiment': self.sentiment,
                'author': {
                    'username': self.author_username,
                    'display_name': self.author_display_name,
                    'avatar_url': self.author_avatar_url,
                    'verified': self.author_verified,
                    'subscriber_count': self.author_subscriber_count,
                },
                'engagement': {
                    'likes': self.likes,
                    'replies': self.reply_count,
                },
                'created_at': self.created_at.isoformat(),
            }
        }
        
        # Add content reference if exists
        if self.content:
            payload['content'] = {
                'id': self.content.external_id,
                'title': self.content.title,
                'platform': self.content.platform,
            }
        
        return payload
