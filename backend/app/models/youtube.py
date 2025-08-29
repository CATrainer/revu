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
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.dialects.postgresql import ARRAY
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

    # Relationships
    video = relationship("YouTubeVideo", back_populates="comments")


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
