"""add oauth_state_tokens table

Revision ID: 20250827_1230
Revises: 20250827_1220
Create Date: 2025-08-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250827_1230"
down_revision = "20250827_1220"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "oauth_state_tokens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )

    op.create_index("idx_oauth_state_tokens_user", "oauth_state_tokens", ["user_id"]) 


def downgrade() -> None:
    op.drop_index("idx_oauth_state_tokens_user", table_name="oauth_state_tokens")
    op.drop_table("oauth_state_tokens")
