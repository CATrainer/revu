"""add comments_queue table for YouTube AI processing

Revision ID: 20250901_1200
Revises: 20250829_1805
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250901_1200"
down_revision = "20250829_1805"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type for status
    status_enum = sa.Enum(
        "pending",
        "processing",
        "completed",
        "failed",
        "ignored",
        name="comments_queue_status",
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    # Create table
    op.create_table(
        "comments_queue",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("comment_id", sa.String(), nullable=False),
        sa.Column("author_name", sa.String(), nullable=True),
        sa.Column("author_channel_id", sa.String(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
    sa.Column("status", status_enum, nullable=False, server_default=sa.text("'pending'")),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["channel_id"], ["youtube_connections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["video_id"], ["youtube_videos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id", name="uq_comments_queue_comment_id"),
    )

    # Indexes for performance
    op.create_index(
        "idx_comments_queue_status",
        "comments_queue",
        ["status"],
    )
    op.create_index(
        "idx_comments_queue_priority",
        "comments_queue",
        ["priority"],
    )
    op.create_index(
        "idx_comments_queue_status_priority",
        "comments_queue",
        ["status", "priority"],
    )


def downgrade() -> None:
    # Drop indexes and table first
    op.drop_index("idx_comments_queue_status_priority", table_name="comments_queue")
    op.drop_index("idx_comments_queue_priority", table_name="comments_queue")
    op.drop_index("idx_comments_queue_status", table_name="comments_queue")
    op.drop_table("comments_queue")

    # Then drop enum type
    status_enum = sa.Enum(
        "pending",
        "processing",
        "completed",
        "failed",
        "ignored",
        name="comments_queue_status",
    )
    status_enum.drop(op.get_bind(), checkfirst=True)
