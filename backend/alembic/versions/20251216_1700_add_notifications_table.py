"""Add notifications table and fix notification_preferences schema

Revision ID: 20251216_1700
Revises: 20251215_1700
Create Date: 2025-12-16 17:00:00.000000

This migration adds the missing 'notifications' table used by creator_tools.py
and updates notification_preferences to match the model schema.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision = '20251216_1700'
down_revision = '20251215_1700'
branch_labels = None
depends_on = None


def table_exists(conn, table_name: str) -> bool:
    """Check if a table exists in the public schema."""
    result = conn.execute(sa.text("""
        SELECT table_name FROM information_schema.tables
        WHERE table_name = :table_name AND table_schema = 'public'
    """), {"table_name": table_name})
    return result.fetchone() is not None


def column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    result = conn.execute(sa.text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = :table_name AND column_name = :column_name
    """), {"table_name": table_name, "column_name": column_name})
    return result.fetchone() is not None


def index_exists(conn, index_name: str) -> bool:
    """Check if an index exists."""
    result = conn.execute(sa.text("""
        SELECT indexname FROM pg_indexes
        WHERE indexname = :index_name
    """), {"index_name": index_name})
    return result.fetchone() is not None


def constraint_exists(conn, constraint_name: str) -> bool:
    """Check if a constraint exists."""
    result = conn.execute(sa.text("""
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE constraint_name = :constraint_name
    """), {"constraint_name": constraint_name})
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()

    # ==========================================================================
    # Create 'notifications' table (used by creator_tools.py Notification model)
    # ==========================================================================
    if not table_exists(conn, 'notifications'):
        op.create_table(
            'notifications',
            sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('type', sa.String(50), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('message', sa.Text, nullable=False),
            sa.Column('data', JSONB, nullable=True, server_default='{}'),
            sa.Column('action_url', sa.String(500), nullable=True),
            sa.Column('action_label', sa.String(100), nullable=True, server_default='View'),
            sa.Column('priority', sa.String(20), nullable=False, server_default='normal'),
            sa.Column('is_read', sa.Boolean, nullable=False, server_default='false'),
            sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('is_dismissed', sa.Boolean, nullable=False, server_default='false'),
            sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )

    # Create indexes for notifications
    if not index_exists(conn, 'ix_notifications_user_id'):
        op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    if not index_exists(conn, 'ix_notifications_type'):
        op.create_index('ix_notifications_type', 'notifications', ['type'])
    if not index_exists(conn, 'ix_notifications_is_read'):
        op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    if not index_exists(conn, 'idx_notifications_user_unread'):
        op.create_index('idx_notifications_user_unread', 'notifications', ['user_id', 'is_read'])
    if not index_exists(conn, 'idx_notifications_user_type'):
        op.create_index('idx_notifications_user_type', 'notifications', ['user_id', 'type'])
    if not index_exists(conn, 'idx_notifications_created'):
        op.create_index('idx_notifications_created', 'notifications', ['created_at'])

    # ==========================================================================
    # Fix notification_preferences schema to match NotificationPreference model
    # ==========================================================================
    
    # Add missing columns to notification_preferences
    columns_to_add = [
        ('notify_unanswered_comments', sa.Boolean, 'true'),
        ('unanswered_threshold', sa.Integer, '10'),
        ('unanswered_hours', sa.Integer, '24'),
        ('notify_engagement_changes', sa.Boolean, 'true'),
        ('engagement_drop_threshold', sa.Integer, '20'),
        ('notify_brand_opportunities', sa.Boolean, 'true'),
        ('notify_performance_insights', sa.Boolean, 'true'),
        ('notify_deal_updates', sa.Boolean, 'true'),
        ('notify_content_reminders', sa.Boolean, 'true'),
        ('email_digest_frequency', sa.String(20), "'daily'"),
        ('email_urgent_only', sa.Boolean, 'false'),
        ('quiet_hours_enabled', sa.Boolean, 'false'),
        ('quiet_hours_start', sa.Time, None),
        ('quiet_hours_end', sa.Time, None),
        ('timezone', sa.String(50), "'UTC'"),
    ]

    for col_name, col_type, default in columns_to_add:
        if not column_exists(conn, 'notification_preferences', col_name):
            if default is not None:
                op.add_column('notification_preferences',
                    sa.Column(col_name, col_type, nullable=True, server_default=sa.text(default)))
            else:
                op.add_column('notification_preferences',
                    sa.Column(col_name, col_type, nullable=True))

    # Add the check constraint if it doesn't exist
    if not constraint_exists(conn, 'valid_digest_frequency'):
        try:
            op.create_check_constraint(
                'valid_digest_frequency',
                'notification_preferences',
                "email_digest_frequency IN ('realtime', 'daily', 'weekly', 'never')"
            )
        except Exception:
            # Constraint may already exist or fail - not critical
            pass


def downgrade() -> None:
    conn = op.get_bind()

    # Remove check constraint
    if constraint_exists(conn, 'valid_digest_frequency'):
        op.drop_constraint('valid_digest_frequency', 'notification_preferences', type_='check')

    # Remove added columns from notification_preferences
    columns_to_remove = [
        'notify_unanswered_comments',
        'unanswered_threshold',
        'unanswered_hours',
        'notify_engagement_changes',
        'engagement_drop_threshold',
        'notify_brand_opportunities',
        'notify_performance_insights',
        'notify_deal_updates',
        'notify_content_reminders',
        'email_digest_frequency',
        'email_urgent_only',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
        'timezone',
    ]

    for col_name in columns_to_remove:
        if column_exists(conn, 'notification_preferences', col_name):
            op.drop_column('notification_preferences', col_name)

    # Drop notifications table indexes
    indexes_to_drop = [
        'idx_notifications_created',
        'idx_notifications_user_type',
        'idx_notifications_user_unread',
        'ix_notifications_is_read',
        'ix_notifications_type',
        'ix_notifications_user_id',
    ]
    for idx in indexes_to_drop:
        if index_exists(conn, idx):
            op.drop_index(idx, table_name='notifications')

    # Drop notifications table
    if table_exists(conn, 'notifications'):
        op.drop_table('notifications')
