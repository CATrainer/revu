"""AutoModeratorSettings model for per-user moderation configuration."""
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AutoModeratorSettings(Base):
    """Per-user configuration for the Auto Moderator system workflow.
    
    Allows users to configure what action to take for each platform and
    interaction type when the Auto Moderator detects inappropriate content.
    
    Actions available per platform:
    - Comments: delete, hide, report, none
    - DMs: block, restrict, none
    - Mentions: block, mute, none
    
    Note: Available actions depend on what each platform's API supports.
    """
    
    __tablename__ = "auto_moderator_settings"
    
    # User this config belongs to
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Per-platform actions for COMMENTS
    # YouTube: delete (via API), hide (hold for review), report, none
    youtube_comment_action = Column(String(30), default='delete')
    # Instagram: delete (via API), hide, none
    instagram_comment_action = Column(String(30), default='delete')
    # TikTok: delete (via API), hide, none
    tiktok_comment_action = Column(String(30), default='delete')
    # Twitter/X: hide (via API), none (no delete available for others' replies)
    twitter_comment_action = Column(String(30), default='hide')
    
    # Per-platform actions for DMs
    # YouTube: block user, restrict, none
    youtube_dm_action = Column(String(30), default='block')
    # Instagram: block user, restrict, none
    instagram_dm_action = Column(String(30), default='block')
    # TikTok: block user, none
    tiktok_dm_action = Column(String(30), default='block')
    # Twitter/X: block user, mute, none
    twitter_dm_action = Column(String(30), default='block')
    
    # Per-platform actions for MENTIONS
    # YouTube: block user, none
    youtube_mention_action = Column(String(30), default='block')
    # Instagram: block user, restrict, none
    instagram_mention_action = Column(String(30), default='block')
    # TikTok: block user, none
    tiktok_mention_action = Column(String(30), default='block')
    # Twitter/X: block user, mute, none
    twitter_mention_action = Column(String(30), default='mute')
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<AutoModeratorSettings for user {self.user_id}>"
    
    def get_action(self, platform: str, interaction_type: str) -> str:
        """Get the configured action for a platform and interaction type."""
        attr_name = f"{platform}_{interaction_type}_action"
        return getattr(self, attr_name, 'none')
    
    @classmethod
    def get_available_actions(cls, platform: str, interaction_type: str) -> list:
        """Get available actions for a platform and interaction type."""
        actions = {
            'youtube': {
                'comment': ['delete', 'hide', 'report', 'none'],
                'dm': ['block', 'restrict', 'none'],
                'mention': ['block', 'none'],
            },
            'instagram': {
                'comment': ['delete', 'hide', 'none'],
                'dm': ['block', 'restrict', 'none'],
                'mention': ['block', 'restrict', 'none'],
            },
            'tiktok': {
                'comment': ['delete', 'hide', 'none'],
                'dm': ['block', 'none'],
                'mention': ['block', 'none'],
            },
            'twitter': {
                'comment': ['hide', 'none'],
                'dm': ['block', 'mute', 'none'],
                'mention': ['block', 'mute', 'none'],
            },
        }
        return actions.get(platform, {}).get(interaction_type, ['none'])
