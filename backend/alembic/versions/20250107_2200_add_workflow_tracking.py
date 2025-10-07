"""Add workflow tracking to interactions

Revision ID: 20250107_2200
Revises: 20250107_2010
Create Date: 2025-01-07 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250107_2200'
down_revision = '20250107_2010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add workflow tracking columns to interactions
    op.add_column('interactions', sa.Column('workflow_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('interactions', sa.Column('workflow_action', sa.String(50), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_interactions_workflow_id',
        'interactions',
        'workflows',
        ['workflow_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for workflow queries
    op.create_index('idx_interactions_workflow_id', 'interactions', ['workflow_id'])


def downgrade() -> None:
    # Remove index
    op.drop_index('idx_interactions_workflow_id', table_name='interactions')
    
    # Remove foreign key
    op.drop_constraint('fk_interactions_workflow_id', 'interactions', type_='foreignkey')
    
    # Remove columns
    op.drop_column('interactions', 'workflow_action')
    op.drop_column('interactions', 'workflow_id')
