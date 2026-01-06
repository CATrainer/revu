"""Add system_workflow_type column to workflows table.

Revision ID: 20250106_1830
Revises: b9f567acd2a8
Create Date: 2026-01-06 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250106_1830'
down_revision = 'b9f567acd2a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add system_workflow_type column
    op.add_column(
        'workflows',
        sa.Column('system_workflow_type', sa.String(50), nullable=True, index=True)
    )
    
    # Create index for faster lookups
    op.create_index(
        'ix_workflows_system_workflow_type',
        'workflows',
        ['system_workflow_type'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_workflows_system_workflow_type', table_name='workflows')
    op.drop_column('workflows', 'system_workflow_type')
