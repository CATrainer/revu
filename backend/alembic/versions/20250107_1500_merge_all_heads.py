"""Merge all migration heads into single head

Revision ID: 20250107_1500_merge_all_heads
Revises: 20250106_1830, 20250115_1400_subscriptions, phase7_invitation_role
Create Date: 2026-01-07 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250107_1500_merge_all_heads'
down_revision = ('20250106_1830', '20250115_1400_subscriptions', 'phase7_invitation_role')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
