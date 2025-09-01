"""add reliability tables and columns (error_logs, dead_letter, queue retry fields)

Revision ID: 20250901_1310
Revises: 20250901_1255
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250901_1310"
down_revision = "20250901_1255"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add reliability columns to comments_queue if they don't exist
    # Use SQL blocks to conditionally add columns for idempotence across deployments
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='retry_count'
            ) THEN
                ALTER TABLE comments_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='failure_count'
            ) THEN
                ALTER TABLE comments_queue ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='last_error_code'
            ) THEN
                ALTER TABLE comments_queue ADD COLUMN last_error_code INTEGER NULL;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='last_error_message'
            ) THEN
                ALTER TABLE comments_queue ADD COLUMN last_error_message TEXT NULL;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='last_error_at'
            ) THEN
                ALTER TABLE comments_queue ADD COLUMN last_error_at TIMESTAMPTZ NULL;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='next_attempt_at'
            ) THEN
                ALTER TABLE comments_queue ADD COLUMN next_attempt_at TIMESTAMPTZ NULL;
            END IF;
        END
        $$;
        """
    )

    # Create error_logs table
    op.create_table(
        "error_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("service_name", sa.String(length=64), nullable=False),
        sa.Column("operation", sa.String(length=128), nullable=True),
        sa.Column("error_code", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("stack", sa.Text(), nullable=True),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_error_logs_created_at", "error_logs", ["created_at"])
    op.create_index("idx_error_logs_service", "error_logs", ["service_name", "created_at"])
    op.create_index("idx_error_logs_code", "error_logs", ["error_code", "created_at"])

    # Create comments_dead_letter table
    op.create_table(
        "comments_dead_letter",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("queue_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("comment_id", sa.String(), nullable=True),
        sa.Column("reason", sa.String(length=128), nullable=True),
        sa.Column("error_code", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["queue_id"], ["comments_queue.id"], ondelete="SET NULL"),
    )
    op.create_index("idx_dlq_created_at", "comments_dead_letter", ["created_at"])
    op.create_index("idx_dlq_comment", "comments_dead_letter", ["comment_id"]) 


def downgrade() -> None:
    op.drop_index("idx_dlq_comment", table_name="comments_dead_letter")
    op.drop_index("idx_dlq_created_at", table_name="comments_dead_letter")
    op.drop_table("comments_dead_letter")

    op.drop_index("idx_error_logs_code", table_name="error_logs")
    op.drop_index("idx_error_logs_service", table_name="error_logs")
    op.drop_index("idx_error_logs_created_at", table_name="error_logs")
    op.drop_table("error_logs")

    # Remove added columns from comments_queue
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='next_attempt_at'
            ) THEN
                ALTER TABLE comments_queue DROP COLUMN next_attempt_at;
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='last_error_at'
            ) THEN
                ALTER TABLE comments_queue DROP COLUMN last_error_at;
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='last_error_message'
            ) THEN
                ALTER TABLE comments_queue DROP COLUMN last_error_message;
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='last_error_code'
            ) THEN
                ALTER TABLE comments_queue DROP COLUMN last_error_code;
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='failure_count'
            ) THEN
                ALTER TABLE comments_queue DROP COLUMN failure_count;
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='retry_count'
            ) THEN
                ALTER TABLE comments_queue DROP COLUMN retry_count;
            END IF;
        END
        $$;
        """
    )
