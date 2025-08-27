"""add youtube_videos table

Revision ID: 20250827_1210
Revises: 20250827_1200
Create Date: 2025-08-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250827_1210"
down_revision = "20250827_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "youtube_videos",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "channel_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            comment="FK to youtube_connections.id",
        ),
        sa.Column("video_id", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("view_count", sa.BigInteger(), nullable=True),
        sa.Column("like_count", sa.BigInteger(), nullable=True),
        sa.Column("comment_count", sa.BigInteger(), nullable=True),
        sa.Column("duration", sa.String(), nullable=True),
        sa.Column(
            "last_fetched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["channel_id"], ["youtube_connections.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("video_id"),
    )

    # Helpful indexes
    op.create_index(
        "idx_youtube_videos_channel",
        "youtube_videos",
        ["channel_id", "published_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_youtube_videos_channel", table_name="youtube_videos")
    op.drop_table("youtube_videos")
