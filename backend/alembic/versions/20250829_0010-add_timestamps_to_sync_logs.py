"""add timestamps to sync_logs

Revision ID: 20250829_0010
Revises: 20250829_0001
Create Date: 2025-08-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250829_0010"
down_revision = "20250829_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add created_at and updated_at to sync_logs to align with Base model
    op.add_column(
        "sync_logs",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.add_column(
        "sync_logs",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("sync_logs", "updated_at")
    op.drop_column("sync_logs", "created_at")
