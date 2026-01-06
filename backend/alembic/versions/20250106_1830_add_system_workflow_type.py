"""Add system_workflow_type column to workflows table.

Revision ID: 20250106_1830
Revises: b9f567acd2a8
Create Date: 2026-01-06 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '20250106_1830'
down_revision = 'b9f567acd2a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Get connection to check existing state
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if column already exists
    columns = [col['name'] for col in inspector.get_columns('workflows')]
    if 'system_workflow_type' not in columns:
        # Add system_workflow_type column
        op.add_column(
            'workflows',
            sa.Column('system_workflow_type', sa.String(50), nullable=True)
        )
    
    # Check if index already exists
    indexes = [idx['name'] for idx in inspector.get_indexes('workflows')]
    if 'ix_workflows_system_workflow_type' not in indexes:
        # Create index for faster lookups
        op.create_index(
            'ix_workflows_system_workflow_type',
            'workflows',
            ['system_workflow_type'],
            unique=False
        )


def downgrade() -> None:
    # Get connection to check existing state
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if index exists before dropping
    indexes = [idx['name'] for idx in inspector.get_indexes('workflows')]
    if 'ix_workflows_system_workflow_type' in indexes:
        op.drop_index('ix_workflows_system_workflow_type', table_name='workflows')
    
    # Check if column exists before dropping
    columns = [col['name'] for col in inspector.get_columns('workflows')]
    if 'system_workflow_type' in columns:
        op.drop_column('workflows', 'system_workflow_type')
