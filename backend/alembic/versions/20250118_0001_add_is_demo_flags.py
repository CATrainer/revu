"""Add is_demo flags to interactions and content_pieces

Revision ID: 20250118_0001
Revises: 20251010_timestamps
Create Date: 2025-01-18 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250118_0001'
down_revision = '20251010_timestamps'  # Points to actual latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Add is_demo column to interactions table
    op.add_column('interactions', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index('ix_interactions_is_demo', 'interactions', ['is_demo'])
    
    # Add is_demo column to content_pieces table
    op.add_column('content_pieces', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index('ix_content_pieces_is_demo', 'content_pieces', ['is_demo'])


def downgrade():
    # Remove indexes and columns
    op.drop_index('ix_content_pieces_is_demo', table_name='content_pieces')
    op.drop_column('content_pieces', 'is_demo')
    
    op.drop_index('ix_interactions_is_demo', table_name='interactions')
    op.drop_column('interactions', 'is_demo')
