"""add updated_at to oauth_state_tokens

Revision ID: 20250828_2105
Revises: 20250827_1230
Create Date: 2025-08-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250828_2105"
down_revision = "20250827_1230"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing updated_at column to align with Base model
    op.add_column(
        "oauth_state_tokens",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("oauth_state_tokens", "updated_at")
