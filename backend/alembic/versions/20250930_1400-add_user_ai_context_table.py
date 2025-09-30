"""add user_ai_context table for personalized AI assistance

Revision ID: 20250930_1400
Revises: (check latest)
Create Date: 2025-09-30

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250930_1400"
down_revision = "20250926_191046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create user_ai_context table for storing personalized AI context."""
    
    op.create_table(
        "user_ai_context",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        
        # Auto-detected context from YouTube/platforms
        sa.Column("channel_name", sa.String(255), nullable=True, comment="Primary channel/account name"),
        sa.Column("niche", sa.String(255), nullable=True, comment="Content niche (e.g., Tech Reviews, Gaming, Fitness)"),
        sa.Column("content_type", sa.String(100), nullable=True, comment="Primary content format (e.g., Long-form, Shorts, Live)"),
        sa.Column("avg_video_length", sa.Integer(), nullable=True, comment="Average video length in seconds"),
        sa.Column("upload_frequency", sa.String(100), nullable=True, comment="Upload schedule (e.g., Daily, 3x/week)"),
        sa.Column("primary_platform", sa.String(50), nullable=True, comment="Main platform (YouTube, TikTok, etc.)"),
        
        # Audience insights
        sa.Column("subscriber_count", sa.Integer(), nullable=True),
        sa.Column("avg_views", sa.Integer(), nullable=True, comment="Average views per video"),
        sa.Column("engagement_rate", sa.Float(), nullable=True, comment="Average engagement rate"),
        sa.Column("primary_audience_age", sa.String(50), nullable=True, comment="e.g., 18-24, 25-34"),
        sa.Column("primary_audience_geo", sa.String(100), nullable=True, comment="Primary geographic location"),
        
        # Content strategy
        sa.Column("top_performing_topics", postgresql.JSONB(), nullable=True, comment="Array of top performing topics/themes"),
        sa.Column("content_pillars", postgresql.JSONB(), nullable=True, comment="Main content categories"),
        sa.Column("posting_times", postgresql.JSONB(), nullable=True, comment="Best performing posting times"),
        
        # User-provided overrides/additions
        sa.Column("goals", sa.Text(), nullable=True, comment="User's content goals"),
        sa.Column("target_audience", sa.Text(), nullable=True, comment="User's description of target audience"),
        sa.Column("brand_voice", sa.String(255), nullable=True, comment="Brand voice/tone (e.g., Casual, Professional)"),
        sa.Column("custom_notes", sa.Text(), nullable=True, comment="Additional context from user"),
        
        # Metadata
        sa.Column("last_auto_update", sa.DateTime(timezone=True), nullable=True, comment="Last time context was auto-updated from platforms"),
        sa.Column("last_user_edit", sa.DateTime(timezone=True), nullable=True, comment="Last time user manually edited context"),
        sa.Column("data_sources", postgresql.JSONB(), nullable=True, comment="Sources used to build context (youtube, tiktok, etc.)"),
        
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_ai_context_user_id"),
    )
    
    # Create index on user_id for faster lookups
    op.create_index(
        "idx_user_ai_context_user_id",
        "user_ai_context",
        ["user_id"],
    )


def downgrade() -> None:
    """Drop user_ai_context table."""
    op.drop_index("idx_user_ai_context_user_id", table_name="user_ai_context")
    op.drop_table("user_ai_context")
