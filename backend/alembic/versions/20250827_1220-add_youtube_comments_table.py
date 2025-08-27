"""add youtube_comments table

Revision ID: 20250827_1220
Revises: 20250827_1210
Create Date: 2025-08-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250827_1220"
down_revision = "20250827_1210"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "youtube_comments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("comment_id", sa.String(), nullable=False),
        sa.Column("author_name", sa.String(), nullable=True),
        sa.Column("author_channel_id", sa.String(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("like_count", sa.Integer(), nullable=True),
        sa.Column("reply_count", sa.Integer(), nullable=True),
        sa.Column("parent_comment_id", sa.String(), nullable=True),
        sa.Column(
            "is_channel_owner_comment",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.ForeignKeyConstraint(["video_id"], ["youtube_videos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id"),
    )

    op.create_index(
        "idx_youtube_comments_video",
        "youtube_comments",
        ["video_id", "published_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_youtube_comments_video", table_name="youtube_comments")
    op.drop_table("youtube_comments")
