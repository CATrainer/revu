"""add youtube_connections table

Revision ID: 20250827_1200
Revises: 20250826_1200
Create Date: 2025-08-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250827_1200"
down_revision = "20250826_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "youtube_connections",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel_id", sa.String(), nullable=True),
        sa.Column("channel_name", sa.String(), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "connection_status",
            sa.String(),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Optional indexes for common lookups
    op.create_index("idx_youtube_connections_user", "youtube_connections", ["user_id"])
    op.create_index(
        "idx_youtube_connections_channel",
        "youtube_connections",
        ["channel_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_youtube_connections_channel", table_name="youtube_connections")
    op.drop_index("idx_youtube_connections_user", table_name="youtube_connections")
    op.drop_table("youtube_connections")
