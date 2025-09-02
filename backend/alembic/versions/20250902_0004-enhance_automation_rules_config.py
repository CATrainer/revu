"""
Enhance automation_rules with additional JSONB configuration fields.

Adds the following columns (keeps existing fields for backwards compatibility):
- scope (JSONB): video targeting configuration
- conditions (JSONB): complex trigger conditions
- timing (JSONB): schedules and delays
- limits (JSONB): various limit configurations
- action (JSONB): detailed action configuration
- intelligence_config (JSONB): learning and optimization settings
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250902_0004"
down_revision = "20250902_0003"
branch_labels = None
depends_on = None


NEW_COLUMNS = [
    ("scope", postgresql.JSONB(astext_type=sa.Text()), "'{}'::jsonb"),
    ("conditions", postgresql.JSONB(astext_type=sa.Text()), "'{}'::jsonb"),
    ("timing", postgresql.JSONB(astext_type=sa.Text()), "'{}'::jsonb"),
    ("limits", postgresql.JSONB(astext_type=sa.Text()), "'{}'::jsonb"),
    ("action", postgresql.JSONB(astext_type=sa.Text()), "'{}'::jsonb"),
    ("intelligence_config", postgresql.JSONB(astext_type=sa.Text()), "'{}'::jsonb"),
]


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("automation_rules"):
        existing_cols = {c["name"] for c in inspector.get_columns("automation_rules")}
        for name, coltype, default_expr in NEW_COLUMNS:
            if name not in existing_cols:
                op.add_column(
                    "automation_rules",
                    sa.Column(name, coltype, nullable=True, server_default=sa.text(default_expr)),
                )
    else:
        # Table missing (unusual if earlier migrations ran); create minimal table with new columns.
        op.create_table(
            "automation_rules",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                server_default=sa.text("gen_random_uuid()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        # then add columns
        for name, coltype, default_expr in NEW_COLUMNS:
            op.add_column(
                "automation_rules",
                sa.Column(name, coltype, nullable=True, server_default=sa.text(default_expr)),
            )



def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("automation_rules"):
        return

    existing_cols = {c["name"] for c in inspector.get_columns("automation_rules")}
    # Drop in reverse order to be safe
    for name, _, _ in reversed(NEW_COLUMNS):
        if name in existing_cols:
            try:
                op.drop_column("automation_rules", name)
            except Exception:
                # If the column doesn't exist or is used by constraints not managed here, ignore
                pass
