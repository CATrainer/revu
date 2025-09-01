"""add ai_responses table for storing AI-generated replies

Revision ID: 20250901_1210
Revises: 20250901_1200
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250901_1210"
down_revision = "20250901_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_responses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("queue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("response_text", sa.Text(), nullable=False),
        # Safety validation tracking
        sa.Column("passed_safety", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("safety_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("safety_notes", sa.Text(), nullable=True),
        # Approval and posting timestamps
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        # Created timestamp
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["queue_id"], ["comments_queue.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    # Useful index to find responses by queue/comment quickly
    op.create_index("idx_ai_responses_queue", "ai_responses", ["queue_id"])


def downgrade() -> None:
    op.drop_index("idx_ai_responses_queue", table_name="ai_responses")
    op.drop_table("ai_responses")
