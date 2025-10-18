"""Fix missing timestamps on content_performance and content_insights

Revision ID: 20251018_0001
Revises: 20250118_0001
Create Date: 2025-10-18 08:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251018_0001'
down_revision = '20250118_0001'
branch_labels = None
depends_on = None


def upgrade():
    # Use raw SQL with IF NOT EXISTS to safely add columns
    # This is idempotent - won't fail if columns already exist
    
    # Add created_at to content_performance if missing
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'content_performance' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE content_performance 
                ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
            END IF;
        END $$;
    """)
    
    # Add updated_at to content_performance if missing
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'content_performance' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE content_performance 
                ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
            END IF;
        END $$;
    """)
    
    # Add created_at to content_insights if missing
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'content_insights' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE content_insights 
                ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
            END IF;
        END $$;
    """)
    
    # Add updated_at to content_insights if missing
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'content_insights' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE content_insights 
                ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
            END IF;
        END $$;
    """)


def downgrade():
    # Only drop if exists (safe downgrade)
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'content_performance' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE content_performance DROP COLUMN created_at;
            END IF;
        END $$;
    """)
    
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'content_performance' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE content_performance DROP COLUMN updated_at;
            END IF;
        END $$;
    """)
    
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'content_insights' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE content_insights DROP COLUMN created_at;
            END IF;
        END $$;
    """)
    
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'content_insights' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE content_insights DROP COLUMN updated_at;
            END IF;
        END $$;
    """)
