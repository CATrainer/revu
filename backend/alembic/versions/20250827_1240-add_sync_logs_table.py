"""add sync_logs table

Revision ID: 20250827_1240
Revises: 20250827_1230
Create Date: 2025-08-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250827_1240"
down_revision = "20250827_1230"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sync_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sync_type", sa.String(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("videos_synced", sa.Integer(), nullable=True),
        sa.Column("comments_synced", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["channel_id"], ["youtube_connections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "idx_sync_logs_channel",
        "sync_logs",
        ["channel_id", "started_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_sync_logs_channel", table_name="sync_logs")
    op.drop_table("sync_logs")
