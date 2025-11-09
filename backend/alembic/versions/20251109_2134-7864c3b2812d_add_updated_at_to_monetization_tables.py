"""add_updated_at_to_monetization_tables

Revision ID: 7864c3b2812d
Revises: f5278dfdce42
Create Date: 2025-11-09 21:34:31.569732

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7864c3b2812d'
down_revision = 'f5278dfdce42'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add updated_at column to monetization tables that are missing it
    # Using raw SQL with IF NOT EXISTS for idempotency
    
    conn = op.get_bind()
    
    # project_chat_messages
    conn.execute(sa.text("""
        ALTER TABLE project_chat_messages 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    """))
    
    # creator_profiles
    conn.execute(sa.text("""
        ALTER TABLE creator_profiles 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    """))
    
    # active_projects
    conn.execute(sa.text("""
        ALTER TABLE active_projects 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    """))
    
    # project_task_completions
    conn.execute(sa.text("""
        ALTER TABLE project_task_completions 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    """))
    
    # project_decisions
    conn.execute(sa.text("""
        ALTER TABLE project_decisions 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    """))


def downgrade() -> None:
    # Remove updated_at columns
    op.drop_column('project_decisions', 'updated_at')
    op.drop_column('project_task_completions', 'updated_at')
    op.drop_column('active_projects', 'updated_at')
    op.drop_column('creator_profiles', 'updated_at')
    op.drop_column('project_chat_messages', 'updated_at')