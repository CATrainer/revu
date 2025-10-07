"""Add workflow view association

Revision ID: 20250107_2210
Revises: 20250107_2200
Create Date: 2025-01-07 22:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250107_2210'
down_revision = '20250107_2200'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add view association columns to workflows
    op.add_column('workflows', sa.Column('view_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('workflows', sa.Column('is_global', sa.Boolean(), server_default='false', nullable=False))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_workflows_view_id',
        'workflows',
        'interaction_views',
        ['view_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for view queries
    op.create_index('idx_workflows_view_id', 'workflows', ['view_id'])


def downgrade() -> None:
    # Remove index
    op.drop_index('idx_workflows_view_id', table_name='workflows')
    
    # Remove foreign key
    op.drop_constraint('fk_workflows_view_id', 'workflows', type_='foreignkey')
    
    # Remove columns
    op.drop_column('workflows', 'is_global')
    op.drop_column('workflows', 'view_id')
