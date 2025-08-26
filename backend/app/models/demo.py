"""Demo mode models for accounts, content, and comments."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class DemoAccount(Base):
    """Store demo account configurations"""

    __tablename__ = "demo_accounts"

    email = Column(String, unique=True)
    persona_type = Column(String)  # creator, agency_creators, agency_businesses
    platform_data = Column(JSONB, default=dict)
    content_schedule = Column(JSONB, default=dict)
    engagement_patterns = Column(JSONB, default=dict)

    # relationships
    contents = relationship(
        "DemoContent", back_populates="account", cascade="all, delete-orphan"
    )


class DemoContent(Base):
    """Store demo content pieces (posts/videos)"""

    __tablename__ = "demo_content"

    account_id = Column(PGUUID(as_uuid=True), ForeignKey("demo_accounts.id"))
    platform = Column(String)
    content_type = Column(String)  # video, post, short
    title = Column(String)
    thumbnail_url = Column(String)
    metrics = Column(JSONB, default=dict)  # views, likes, shares
    published_at = Column(DateTime(timezone=True))

    # relationships
    account = relationship("DemoAccount", back_populates="contents")
    comments = relationship(
        "DemoComment", back_populates="content", cascade="all, delete-orphan"
    )


class DemoComment(Base):
    """Store demo comments"""

    __tablename__ = "demo_comments"

    content_id = Column(PGUUID(as_uuid=True), ForeignKey("demo_content.id"))
    author_name = Column(String)
    author_avatar = Column(String)
    comment_text = Column(Text)
    sentiment = Column(String)
    is_verified = Column(Boolean, default=False)
    likes_count = Column(Integer, default=0)
    replies_count = Column(Integer, default=0)
    published_at = Column(DateTime(timezone=True))
    response = Column(Text)  # AI or manual response
    response_at = Column(DateTime(timezone=True))

    # relationships
    content = relationship("DemoContent", back_populates="comments")
