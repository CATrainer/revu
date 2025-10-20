"""add_is_demo_to_fans

Revision ID: 2aa5e9a1f29b
Revises: 48990e38f9bd
Create Date: 2025-10-20 16:02:46.452990

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2aa5e9a1f29b'
down_revision = '48990e38f9bd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_demo column to fans table
    op.add_column('fans', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create index for efficient filtering
    op.create_index('ix_fans_is_demo', 'fans', ['is_demo'])
    
    # Backfill: Mark existing fans as demo if their user is in demo mode
    # This SQL safely handles the transition for existing data
    op.execute("""
        UPDATE fans 
        SET is_demo = true 
        WHERE user_id IN (
            SELECT id FROM users WHERE demo_mode = true
        )
    """)


def downgrade() -> None:
    # Remove index first
    op.drop_index('ix_fans_is_demo', table_name='fans')
    
    # Remove column
    op.drop_column('fans', 'is_demo')