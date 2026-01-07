"""merge_monetization_v2

Revision ID: 5243743b10c2
Revises: 20250107_1500_merge_all_heads, monetization_v2_001
Create Date: 2026-01-07 17:14:16.676519

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5243743b10c2'
down_revision = ('20250107_1500_merge_all_heads', 'monetization_v2_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass