"""add automation_rules table for user-defined automation

Revision ID: 20250901_1230
Revises: 20250901_1220
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250901_1230"
down_revision = "20250901_1220"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "automation_rules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "trigger_conditions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "actions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("response_limit_per_run", sa.Integer(), nullable=True),
        sa.Column("require_approval", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["channel_id"], ["youtube_connections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Helpful indexes for lookups and ordering
    op.create_index("idx_automation_rules_channel", "automation_rules", ["channel_id"])
    op.create_index("idx_automation_rules_priority", "automation_rules", ["priority"])
    op.create_index(
        "idx_automation_rules_channel_enabled",
        "automation_rules",
        ["channel_id", "enabled"],
    )


def downgrade() -> None:
    op.drop_index("idx_automation_rules_channel_enabled", table_name="automation_rules")
    op.drop_index("idx_automation_rules_priority", table_name="automation_rules")
    op.drop_index("idx_automation_rules_channel", table_name="automation_rules")
    op.drop_table("automation_rules")
