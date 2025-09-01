"""add polling_config table to control automatic comment fetching per channel

Revision ID: 20250901_1240
Revises: 20250901_1230
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250901_1240"
down_revision = "20250901_1230"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create table with idempotency: only create if not exists
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'polling_config'
            ) THEN
                CREATE TABLE polling_config (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    channel_id UUID NOT NULL,
                    polling_enabled BOOLEAN NOT NULL DEFAULT true,
                    polling_interval_minutes INTEGER NOT NULL DEFAULT 15,
                    last_polled_at TIMESTAMPTZ NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
            END IF;
        END
        $$;
        """
    )

    # Ensure column types and constraints exist (in case table pre-existed)
    # Add missing columns if not present
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='polling_config' AND column_name='channel_id'
            ) THEN
                ALTER TABLE polling_config ADD COLUMN channel_id UUID NOT NULL;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='polling_config' AND column_name='polling_enabled'
            ) THEN
                ALTER TABLE polling_config ADD COLUMN polling_enabled BOOLEAN NOT NULL DEFAULT true;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='polling_config' AND column_name='polling_interval_minutes'
            ) THEN
                ALTER TABLE polling_config ADD COLUMN polling_interval_minutes INTEGER NOT NULL DEFAULT 15;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='polling_config' AND column_name='last_polled_at'
            ) THEN
                ALTER TABLE polling_config ADD COLUMN last_polled_at TIMESTAMPTZ NULL;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='polling_config' AND column_name='created_at'
            ) THEN
                ALTER TABLE polling_config ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='polling_config' AND column_name='updated_at'
            ) THEN
                ALTER TABLE polling_config ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
            END IF;
        END
        $$;
        """
    )

    # Unique constraint on channel_id to ensure one config per channel
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name = 'polling_config' AND constraint_name = 'uq_polling_config_channel_id'
            ) THEN
                ALTER TABLE polling_config ADD CONSTRAINT uq_polling_config_channel_id UNIQUE (channel_id);
            END IF;
        END
        $$;
        """
    )

    # Foreign key to youtube_connections(id)
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
               WHERE tc.table_name = 'polling_config'
                 AND tc.constraint_type = 'FOREIGN KEY'
                 AND kcu.column_name = 'channel_id'
            ) THEN
                ALTER TABLE polling_config
                ADD CONSTRAINT fk_polling_config_channel
                FOREIGN KEY (channel_id) REFERENCES youtube_connections(id)
                ON DELETE CASCADE;
            END IF;
        END
        $$;
        """
    )

    # Indexes to speed up lookups
    op.execute("CREATE INDEX IF NOT EXISTS idx_polling_config_channel ON polling_config(channel_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_polling_config_enabled ON polling_config(polling_enabled);")


def downgrade() -> None:
    # Drop indexes and constraints, then table
    op.execute("DROP INDEX IF EXISTS idx_polling_config_enabled;")
    op.execute("DROP INDEX IF EXISTS idx_polling_config_channel;")
    op.execute("ALTER TABLE polling_config DROP CONSTRAINT IF EXISTS fk_polling_config_channel;")
    op.execute("ALTER TABLE polling_config DROP CONSTRAINT IF EXISTS uq_polling_config_channel_id;")
    op.execute("DROP TABLE IF EXISTS polling_config;")
