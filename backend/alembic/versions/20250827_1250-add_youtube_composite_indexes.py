"""add composite indexes for youtube tables

Revision ID: 20250827_1250
Revises: 20250827_1240
Create Date: 2025-08-27

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250827_1250"
down_revision = "20250827_1240"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # youtube_connections (user_id, channel_id)
    op.create_index(
        "idx_youtube_connections_user_channel",
        "youtube_connections",
        ["user_id", "channel_id"],
    )

    # youtube_videos (channel_id, video_id)
    op.create_index(
        "idx_youtube_videos_channel_video",
        "youtube_videos",
        ["channel_id", "video_id"],
    )

    # youtube_comments (video_id, comment_id, published_at)
    op.create_index(
        "idx_youtube_comments_video_comment_published",
        "youtube_comments",
        ["video_id", "comment_id", "published_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "idx_youtube_comments_video_comment_published",
        table_name="youtube_comments",
    )
    op.drop_index("idx_youtube_videos_channel_video", table_name="youtube_videos")
    op.drop_index(
        "idx_youtube_connections_user_channel",
        table_name="youtube_connections",
    )
