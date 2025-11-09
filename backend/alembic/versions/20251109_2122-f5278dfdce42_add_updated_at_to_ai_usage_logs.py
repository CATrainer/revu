"""add_updated_at_to_ai_usage_logs

Revision ID: f5278dfdce42
Revises: c4db0b76b66e
Create Date: 2025-11-09 21:22:57.597457

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f5278dfdce42'
down_revision = 'c4db0b76b66e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add updated_at column to ai_usage_logs table
    op.add_column(
        'ai_usage_logs',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )


def downgrade() -> None:
    # Remove updated_at column from ai_usage_logs table
    op.drop_column('ai_usage_logs', 'updated_at')