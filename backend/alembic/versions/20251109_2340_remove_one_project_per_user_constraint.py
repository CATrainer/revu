"""remove one_project_per_user constraint for multi-project support

Revision ID: 20251109_2340
Revises: 20251109_2330
Create Date: 2025-11-09 23:40:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251109_2340'
down_revision = '20251109_2330'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove the unique constraint that limits users to one project
    op.drop_constraint('one_project_per_user', 'active_projects', type_='unique')


def downgrade() -> None:
    # Re-add the unique constraint
    op.create_unique_constraint('one_project_per_user', 'active_projects', ['user_id'])
