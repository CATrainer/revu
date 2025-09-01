"""add performance indexes and helpful views

Revision ID: 20250901_1325
Revises: 20250901_1310
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20250901_1325"
down_revision = "20250901_1310"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create indexes conditionally using IF NOT EXISTS
    op.execute("CREATE INDEX IF NOT EXISTS idx_cq_channel ON comments_queue (channel_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_cq_created_at ON comments_queue (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_cq_channel_status ON comments_queue (channel_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_cq_next_attempt_at ON comments_queue (next_attempt_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_cq_class_created ON comments_queue (classification, created_at)")

    # Automation rules queries use channel_id, enabled, priority
    op.execute("CREATE INDEX IF NOT EXISTS idx_auto_channel_enabled_prio ON automation_rules (channel_id, enabled, priority DESC)")

    # Polling config frequently filtered by channel and enabled
    op.execute("CREATE INDEX IF NOT EXISTS idx_polling_channel ON polling_config (channel_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_polling_enabled ON polling_config (polling_enabled)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_polling_last_polled ON polling_config (last_polled_at)")

    # Videos: list latest by channel
    op.execute("CREATE INDEX IF NOT EXISTS idx_videos_channel_published ON youtube_videos (channel_id, published_at DESC)")

    # Comments: ensure common filter on video_id, published_at is indexed (composite may already exist)
    op.execute("CREATE INDEX IF NOT EXISTS idx_comments_video_published ON youtube_comments (video_id, published_at)")

    # Views for convenience
    # 1) v_channel_comments: join comments with videos for channel-wide feed
    op.execute(
        """
        CREATE OR REPLACE VIEW v_channel_comments AS
        SELECT c.*, v.id AS video_uuid, v.video_id AS youtube_video_id, v.title AS video_title,
               v.thumbnail_url, v.published_at AS video_published_at, v.view_count, v.like_count AS video_like_count,
               v.comment_count AS video_comment_count
        FROM youtube_comments c
        JOIN youtube_videos v ON v.id = c.video_id
        """
    )

    # 2) v_api_usage_daily: daily rollup of api_usage_log
    op.execute(
        """
        CREATE OR REPLACE VIEW v_api_usage_daily AS
        SELECT date_trunc('day', created_at) AS day,
               COUNT(*) AS calls,
               COALESCE(SUM(estimated_cost_usd), 0) AS cost,
               AVG(NULLIF(latency_ms, 0)) AS avg_latency
        FROM api_usage_log
        GROUP BY 1
        """
    )


def downgrade() -> None:
    # Drop views
    op.execute("DROP VIEW IF EXISTS v_api_usage_daily")
    op.execute("DROP VIEW IF EXISTS v_channel_comments")

    # Drop indexes
    op.execute("DROP INDEX IF EXISTS idx_comments_video_published")
    op.execute("DROP INDEX IF EXISTS idx_videos_channel_published")
    op.execute("DROP INDEX IF EXISTS idx_polling_last_polled")
    op.execute("DROP INDEX IF EXISTS idx_polling_enabled")
    op.execute("DROP INDEX IF EXISTS idx_polling_channel")
    op.execute("DROP INDEX IF EXISTS idx_auto_channel_enabled_prio")
    op.execute("DROP INDEX IF EXISTS idx_cq_class_created")
    op.execute("DROP INDEX IF EXISTS idx_cq_next_attempt_at")
    op.execute("DROP INDEX IF EXISTS idx_cq_channel_status")
    op.execute("DROP INDEX IF EXISTS idx_cq_created_at")
    op.execute("DROP INDEX IF EXISTS idx_cq_channel")
