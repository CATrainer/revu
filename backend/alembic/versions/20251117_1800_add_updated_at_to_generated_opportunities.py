"""add updated_at to generated_opportunities and plan_modifications

Revision ID: 20251117_1800
Revises: 20251109_2340
Create Date: 2025-11-17 18:00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251117_1800'
down_revision = '20251109_2340'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add updated_at column to generated_opportunities table
    conn = op.get_bind()
    
    conn.execute(sa.text("""
        ALTER TABLE generated_opportunities
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    """))
    
    # Add updated_at column to plan_modifications table
    conn.execute(sa.text("""
        ALTER TABLE plan_modifications
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    """))


def downgrade() -> None:
    # Remove updated_at columns
    op.drop_column('plan_modifications', 'updated_at')
    op.drop_column('generated_opportunities', 'updated_at')
