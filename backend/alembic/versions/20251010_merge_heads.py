"""merge heads

Revision ID: 20251010_merge
Revises: 20251007_0050, 20251008_1708
Create Date: 2025-10-10 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251010_merge'
down_revision = ('20251007_0050', '20251008_1708')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Merge migration - no changes needed
    pass


def downgrade() -> None:
    # Merge migration - no changes needed
    pass
