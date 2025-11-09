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
    # Add updated_at column to all monetization tables that are missing it
    
    # project_chat_messages
    op.add_column(
        'project_chat_messages',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    
    # creator_profiles (if missing)
    op.add_column(
        'creator_profiles',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    
    # active_projects (if missing)
    op.add_column(
        'active_projects',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    
    # project_task_completions (if missing)
    op.add_column(
        'project_task_completions',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    
    # project_decisions (if missing)
    op.add_column(
        'project_decisions',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )


def downgrade() -> None:
    # Remove updated_at columns
    op.drop_column('project_decisions', 'updated_at')
    op.drop_column('project_task_completions', 'updated_at')
    op.drop_column('active_projects', 'updated_at')
    op.drop_column('creator_profiles', 'updated_at')
    op.drop_column('project_chat_messages', 'updated_at')