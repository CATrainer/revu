"""YouTube integration models.

Models reflect the schema defined in Alembic migrations for:
- youtube_connections
- youtube_videos
- youtube_comments
- oauth_state_tokens
- sync_logs
"""
from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
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


class YouTubeConnection(Base):
    __tablename__ = "youtube_connections"

    user_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel_id: Mapped[str | None] = Column(String, nullable=True)
    channel_name: Mapped[str | None] = Column(String, nullable=True)
    access_token: Mapped[str | None] = Column(Text, nullable=True)
    refresh_token: Mapped[str | None] = Column(Text, nullable=True)
    token_expires_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    connection_status: Mapped[str] = Column(String, nullable=False, default="active")
    last_synced_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    
    # Channel metrics (from YouTube Data API)
    subscriber_count: Mapped[int | None] = Column(Integer, nullable=True)
    total_views: Mapped[int | None] = Column(BigInteger, nullable=True)
    video_count: Mapped[int | None] = Column(Integer, nullable=True)
    average_views_per_video: Mapped[int | None] = Column(Integer, nullable=True)
    engagement_rate: Mapped[float | None] = Column(Numeric(5, 2), nullable=True)
    
    # Growth tracking
    subscriber_growth_30d: Mapped[int | None] = Column(Integer, nullable=True)
    views_growth_30d: Mapped[int | None] = Column(Integer, nullable=True)
    last_metrics_update: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="youtube_connections")
    videos = relationship("YouTubeVideo", back_populates="connection", cascade="all, delete-orphan")
    sync_logs = relationship("SyncLog", back_populates="connection", cascade="all, delete-orphan")


class YouTubeVideo(Base):
    __tablename__ = "youtube_videos"
    __table_args__ = (
        UniqueConstraint("video_id", name="uq_youtube_videos_video_id"),
    )

    channel_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("youtube_connections.id", ondelete="CASCADE"), nullable=False)
    video_id: Mapped[str] = Column(String, nullable=False)
    title: Mapped[str | None] = Column(Text, nullable=True)
    description: Mapped[str | None] = Column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = Column(Text, nullable=True)
    published_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    view_count: Mapped[int | None] = Column(BigInteger, nullable=True)
    like_count: Mapped[int | None] = Column(BigInteger, nullable=True)
    comment_count: Mapped[int | None] = Column(BigInteger, nullable=True)
    duration: Mapped[str | None] = Column(String, nullable=True)
    # DB migration sets NOT NULL with server_default now(); reflect that here
    last_fetched_at: Mapped[DateTime] = Column(DateTime(timezone=True), nullable=False)
    # Tags for filtering/categorization (e.g., ["youtube", "shorts"|"long form"], future: "tiktok", "instagram")
    tags: Mapped[list[str]] = Column(ARRAY(String), nullable=False, default=list)
    
    # Additional metadata from YouTube Data API
    category_id: Mapped[str | None] = Column(String, nullable=True)
    video_tags: Mapped[list[str] | None] = Column(ARRAY(String), nullable=True)  # Actual YouTube tags
    default_audio_language: Mapped[str | None] = Column(String, nullable=True)
    default_language: Mapped[str | None] = Column(String, nullable=True)
    
    # Analytics data (from YouTube Analytics API)
    impressions: Mapped[int | None] = Column(Integer, nullable=True)
    click_through_rate: Mapped[float | None] = Column(Numeric(5, 2), nullable=True)
    average_view_duration: Mapped[int | None] = Column(Integer, nullable=True)  # seconds
    average_view_percentage: Mapped[float | None] = Column(Numeric(5, 2), nullable=True)
    watch_time_minutes: Mapped[int | None] = Column(Integer, nullable=True)
    subscribers_gained: Mapped[int | None] = Column(Integer, nullable=True)
    subscribers_lost: Mapped[int | None] = Column(Integer, nullable=True)
    
    # Engagement metrics
    engagement_rate: Mapped[float | None] = Column(Numeric(5, 2), nullable=True)
    shares_count: Mapped[int | None] = Column(Integer, nullable=True)
    
    # Traffic and audience data (JSONB for flexibility)
    traffic_sources: Mapped[dict | None] = Column(JSONB, nullable=True)  # {source: views}
    device_types: Mapped[dict | None] = Column(JSONB, nullable=True)  # {device: views}
    audience_demographics: Mapped[dict | None] = Column(JSONB, nullable=True)  # {age_gender: percentage}
    
    # Performance tracking
    performance_score: Mapped[float | None] = Column(Numeric(5, 2), nullable=True)
    percentile_rank: Mapped[int | None] = Column(Integer, nullable=True)
    is_trending: Mapped[bool] = Column(Boolean, default=False)

    # Relationships
    connection = relationship("YouTubeConnection", back_populates="videos")
    comments = relationship("YouTubeComment", back_populates="video", cascade="all, delete-orphan")


class YouTubeComment(Base):
    __tablename__ = "youtube_comments"
    __table_args__ = (
        UniqueConstraint("comment_id", name="uq_youtube_comments_comment_id"),
    )

    video_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("youtube_videos.id", ondelete="CASCADE"), nullable=False)
    comment_id: Mapped[str] = Column(String, nullable=False)
    author_name: Mapped[str | None] = Column(String, nullable=True)
    author_channel_id: Mapped[str | None] = Column(String, nullable=True)
    content: Mapped[str | None] = Column(Text, nullable=True)
    published_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    like_count: Mapped[int | None] = Column(Integer, nullable=True)
    reply_count: Mapped[int | None] = Column(Integer, nullable=True)
    parent_comment_id: Mapped[str | None] = Column(String, nullable=True)
    is_channel_owner_comment: Mapped[bool] = Column(Boolean, nullable=False, default=False)
    # Local-only flags (not propagated to YouTube):
    hearted_by_owner: Mapped[bool] = Column(Boolean, nullable=False, default=False)
    liked_by_owner: Mapped[bool] = Column(Boolean, nullable=False, default=False)
    
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
    video = relationship("YouTubeVideo", back_populates="comments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id])
    workflow = relationship("Workflow", foreign_keys=[workflow_id])


class OAuthStateToken(Base):
    __tablename__ = "oauth_state_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="uq_oauth_state_tokens_token"),
    )

    token: Mapped[str] = Column(String, nullable=False)
    user_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    used: Mapped[bool] = Column(Boolean, nullable=False, default=False)

    # Relationships
    user = relationship("User", backref="oauth_state_tokens")


class SyncLog(Base):
    __tablename__ = "sync_logs"

    channel_id: Mapped[str] = Column(PGUUID(as_uuid=True), ForeignKey("youtube_connections.id", ondelete="CASCADE"), nullable=False)
    sync_type: Mapped[str | None] = Column(String, nullable=True)
    started_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[DateTime | None] = Column(DateTime(timezone=True), nullable=True)
    status: Mapped[str | None] = Column(String, nullable=True)
    videos_synced: Mapped[int | None] = Column(Integer, nullable=True)
    comments_synced: Mapped[int | None] = Column(Integer, nullable=True)
    error_message: Mapped[str | None] = Column(Text, nullable=True)

    # Relationships
    connection = relationship("YouTubeConnection", back_populates="sync_logs")
