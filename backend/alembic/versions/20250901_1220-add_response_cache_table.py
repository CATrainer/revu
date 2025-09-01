"""add response_cache table to cache AI responses

Revision ID: 20250901_1220
Revises: 20250901_1210
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250901_1220"
down_revision = "20250901_1210"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "response_cache",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("fingerprint", sa.String(length=128), nullable=False),
        sa.Column("response_template", sa.Text(), nullable=False),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "idx_response_cache_fingerprint",
        "response_cache",
        ["fingerprint"],
    )


def downgrade() -> None:
    op.drop_index("idx_response_cache_fingerprint", table_name="response_cache")
    op.drop_table("response_cache")
