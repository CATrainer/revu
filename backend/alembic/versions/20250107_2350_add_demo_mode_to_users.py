"""Add demo_mode to users

Revision ID: 20250107_2350
Revises: 20250107_2230
Create Date: 2025-01-07 23:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '20250107_2350'
down_revision = '20250107_2230'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add demo_mode column
    op.add_column('users', sa.Column('demo_mode', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'demo_mode')
