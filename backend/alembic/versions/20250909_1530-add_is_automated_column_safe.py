"""conditionally add is_automated column to rule_response_metrics

Revision ID: 20250909_1530
Revises: 20250909_1200
Create Date: 2025-09-09

Adds the `is_automated` boolean column with default FALSE if the table exists and the column
is missing. Safe to run repeatedly.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20250909_1530"
down_revision = "20250909_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:  # noqa: D401
    conn = op.get_bind()
    # Check table exists
    exists = conn.execute(text("""
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rule_response_metrics'
    """)).fetchone()
    if not exists:
        return  # earlier migration should create it; nothing to do
    # Check column existence
    col_exists = conn.execute(text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rule_response_metrics' AND column_name = 'is_automated'
    """ )).fetchone()
    if col_exists:
        return
    op.add_column("rule_response_metrics", sa.Column("is_automated", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")))
    # Optional index (if earlier migration not applied for some reason)
    try:
        op.create_index("ix_rrm_auto", "rule_response_metrics", ["is_automated"])
    except Exception:
        pass


def downgrade() -> None:  # noqa: D401
    # Best-effort removal (only if column exists)
    conn = op.get_bind()
    col_exists = conn.execute(text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rule_response_metrics' AND column_name = 'is_automated'
    """ )).fetchone()
    if not col_exists:
        return
    try:
        op.drop_index("ix_rrm_auto", table_name="rule_response_metrics")
    except Exception:
        pass
    op.drop_column("rule_response_metrics", "is_automated")
