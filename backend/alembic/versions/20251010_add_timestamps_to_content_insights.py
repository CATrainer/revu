"""add timestamps to content_insights

Revision ID: 20251010_timestamps
Revises: 20251010_insights
Create Date: 2025-10-10 23:24:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251010_timestamps'
down_revision = '20251010_insights'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add created_at and updated_at columns to content_insights table
    op.add_column('content_insights', sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')))
    op.add_column('content_insights', sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')))


def downgrade() -> None:
    # Remove created_at and updated_at columns from content_insights table
    op.drop_column('content_insights', 'updated_at')
    op.drop_column('content_insights', 'created_at')
