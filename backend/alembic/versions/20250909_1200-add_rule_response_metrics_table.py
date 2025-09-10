"""add rule_response_metrics table

Revision ID: 20250909_1200
Revises: 20250905_1210
Create Date: 2025-09-09

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250909_1200"
down_revision = "20250905_1210"
branch_labels = None
depends_on = None


def upgrade() -> None:  # noqa: D401
    op.create_table(
        "rule_response_metrics",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("response_id", sa.String(), nullable=True, index=True),
        sa.Column("is_automated", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("engagement_metrics", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_rrm_rule", "rule_response_metrics", ["rule_id"])  # rule lookup
    op.create_index("ix_rrm_created", "rule_response_metrics", ["created_at"])  # time range queries
    op.create_index("ix_rrm_auto", "rule_response_metrics", ["is_automated"])  # automated vs manual splits
    # Composite for frequent window + automated filter grouping
    op.create_index("ix_rrm_auto_created", "rule_response_metrics", ["is_automated", "created_at"])  # optional perf


def downgrade() -> None:  # noqa: D401
    op.drop_index("ix_rrm_auto_created", table_name="rule_response_metrics")
    op.drop_index("ix_rrm_auto", table_name="rule_response_metrics")
    op.drop_index("ix_rrm_created", table_name="rule_response_metrics")
    op.drop_index("ix_rrm_rule", table_name="rule_response_metrics")
    op.drop_table("rule_response_metrics")
