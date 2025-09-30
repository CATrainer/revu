"""add AI intelligence and social data tables

Revision ID: 20250930_1900
Revises: 20250930_1850
Create Date: 2025-09-30

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250930_1900"
down_revision = "20250930_1850"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add AI intelligence and social media data collection tables."""
    
    # Conversation summaries
    op.create_table(
        "ai_conversation_summaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("message_count", sa.Integer(), nullable=False),
        sa.Column("key_topics", postgresql.JSONB(), nullable=True),
        sa.Column("action_items", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_ai_summaries_session", "ai_conversation_summaries", ["session_id"])
    
    # Suggested follow-ups
    op.create_table(
        "ai_suggested_followups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_chat_messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("suggestions", postgresql.JSONB(), nullable=False, comment="Array of suggested follow-up questions"),
        sa.Column("selected_suggestion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_ai_followups_message", "ai_suggested_followups", ["message_id"])
    
    # Response quality ratings
    op.create_table(
        "ai_response_quality",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_chat_messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.String(20), nullable=True, comment="helpful, not_helpful, amazing"),
        sa.Column("feedback_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_check_constraint(
        "ck_ai_response_quality_rating_valid",
        "ai_response_quality",
        "rating IN ('helpful', 'not_helpful', 'amazing')"
    )
    op.create_index("idx_ai_quality_message", "ai_response_quality", ["message_id"])
    op.create_index("idx_ai_quality_user_rating", "ai_response_quality", ["user_id", "rating"])
    
    # User AI preferences
    op.create_table(
        "user_ai_preferences",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("custom_instructions", sa.Text(), nullable=True),
        sa.Column("response_style", sa.String(50), nullable=True, comment="concise, detailed, bullet_points"),
        sa.Column("expertise_level", sa.String(50), nullable=True, comment="beginner, intermediate, expert"),
        sa.Column("tone", sa.String(50), nullable=True, comment="professional, casual, friendly"),
        sa.Column("preferences", postgresql.JSONB(), nullable=True, comment="Additional custom preferences"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    
    # Content performance tracking (our competitive edge)
    op.create_table(
        "user_content_performance",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False, comment="instagram, youtube, tiktok"),
        sa.Column("post_id", sa.String(255), nullable=False),
        sa.Column("post_type", sa.String(50), nullable=True, comment="reel, post, story, video, short"),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("engagement_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("views", sa.Integer(), nullable=True),
        sa.Column("likes", sa.Integer(), nullable=True),
        sa.Column("comments", sa.Integer(), nullable=True),
        sa.Column("shares", sa.Integer(), nullable=True),
        sa.Column("saves", sa.Integer(), nullable=True),
        sa.Column("metrics", postgresql.JSONB(), nullable=True, comment="Platform-specific additional metrics"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("user_id", "platform", "post_id", name="uq_user_platform_post"),
    )
    op.create_index("idx_content_perf_user_platform", "user_content_performance", ["user_id", "platform"])
    op.create_index("idx_content_perf_posted_at", "user_content_performance", ["posted_at"])
    op.create_index("idx_content_perf_engagement", "user_content_performance", ["engagement_rate"])
    
    # Audience insights
    op.create_table(
        "user_audience_insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("follower_count", sa.Integer(), nullable=True),
        sa.Column("demographics", postgresql.JSONB(), nullable=True, comment="Age, gender, location breakdown"),
        sa.Column("active_hours", postgresql.JSONB(), nullable=True, comment="When followers are most active"),
        sa.Column("interests", postgresql.JSONB(), nullable=True, comment="Follower interests/topics"),
        sa.Column("growth_metrics", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("user_id", "platform", "snapshot_date", name="uq_user_platform_snapshot"),
    )
    op.create_index("idx_audience_insights_user", "user_audience_insights", ["user_id", "platform"])
    
    # Conversation templates
    op.create_table(
        "content_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), nullable=True, comment="content_strategy, caption_writing, analysis"),
        sa.Column("initial_prompt", sa.Text(), nullable=False),
        sa.Column("system_instructions", sa.Text(), nullable=True),
        sa.Column("example_outputs", postgresql.JSONB(), nullable=True),
        sa.Column("usage_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_templates_category", "content_templates", ["category", "is_active"])


def downgrade() -> None:
    """Remove AI intelligence and social data tables."""
    
    op.drop_index("idx_templates_category", table_name="content_templates")
    op.drop_table("content_templates")
    
    op.drop_index("idx_audience_insights_user", table_name="user_audience_insights")
    op.drop_table("user_audience_insights")
    
    op.drop_index("idx_content_perf_engagement", table_name="user_content_performance")
    op.drop_index("idx_content_perf_posted_at", table_name="user_content_performance")
    op.drop_index("idx_content_perf_user_platform", table_name="user_content_performance")
    op.drop_table("user_content_performance")
    
    op.drop_table("user_ai_preferences")
    
    op.drop_index("idx_ai_quality_user_rating", table_name="ai_response_quality")
    op.drop_index("idx_ai_quality_message", table_name="ai_response_quality")
    op.drop_constraint("ck_ai_response_quality_rating_valid", "ai_response_quality")
    op.drop_table("ai_response_quality")
    
    op.drop_index("idx_ai_followups_message", table_name="ai_suggested_followups")
    op.drop_table("ai_suggested_followups")
    
    op.drop_index("idx_ai_summaries_session", table_name="ai_conversation_summaries")
    op.drop_table("ai_conversation_summaries")
