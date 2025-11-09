"""Instagram integration models.

Models for Instagram connections, media (posts/reels), comments, and insights.
"""
from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, relationship

from app.core.database import Base


class InstagramConnection(Base):
    __tablename__ = "instagram_connections"

    user_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    instagram_user_id: Mapped[str] = Column(String, nullable=False, unique=True)
    username: Mapped[str] = Column(String, nullable=False)
    account_type: Mapped[str | None] = Column(String, nullable=True)  # 'PERSONAL', 'BUSINESS', 'CREATOR'
    profile_picture_url: Mapped[str | None] = Column(Text, nullable=True)
    bio: Mapped[str | None] = Column(Text, nullable=True)
    follower_count: Mapped[int | None] = Column(Integer, nullable=True)
    following_count: Mapped[int | None] = Column(Integer, nullable=True)
    media_count: Mapped[int | None] = Column(Integer, nullable=True)
    access_token: Mapped[str | None] = Column(Text, nullable=True)
    token_expires_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    connection_status: Mapped[str] = Column(String, nullable=False, default="active")
    last_synced_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="instagram_connections")
    media = relationship("InstagramMedia", back_populates="connection", cascade="all, delete-orphan")
    insights = relationship("InstagramInsight", back_populates="connection", cascade="all, delete-orphan")


class InstagramMedia(Base):
    __tablename__ = "instagram_media"
    __table_args__ = (
        UniqueConstraint("media_id", name="uq_instagram_media_media_id"),
    )

    connection_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("instagram_connections.id", ondelete="CASCADE"), nullable=False)
    media_id: Mapped[str] = Column(String, nullable=False)
    media_type: Mapped[str] = Column(String, nullable=False)  # 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REEL'
    caption: Mapped[str | None] = Column(Text, nullable=True)
    media_url: Mapped[str | None] = Column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = Column(Text, nullable=True)
    permalink: Mapped[str | None] = Column(Text, nullable=True)
    timestamp: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    like_count: Mapped[int | None] = Column(Integer, nullable=True)
    comment_count: Mapped[int | None] = Column(Integer, nullable=True)
    save_count: Mapped[int | None] = Column(Integer, nullable=True)
    share_count: Mapped[int | None] = Column(Integer, nullable=True)
    play_count: Mapped[int | None] = Column(Integer, nullable=True)  # for videos/reels
    reach: Mapped[int | None] = Column(Integer, nullable=True)  # business accounts
    impressions: Mapped[int | None] = Column(Integer, nullable=True)  # business accounts
    engagement_rate: Mapped[float | None] = Column(Numeric(5, 2), nullable=True)
    hashtags: Mapped[list[str]] = Column(ARRAY(String), nullable=False, default=list)
    is_story: Mapped[bool] = Column(Boolean, nullable=False, default=False)
    story_expires_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    last_fetched_at: Mapped[DateTime] = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    connection = relationship("InstagramConnection", back_populates="media")
    comments = relationship("InstagramComment", back_populates="media", cascade="all, delete-orphan")


class InstagramComment(Base):
    __tablename__ = "instagram_comments"
    __table_args__ = (
        UniqueConstraint("comment_id", name="uq_instagram_comments_comment_id"),
    )

    media_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("instagram_media.id", ondelete="CASCADE"), nullable=False)
    comment_id: Mapped[str] = Column(String, nullable=False)
    username: Mapped[str | None] = Column(String, nullable=True)
    user_id: Mapped[str | None] = Column(String, nullable=True)
    text: Mapped[str | None] = Column(Text, nullable=True)
    timestamp: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    like_count: Mapped[int | None] = Column(Integer, nullable=True)
    parent_comment_id: Mapped[str | None] = Column(String, nullable=True)  # for replies
    is_hidden: Mapped[bool] = Column(Boolean, nullable=False, default=False)
    
    # AI enrichment data
    sentiment: Mapped[str | None] = Column(String(16), nullable=True)  # positive, negative, neutral
    priority_score: Mapped[int] = Column(Integer, default=50)  # 1-100
    categories: Mapped[list[str] | None] = Column(ARRAY(String), nullable=True)  # question, collab, spam
    detected_keywords: Mapped[list[str] | None] = Column(ARRAY(String), nullable=True)
    language: Mapped[str | None] = Column(String(10), nullable=True)
    
    # Management fields
    status: Mapped[str] = Column(String(20), default='unread')  # unread, read, answered, ignored
    tags: Mapped[list[str] | None] = Column(ARRAY(String), nullable=True)
    assigned_to_user_id: Mapped[str | None] = Column(PGUUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    internal_notes: Mapped[str | None] = Column(Text, nullable=True)
    
    # Workflow tracking
    workflow_id: Mapped[str | None] = Column(PGUUID(as_uuid=True), ForeignKey('workflows.id'), nullable=True)
    workflow_action: Mapped[str | None] = Column(String(50), nullable=True)
    
    # Response tracking
    replied_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    response_text: Mapped[str | None] = Column(Text, nullable=True)

    # Relationships
    media = relationship("InstagramMedia", back_populates="comments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id])
    workflow = relationship("Workflow", foreign_keys=[workflow_id])


class InstagramInsight(Base):
    __tablename__ = "instagram_insights"
    __table_args__ = (
        UniqueConstraint("connection_id", "date", name="uq_instagram_insights_connection_date"),
    )

    connection_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("instagram_connections.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[Date] = Column(Date, nullable=False)
    profile_views: Mapped[int | None] = Column(Integer, nullable=True)
    reach: Mapped[int | None] = Column(Integer, nullable=True)
    impressions: Mapped[int | None] = Column(Integer, nullable=True)
    website_clicks: Mapped[int | None] = Column(Integer, nullable=True)
    email_contacts: Mapped[int | None] = Column(Integer, nullable=True)
    phone_call_clicks: Mapped[int | None] = Column(Integer, nullable=True)
    follower_count: Mapped[int | None] = Column(Integer, nullable=True)
    follower_demographics: Mapped[dict | None] = Column(JSONB, nullable=True)  # {age_ranges, genders, cities, countries}
    audience_online_times: Mapped[dict | None] = Column(JSONB, nullable=True)  # {hour: count}

    # Relationships
    connection = relationship("InstagramConnection", back_populates="insights")
