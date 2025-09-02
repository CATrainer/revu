"""
Add rule_executions table to track each rule execution event.

- Links to rule_id and comment_id
- Video ID where rule was triggered
- Timestamp of trigger
- JSONB field for conditions that matched
- Action taken (respond/delete/flag)
- AB test variant used if applicable
- User context JSONB for cross-video intelligence
- Execution time in milliseconds
- Indexes on rule_id and triggered_at
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250902_0001-add_rule_executions_table"
down_revision = "20250901_1335-add_comments_queue_batch_and_stale_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rule_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
    sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("comment_id", sa.String(length=128), nullable=False),
        sa.Column("video_id", sa.String(length=128), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("action", sa.String(length=32), nullable=False),  # respond | delete | flag
        sa.Column("ab_variant", sa.String(length=32), nullable=True),
        sa.Column("user_context", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
    )
    # Optional FK to automation_rules if table exists; use deferrable pattern to avoid deploy issues
    try:
        op.create_foreign_key(
            "fk_rule_executions_rule",
            "rule_executions",
            "automation_rules",
            ["rule_id"],
            ["id"],
            ondelete="SET NULL",
        )
    except Exception:
        # if automation_rules not present in this environment, skip FK
        pass

    # Indexes for performance
    op.create_index("ix_rule_executions_rule_id", "rule_executions", ["rule_id"], unique=False)
    op.create_index("ix_rule_executions_triggered_at", "rule_executions", ["triggered_at"], unique=False)


def downgrade() -> None:
    try:
        op.drop_constraint("fk_rule_executions_rule", "rule_executions", type_="foreignkey")
    except Exception:
        pass
    op.drop_index("ix_rule_executions_triggered_at", table_name="rule_executions")
    op.drop_index("ix_rule_executions_rule_id", table_name="rule_executions")
    op.drop_table("rule_executions")
