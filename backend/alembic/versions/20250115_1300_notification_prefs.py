"""Add notification preference columns for agency

Revision ID: 20250115_1300_notification_prefs
Revises: 20250115_1200_support_tickets
Create Date: 2025-01-15 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250115_1300_notification_prefs'
down_revision = '20250115_1200_support_tickets'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to notification_preferences table
    # These enable the modern notification settings UI
    
    # Check if columns exist before adding (for idempotency)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('notification_preferences')]
    
    if 'in_app_enabled' not in columns:
        op.add_column('notification_preferences',
            sa.Column('in_app_enabled', sa.Boolean(), nullable=False, server_default='true')
        )
    
    if 'email_frequency' not in columns:
        op.add_column('notification_preferences',
            sa.Column('email_frequency', sa.String(20), nullable=False, server_default='instant')
        )
    
    if 'digest_hour' not in columns:
        op.add_column('notification_preferences',
            sa.Column('digest_hour', sa.Integer(), nullable=False, server_default='9')
        )
    
    if 'type_settings' not in columns:
        op.add_column('notification_preferences',
            sa.Column('type_settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}')
        )
    
    if 'muted_entities' not in columns:
        op.add_column('notification_preferences',
            sa.Column('muted_entities', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]')
        )
    
    # Drop old constraint if it exists and add new one
    try:
        op.drop_constraint('valid_digest_frequency', 'notification_preferences', type_='check')
    except Exception:
        pass  # Constraint may not exist
    
    try:
        op.create_check_constraint(
            'valid_email_frequency',
            'notification_preferences',
            "email_frequency IN ('instant', 'daily_digest')"
        )
    except Exception:
        pass  # Constraint may already exist


def downgrade() -> None:
    # Remove the new columns
    op.drop_column('notification_preferences', 'muted_entities')
    op.drop_column('notification_preferences', 'type_settings')
    op.drop_column('notification_preferences', 'digest_hour')
    op.drop_column('notification_preferences', 'email_frequency')
    op.drop_column('notification_preferences', 'in_app_enabled')
    
    # Restore old constraint
    try:
        op.drop_constraint('valid_email_frequency', 'notification_preferences', type_='check')
    except Exception:
        pass
    
    op.create_check_constraint(
        'valid_digest_frequency',
        'notification_preferences',
        "email_digest_frequency IN ('realtime', 'daily', 'weekly', 'never')"
    )
