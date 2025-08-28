"""add updated_at to youtube_connections

Revision ID: 20250828_2300
Revises: 20250828_2110
Create Date: 2025-08-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250828_2300"
down_revision = "20250828_2110"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing updated_at column to youtube_connections
    op.add_column(
        "youtube_connections",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("youtube_connections", "updated_at")
