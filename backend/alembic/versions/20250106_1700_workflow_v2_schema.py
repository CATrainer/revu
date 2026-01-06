"""Workflow V2 schema updates.

Revision ID: workflow_v2_schema
Revises: 20251216_1900
Create Date: 2025-01-06

This migration updates the workflows table for V2:
- Adds view_ids (array of UUIDs) for multi-view scope
- Adds ai_condition (text) for natural language conditions
- Ensures action_type and action_config columns exist
- Ensures priority column exists with default
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'workflow_v2_schema'
down_revision = '20251216_1900'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add view_ids column (array of UUIDs for multi-view scope)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'view_ids'
            ) THEN
                ALTER TABLE workflows ADD COLUMN view_ids UUID[];
            END IF;
        END $$;
    """)
    
    # Add ai_conditions column (array of natural language conditions with OR logic)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'ai_conditions'
            ) THEN
                ALTER TABLE workflows ADD COLUMN ai_conditions TEXT[];
            END IF;
        END $$;
    """)
    
    # Ensure action_type column exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'action_type'
            ) THEN
                ALTER TABLE workflows ADD COLUMN action_type VARCHAR(50);
            END IF;
        END $$;
    """)
    
    # Ensure action_config column exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'action_config'
            ) THEN
                ALTER TABLE workflows ADD COLUMN action_config JSONB;
            END IF;
        END $$;
    """)
    
    # Ensure priority column exists with default
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'priority'
            ) THEN
                ALTER TABLE workflows ADD COLUMN priority INTEGER DEFAULT 100;
            END IF;
        END $$;
    """)
    
    # Ensure is_enabled column exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'is_enabled'
            ) THEN
                ALTER TABLE workflows ADD COLUMN is_enabled BOOLEAN DEFAULT TRUE;
            END IF;
        END $$;
    """)
    
    # Ensure platforms column exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'platforms'
            ) THEN
                ALTER TABLE workflows ADD COLUMN platforms VARCHAR(32)[];
            END IF;
        END $$;
    """)
    
    # Ensure interaction_types column exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'interaction_types'
            ) THEN
                ALTER TABLE workflows ADD COLUMN interaction_types VARCHAR(16)[];
            END IF;
        END $$;
    """)
    
    # Ensure user_id column exists (some workflows may have been created with created_by_id only)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'workflows' AND column_name = 'user_id'
            ) THEN
                ALTER TABLE workflows ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END $$;
    """)
    
    # Migrate existing workflows: copy created_by_id to user_id if user_id is null
    op.execute("""
        UPDATE workflows 
        SET user_id = created_by_id 
        WHERE user_id IS NULL AND created_by_id IS NOT NULL;
    """)
    
    # Migrate legacy action data to new format
    # Convert actions JSONB array to action_type and action_config
    op.execute("""
        UPDATE workflows 
        SET 
            action_type = COALESCE(
                (actions->0->>'type'),
                'generate_response'
            ),
            action_config = COALESCE(
                actions->0->'config',
                '{}'::jsonb
            )
        WHERE action_type IS NULL AND actions IS NOT NULL AND jsonb_array_length(actions) > 0;
    """)
    
    # Set default action_type for workflows without any action
    op.execute("""
        UPDATE workflows 
        SET action_type = 'generate_response'
        WHERE action_type IS NULL;
    """)
    
    # Create index on user_id for faster lookups
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_workflows_user_id ON workflows(user_id);
    """)
    
    # Create index on priority for faster ordering
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_workflows_priority ON workflows(priority);
    """)


def downgrade() -> None:
    # Remove new columns (be careful - this loses data)
    op.execute("ALTER TABLE workflows DROP COLUMN IF EXISTS view_ids;")
    op.execute("ALTER TABLE workflows DROP COLUMN IF EXISTS ai_conditions;")
    op.execute("DROP INDEX IF EXISTS ix_workflows_priority;")
