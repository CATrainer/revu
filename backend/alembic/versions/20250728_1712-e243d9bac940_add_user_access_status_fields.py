"""add_user_access_status_fields

Revision ID: e243d9bac940
Revises: 87bfc381ac23
Create Date: 2025-07-28 17:12:06.953699

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e243d9bac940'
down_revision = '87bfc381ac23'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add access_status field to users table
    op.add_column('users', sa.Column('access_status', sa.String(20), nullable=False, server_default='waiting_list'))
    
    # Add constraint for valid access_status values
    op.create_check_constraint(
        'check_user_access_status', 
        'users', 
        "access_status IN ('waiting_list', 'early_access', 'full_access')"
    )
    
    # Add joined_waiting_list_at timestamp
    op.add_column('users', sa.Column('joined_waiting_list_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add early_access_granted_at timestamp
    op.add_column('users', sa.Column('early_access_granted_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add demo_requested flag
    op.add_column('users', sa.Column('demo_requested', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add demo_requested_at timestamp
    op.add_column('users', sa.Column('demo_requested_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove columns in reverse order
    op.drop_column('users', 'demo_requested_at')
    op.drop_column('users', 'demo_requested')
    op.drop_column('users', 'early_access_granted_at')
    op.drop_column('users', 'joined_waiting_list_at')
    
    # Drop constraint
    op.drop_constraint('check_user_access_status', 'users', type_='check')
    
    # Drop access_status column
    op.drop_column('users', 'access_status')