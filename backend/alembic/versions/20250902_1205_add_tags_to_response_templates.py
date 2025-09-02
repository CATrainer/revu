"""
Add tags column to response_templates (TEXT[]), if not present.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250902_1205"
down_revision = "20250902_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("response_templates"):
        cols = {c.get("name") for c in inspector.get_columns("response_templates")}
        if "tags" not in cols:
            # Add nullable column without default to avoid rewrite on large tables
            op.add_column("response_templates", sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("response_templates"):
        cols = {c.get("name") for c in inspector.get_columns("response_templates")}
        if "tags" in cols:
            try:
                op.drop_column("response_templates", "tags")
            except Exception:
                pass
