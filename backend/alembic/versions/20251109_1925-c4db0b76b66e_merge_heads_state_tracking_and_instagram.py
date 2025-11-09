"""merge_heads_state_tracking_and_instagram

Revision ID: c4db0b76b66e
Revises: 20250124_state_tracking, 20251109_0030
Create Date: 2025-11-09 19:25:10.720210

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c4db0b76b66e'
down_revision = ('20250124_state_tracking', '20251109_0030')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass