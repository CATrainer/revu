"""add pending to access_status

Revision ID: 20251024_140000
Revises: 20251024_120500
Create Date: 2025-10-24 14:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251024_140000'
down_revision = '20251024_120500'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Replace 'waiting' with 'pending' for new approval workflow."""
    
    # Migrate existing 'waiting' users to 'pending'
    op.execute("""
        UPDATE users 
        SET access_status = 'pending' 
        WHERE access_status = 'waiting'
    """)
    
    # Drop existing check constraint
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_check_user_access_status")
    
    # Recreate with only 'pending' and 'full' (remove 'waiting')
    op.create_check_constraint(
        'check_user_access_status',
        'users',
        "access_status IN ('pending','full')",
    )
    
    # Update default value for access_status column
    op.execute("ALTER TABLE users ALTER COLUMN access_status SET DEFAULT 'pending'")


def downgrade() -> None:
    """Revert to only 'waiting' and 'full'."""
    
    # Drop existing check constraint
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_check_user_access_status")
    
    # Recreate without pending
    op.create_check_constraint(
        'check_user_access_status',
        'users',
        "access_status IN ('waiting','full')",
    )
