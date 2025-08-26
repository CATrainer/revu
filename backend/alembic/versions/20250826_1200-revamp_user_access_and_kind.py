"""revamp user access and add user_kind

Revision ID: 20250826_1200
Revises: add_demo_mode_tables
Create Date: 2025-08-26

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250826_1200'
down_revision = 'add_demo_mode_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # First, drop existing access_status constraint to allow transitional values
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_check_user_access_status")

    # Add user_kind if not present
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('user_kind', sa.String(length=20), nullable=True))

    # Migrate access_status values
    op.execute("""
        UPDATE users SET access_status = 'waiting' WHERE access_status IN ('waiting_list')
    """)
    op.execute("""
        UPDATE users SET access_status = 'full' WHERE access_status IN ('early_access','full_access','demo_access')
    """)

    # Backfill user_kind default to 'content'
    op.execute("""
        UPDATE users SET user_kind = 'content' WHERE user_kind IS NULL
    """)

    # Set NOT NULL and default
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('user_kind', existing_type=sa.String(length=20), nullable=False, server_default='content')

    # Update check constraint for access_status (final strict set)
    op.create_check_constraint(
        'check_user_access_status',
        'users',
        "access_status IN ('waiting','full')",
    )

    # Drop demo-specific columns if present (safe to ignore errors)
    try:
        with op.batch_alter_table('users') as batch_op:
            batch_op.drop_column('demo_access_type')
    except Exception:
        pass


def downgrade() -> None:
    # Try to restore schema loosely
    with op.batch_alter_table('users') as batch_op:
        try:
            batch_op.add_column(sa.Column('demo_access_type', sa.String(length=50), nullable=True))
        except Exception:
            pass
        try:
            batch_op.drop_column('user_kind')
        except Exception:
            pass

    # Relax access_status constraint back to previous broad set
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_check_user_access_status")
    op.create_check_constraint(
        'check_user_access_status',
        'users',
        "access_status IN ('waiting_list','early_access','full_access','demo_access','waiting','full')",
    )
