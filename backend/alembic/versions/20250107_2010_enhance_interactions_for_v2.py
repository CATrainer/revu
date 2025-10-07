"""Enhance interactions for V2 - Add status tracking and response management

Revision ID: 20250107_2010
Revises: 20251007_0050
Create Date: 2025-01-07 20:10:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision = '20250107_2010'
down_revision = '20251007_0050'
branch_labels = None
depends_on = None


def upgrade():
    # Add pending_response JSONB field for storing AI-generated responses
    op.add_column('interactions', 
        sa.Column('pending_response', JSONB, nullable=True)
    )
    
    # Add responded_at timestamp (different from replied_at which is when platform reply was created)
    op.add_column('interactions',
        sa.Column('responded_at', sa.DateTime, nullable=True)
    )
    
    # Update status column to have better default and add comment
    op.execute("""
        COMMENT ON COLUMN interactions.status IS 
        'Interaction status: unread, read, awaiting_approval, answered, ignored'
    """)
    
    # Create index on responded_at for performance
    op.create_index('idx_interactions_responded_at', 'interactions', ['responded_at'])
    
    # Create index on status for tab filtering
    op.create_index('idx_interactions_status_filter', 'interactions', ['user_id', 'status', 'created_at'])
    
    # Add comment to pending_response field
    op.execute("""
        COMMENT ON COLUMN interactions.pending_response IS 
        'AI-generated response awaiting approval. Structure: {text: str, generated_at: datetime, model: str, confidence: float}'
    """)


def downgrade():
    op.drop_index('idx_interactions_status_filter', table_name='interactions')
    op.drop_index('idx_interactions_responded_at', table_name='interactions')
    op.drop_column('interactions', 'responded_at')
    op.drop_column('interactions', 'pending_response')
