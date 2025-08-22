"""update user access status check to include demo_access

Revision ID: 20250822_0002
Revises: 20250822_0001
Create Date: 2025-08-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250822_0002'
down_revision = '20250822_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing check constraint if present (IF EXISTS to avoid aborting transaction)
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_check_user_access_status")
    # Recreate with demo_access included. With naming convention, this will become ck_users_check_user_access_status
    op.create_check_constraint(
        'check_user_access_status',
        'users',
        "access_status IN ('waiting_list','early_access','full_access','demo_access')",
    )


def downgrade() -> None:
    # Revert to original constraint without demo_access
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_check_user_access_status")
    op.create_check_constraint(
        'check_user_access_status',
        'users',
        "access_status IN ('waiting_list','early_access','full_access')",
    )
