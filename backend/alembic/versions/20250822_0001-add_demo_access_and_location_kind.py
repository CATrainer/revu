"""add demo access and location kind

Revision ID: 20250822_0001
Revises: 20250729_1315-627c9dc8a8fc
Create Date: 2025-08-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250822_0001'
down_revision = '627c9dc8a8fc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add demo_access_type to users
    op.add_column('users', sa.Column('demo_access_type', sa.String(length=50), nullable=True))

    # Add kind to locations with default
    op.add_column('locations', sa.Column('kind', sa.String(length=50), nullable=False, server_default='business_location'))
    # Optional: If you want to drop server_default after backfill, you can alter column here
    # with op.batch_alter_table('locations') as batch_op:
    #     batch_op.alter_column('kind', server_default=None)


def downgrade() -> None:
    op.drop_column('locations', 'kind')
    op.drop_column('users', 'demo_access_type')
