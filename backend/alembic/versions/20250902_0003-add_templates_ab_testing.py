"""
Add tables for templates and A/B testing results.

1) response_templates
   - rule_id (uuid)
   - template_text (text)
   - variables (jsonb)
   - performance_score (double precision)
   - usage_count (int)

2) ab_test_results
   - rule_id (uuid)
   - variant_id (varchar)
   - comment_id (varchar)
   - engagement_metrics (jsonb)

3) automation_learning
   - original_response (text)
   - edited_response (text)
   - edit_type (varchar)
   - feedback_incorporated (boolean)

Indexes: rule_id on response_templates and ab_test_results.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250902_0003"
down_revision = "20250902_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # response_templates
    op.create_table(
        "response_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("template_text", sa.Text(), nullable=False),
        sa.Column("variables", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("performance_score", sa.Float(), nullable=True),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    try:
        op.create_foreign_key(
            "fk_response_templates_rule",
            "response_templates",
            "automation_rules",
            ["rule_id"],
            ["id"],
            ondelete="SET NULL",
        )
    except Exception:
        pass
    op.create_index("ix_response_templates_rule_id", "response_templates", ["rule_id"], unique=False)

    # ab_test_results
    op.create_table(
        "ab_test_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("variant_id", sa.String(length=64), nullable=False),
        sa.Column("comment_id", sa.String(length=128), nullable=True),
        sa.Column("engagement_metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    try:
        op.create_foreign_key(
            "fk_ab_test_results_rule",
            "ab_test_results",
            "automation_rules",
            ["rule_id"],
            ["id"],
            ondelete="SET NULL",
        )
    except Exception:
        pass
    op.create_index("ix_ab_test_results_rule_id", "ab_test_results", ["rule_id"], unique=False)

    # automation_learning
    op.create_table(
        "automation_learning",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("original_response", sa.Text(), nullable=False),
        sa.Column("edited_response", sa.Text(), nullable=True),
        sa.Column("edit_type", sa.String(length=64), nullable=True),
        sa.Column("feedback_incorporated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("automation_learning")
    try:
        op.drop_constraint("fk_ab_test_results_rule", "ab_test_results", type_="foreignkey")
    except Exception:
        pass
    op.drop_index("ix_ab_test_results_rule_id", table_name="ab_test_results")
    op.drop_table("ab_test_results")
    try:
        op.drop_constraint("fk_response_templates_rule", "response_templates", type_="foreignkey")
    except Exception:
        pass
    op.drop_index("ix_response_templates_rule_id", table_name="response_templates")
    op.drop_table("response_templates")
