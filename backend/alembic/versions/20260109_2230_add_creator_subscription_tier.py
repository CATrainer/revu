"""Add creator subscription tier fields

Revision ID: 20260109_2230
Revises: 20260106_1755-b9f567acd2a8
Create Date: 2026-01-09 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260109_2230'
down_revision = '20260106_1755-b9f567acd2a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add subscription_tier column for creators
    # 'free' = can only access Opportunities + Settings
    # 'pro' = full platform access (during trial or paid subscription)
    op.add_column(
        'users',
        sa.Column(
            'subscription_tier',
            sa.String(20),
            nullable=False,
            server_default='free',
            comment="Creator tier: 'free' (Opportunities+Settings only) or 'pro' (full access). Only applies to creators."
        )
    )
    
    # Add has_payment_method flag to track if creator has entered card details
    op.add_column(
        'users',
        sa.Column(
            'has_payment_method',
            sa.Boolean(),
            nullable=False,
            server_default='false',
            comment="Whether creator has added payment method (required for trial)"
        )
    )
    
    # Update existing agency accounts to have 'pro' tier (they always have full access)
    op.execute("""
        UPDATE users 
        SET subscription_tier = 'pro' 
        WHERE account_type = 'agency'
    """)
    
    # Update existing creators who have active subscriptions to 'pro' tier
    op.execute("""
        UPDATE users 
        SET subscription_tier = 'pro' 
        WHERE account_type = 'creator' 
        AND subscription_status IN ('trial', 'active')
    """)


def downgrade() -> None:
    op.drop_column('users', 'has_payment_method')
    op.drop_column('users', 'subscription_tier')
