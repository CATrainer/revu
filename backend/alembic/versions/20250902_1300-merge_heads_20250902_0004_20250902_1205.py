"""merge heads 20250902_0004 and 20250902_1205

Revision ID: 20250902_1300
Revises: 20250902_0004, 20250902_1205
Create Date: 2025-09-02

"""
from alembic import op  # noqa: F401


# revision identifiers, used by Alembic.
revision = "20250902_1300"
down_revision = ("20250902_0004", "20250902_1205")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Merge migration; no operations required.
    pass


def downgrade() -> None:
    # Merge migrations typically have no downgrade steps.
    pass
