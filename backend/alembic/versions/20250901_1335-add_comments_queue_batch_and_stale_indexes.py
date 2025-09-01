"""augment comments_queue with batch timestamp and stale-finding indexes

Revision ID: 20250901_1335
Revises: 20250901_1325
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250901_1335"
down_revision = "20250901_1325"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add last_batch_processed_at if missing (idempotent)
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='last_batch_processed_at'
            ) THEN
                ALTER TABLE comments_queue ADD COLUMN last_batch_processed_at TIMESTAMPTZ NULL;
            END IF;
        END
        $$;
        """
    )

    # Indexes to efficiently find old/stale pending comments
    # Basic created_at index (no-op if existing from earlier migration)
    op.execute("CREATE INDEX IF NOT EXISTS idx_cq_created_at ON comments_queue (created_at)")

    # Composite index by status then created_at for ordering/filters
    op.execute("CREATE INDEX IF NOT EXISTS idx_cq_status_created_at ON comments_queue (status, created_at)")

    # Partial index for fast scan of old pending items
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_cq_pending_created_at
        ON comments_queue (created_at)
        WHERE status = 'pending'
        """
    )

    # Index to locate pending rows by last batch time (NULLs first -> treat as oldest)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_cq_pending_last_batch
        ON comments_queue (last_batch_processed_at)
        WHERE status = 'pending'
        """
    )


def downgrade() -> None:
    # Drop only objects introduced here
    op.execute("DROP INDEX IF EXISTS idx_cq_pending_last_batch")
    op.execute("DROP INDEX IF EXISTS idx_cq_pending_created_at")
    op.execute("DROP INDEX IF EXISTS idx_cq_status_created_at")

    # Remove column if present
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='comments_queue' AND column_name='last_batch_processed_at'
            ) THEN
                ALTER TABLE comments_queue DROP COLUMN last_batch_processed_at;
            END IF;
        END
        $$;
        """
    )
