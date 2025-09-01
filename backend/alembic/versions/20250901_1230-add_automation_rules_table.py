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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    table_names = inspector.get_table_names()
    table_exists = "automation_rules" in table_names

    # Create table if it doesn't already exist (idempotent)
    if not table_exists:
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
    else:
        # Ensure required columns exist when table pre-exists
        existing_cols = {c["name"] for c in inspector.get_columns("automation_rules")}
        # channel_id
        if "channel_id" not in existing_cols:
            op.add_column(
                "automation_rules",
                sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=True),
            )
        # name
        if "name" not in existing_cols:
            op.add_column(
                "automation_rules",
                sa.Column("name", sa.String(length=255), nullable=True),
            )
        # enabled
        if "enabled" not in existing_cols:
            op.add_column(
                "automation_rules",
                sa.Column("enabled", sa.Boolean(), nullable=True, server_default=sa.true()),
            )
        # trigger_conditions
        if "trigger_conditions" not in existing_cols:
            op.add_column(
                "automation_rules",
                sa.Column(
                    "trigger_conditions",
                    postgresql.JSONB(astext_type=sa.Text()),
                    nullable=True,
                    server_default=sa.text("'{}'::jsonb"),
                ),
            )
        # actions
        if "actions" not in existing_cols:
            op.add_column(
                "automation_rules",
                sa.Column(
                    "actions",
                    postgresql.JSONB(astext_type=sa.Text()),
                    nullable=True,
                    server_default=sa.text("'[]'::jsonb"),
                ),
            )
        # response_limit_per_run
        if "response_limit_per_run" not in existing_cols:
            op.add_column(
                "automation_rules",
                sa.Column("response_limit_per_run", sa.Integer(), nullable=True),
            )
        # require_approval
        if "require_approval" not in existing_cols:
            op.add_column(
                "automation_rules",
                sa.Column("require_approval", sa.Boolean(), nullable=True, server_default=sa.false()),
            )
        # priority
        if "priority" not in existing_cols:
            op.add_column(
                "automation_rules",
                sa.Column("priority", sa.Integer(), nullable=True, server_default=sa.text("0")),
            )

        # Ensure FK exists if channel_id present
        existing_fks = inspector.get_foreign_keys("automation_rules")
        has_channel_fk = any(
            ("channel_id" in fk.get("constrained_columns", [])) and fk.get("referred_table") == "youtube_connections"
            for fk in existing_fks
        )
        if ("channel_id" in {c["name"] for c in inspector.get_columns("automation_rules")}) and not has_channel_fk:
            op.create_foreign_key(
                "fk_automation_rules_channel_id_youtube_connections",
                "automation_rules",
                "youtube_connections",
                ["channel_id"],
                ["id"],
                ondelete="CASCADE",
            )

    # Helpful indexes for lookups and ordering (idempotent)
    # Only create if columns exist
    idx_names = {idx["name"] for idx in inspector.get_indexes("automation_rules")}
    cols_now = {c["name"] for c in inspector.get_columns("automation_rules")}
    if {"channel_id"}.issubset(cols_now) and "idx_automation_rules_channel" not in idx_names:
        op.create_index("idx_automation_rules_channel", "automation_rules", ["channel_id"])
    if {"priority"}.issubset(cols_now) and "idx_automation_rules_priority" not in idx_names:
        op.create_index("idx_automation_rules_priority", "automation_rules", ["priority"])
    if {"channel_id", "enabled"}.issubset(cols_now) and "idx_automation_rules_channel_enabled" not in idx_names:
        op.create_index(
            "idx_automation_rules_channel_enabled",
            "automation_rules",
            ["channel_id", "enabled"],
        )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_automation_rules_channel_enabled")
    op.execute("DROP INDEX IF EXISTS idx_automation_rules_priority")
    op.execute("DROP INDEX IF EXISTS idx_automation_rules_channel")
    op.execute("DROP TABLE IF EXISTS automation_rules")
