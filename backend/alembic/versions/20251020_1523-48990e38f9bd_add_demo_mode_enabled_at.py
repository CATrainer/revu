"""add_demo_mode_enabled_at

Revision ID: 48990e38f9bd
Revises: 20251018_0001
Create Date: 2025-10-20 15:23:47.381730

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '48990e38f9bd'
down_revision = '20251018_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add demo_mode_enabled_at column to users table
    op.add_column('users', sa.Column('demo_mode_enabled_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove demo_mode_enabled_at column from users table
    op.drop_column('users', 'demo_mode_enabled_at')