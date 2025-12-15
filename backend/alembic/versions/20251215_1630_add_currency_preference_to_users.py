"""Add currency_preference to users table

Revision ID: 20251215_1630
Revises: 
Create Date: 2025-12-15 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251215_1630'
down_revision = None  # Will be set by alembic
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add currency_preference column to users table
    op.add_column(
        'users',
        sa.Column(
            'currency_preference',
            sa.String(3),
            nullable=False,
            server_default='USD',
            comment='Preferred display currency (ISO 4217)'
        )
    )


def downgrade() -> None:
    # Remove currency_preference column
    op.drop_column('users', 'currency_preference')
