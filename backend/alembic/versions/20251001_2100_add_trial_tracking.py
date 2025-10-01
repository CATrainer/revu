"""add trial tracking to users

Revision ID: 20251001_2100
Revises: 20251001_1100
Create Date: 2025-10-01 21:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = '20251001_2100'
down_revision = '20251001_1100'
branch_labels = None
depends_on = None


def upgrade():
    """Add trial tracking columns to users table."""
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check existing columns to avoid duplicate adds
    existing_columns = {col['name'] for col in inspector.get_columns('users')}
    
    # Add trial_start_date
    if 'trial_start_date' not in existing_columns:
        op.add_column('users', sa.Column(
            'trial_start_date',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='When user started trial'
        ))
    
    # Add trial_end_date
    if 'trial_end_date' not in existing_columns:
        op.add_column('users', sa.Column(
            'trial_end_date',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='When trial expires'
        ))
    
    # Add trial_notified_7d
    if 'trial_notified_7d' not in existing_columns:
        op.add_column('users', sa.Column(
            'trial_notified_7d',
            sa.Boolean(),
            server_default='false',
            nullable=False,
            comment='7-day expiration notice sent'
        ))
    
    # Add trial_notified_3d
    if 'trial_notified_3d' not in existing_columns:
        op.add_column('users', sa.Column(
            'trial_notified_3d',
            sa.Boolean(),
            server_default='false',
            nullable=False,
            comment='3-day expiration notice sent'
        ))
    
    # Add trial_notified_1d
    if 'trial_notified_1d' not in existing_columns:
        op.add_column('users', sa.Column(
            'trial_notified_1d',
            sa.Boolean(),
            server_default='false',
            nullable=False,
            comment='1-day expiration notice sent'
        ))
    
    # Add subscription_status
    if 'subscription_status' not in existing_columns:
        op.add_column('users', sa.Column(
            'subscription_status',
            sa.String(20),
            server_default='trial',
            nullable=False,
            comment='trial, active, cancelled, expired'
        ))
    
    print("✅ Successfully added trial tracking columns to users table")


def downgrade():
    """Remove trial tracking columns from users table."""
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check existing columns
    existing_columns = {col['name'] for col in inspector.get_columns('users')}
    
    # Remove columns in reverse order
    if 'subscription_status' in existing_columns:
        op.drop_column('users', 'subscription_status')
    
    if 'trial_notified_1d' in existing_columns:
        op.drop_column('users', 'trial_notified_1d')
    
    if 'trial_notified_3d' in existing_columns:
        op.drop_column('users', 'trial_notified_3d')
    
    if 'trial_notified_7d' in existing_columns:
        op.drop_column('users', 'trial_notified_7d')
    
    if 'trial_end_date' in existing_columns:
        op.drop_column('users', 'trial_end_date')
    
    if 'trial_start_date' in existing_columns:
        op.drop_column('users', 'trial_start_date')
    
    print("✅ Successfully removed trial tracking columns from users table")
