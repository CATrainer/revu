"""merge heads 20250827_1250 and 20250828_2105

Revision ID: 20250828_2110
Revises: 20250827_1250, 20250828_2105
Create Date: 2025-08-28

"""
from alembic import op  # noqa: F401


# revision identifiers, used by Alembic.
revision = "20250828_2110"
down_revision = ("20250827_1250", "20250828_2105")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge migration; no operations needed.
    pass


def downgrade() -> None:
    # Merge migrations typically have no downgrade steps.
    pass
