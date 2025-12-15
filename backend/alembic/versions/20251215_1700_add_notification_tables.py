"""Add notification tables for creators and preferences

Revision ID: 20251215_1700
Revises: 20251215_1630
Create Date: 2025-12-15 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision = '20251215_1700'
down_revision = '20251215_1630'
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


def upgrade() -> None:
    conn = op.get_bind()

    # Create creator_notifications table if it doesn't exist
    if not table_exists(conn, 'creator_notifications'):
        op.create_table(
            'creator_notifications',
            sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('type', sa.String(50), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('message', sa.Text, nullable=True),
            sa.Column('priority', sa.String(20), nullable=False, server_default='normal'),
            sa.Column('action_url', sa.String(500), nullable=True),
            sa.Column('action_label', sa.String(100), nullable=True),
            sa.Column('entity_type', sa.String(50), nullable=True),
            sa.Column('entity_id', UUID(as_uuid=True), nullable=True),
            sa.Column('is_read', sa.Boolean, nullable=False, server_default='false'),
            sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('is_dismissed', sa.Boolean, nullable=False, server_default='false'),
            sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('email_sent', sa.Boolean, nullable=False, server_default='false'),
            sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('included_in_digest', sa.Boolean, nullable=False, server_default='false'),
            sa.Column('digest_sent_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('data', JSONB, nullable=False, server_default='{}'),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )

    # Create indexes for creator_notifications if they don't exist
    if not index_exists(conn, 'idx_creator_notif_user_read'):
        op.create_index('idx_creator_notif_user_read', 'creator_notifications', ['user_id', 'is_read'])
    if not index_exists(conn, 'idx_creator_notif_user_type'):
        op.create_index('idx_creator_notif_user_type', 'creator_notifications', ['user_id', 'type'])
    if not index_exists(conn, 'idx_creator_notif_created'):
        op.create_index('idx_creator_notif_created', 'creator_notifications', ['created_at'])
    if not index_exists(conn, 'idx_creator_notif_entity'):
        op.create_index('idx_creator_notif_entity', 'creator_notifications', ['entity_type', 'entity_id'])
    if not index_exists(conn, 'idx_creator_notif_user_id'):
        op.create_index('idx_creator_notif_user_id', 'creator_notifications', ['user_id'])
    if not index_exists(conn, 'idx_creator_notif_type'):
        op.create_index('idx_creator_notif_type', 'creator_notifications', ['type'])

    # Create notification_preferences table if it doesn't exist
    if not table_exists(conn, 'notification_preferences'):
        op.create_table(
            'notification_preferences',
            sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
            sa.Column('in_app_enabled', sa.Boolean, nullable=False, server_default='true'),
            sa.Column('email_enabled', sa.Boolean, nullable=False, server_default='true'),
            sa.Column('email_frequency', sa.String(20), nullable=False, server_default='instant'),
            sa.Column('digest_hour', sa.Integer, nullable=False, server_default='9'),
            sa.Column('last_digest_sent_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('type_settings', JSONB, nullable=False, server_default='{}'),
            sa.Column('muted_entities', JSONB, nullable=False, server_default='[]'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )

    if not index_exists(conn, 'idx_notif_prefs_user_id'):
        op.create_index('idx_notif_prefs_user_id', 'notification_preferences', ['user_id'])

    # Create notification_delivery_logs table if it doesn't exist
    if not table_exists(conn, 'notification_delivery_logs'):
        op.create_table(
            'notification_delivery_logs',
            sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('notification_type', sa.String(50), nullable=False),
            sa.Column('entity_type', sa.String(50), nullable=True),
            sa.Column('entity_id', UUID(as_uuid=True), nullable=True),
            sa.Column('dedup_key', sa.String(255), nullable=True),
            sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('channel', sa.String(20), nullable=False, server_default='in_app'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )

    # Create indexes for notification_delivery_logs if they don't exist
    if not index_exists(conn, 'idx_notif_delivery_dedup'):
        op.create_index('idx_notif_delivery_dedup', 'notification_delivery_logs',
                        ['user_id', 'notification_type', 'entity_type', 'entity_id', 'dedup_key'])
    if not index_exists(conn, 'idx_notif_delivery_time'):
        op.create_index('idx_notif_delivery_time', 'notification_delivery_logs',
                        ['user_id', 'notification_type', 'delivered_at'])
    if not index_exists(conn, 'idx_notif_delivery_user_id'):
        op.create_index('idx_notif_delivery_user_id', 'notification_delivery_logs', ['user_id'])

    # Add milestones_reached to content_pieces if not exists
    if not column_exists(conn, 'content_pieces', 'milestones_reached'):
        op.add_column('content_pieces',
                      sa.Column('milestones_reached', JSONB, nullable=True, server_default='[]'))

    # Add is_superfan column to fans if not exists (may already exist from model definition)
    if not column_exists(conn, 'fans', 'is_superfan'):
        op.add_column('fans',
                      sa.Column('is_superfan', sa.Boolean, nullable=False, server_default='false'))

    # Add became_superfan_at column to fans if not exists
    if not column_exists(conn, 'fans', 'became_superfan_at'):
        op.add_column('fans',
                      sa.Column('became_superfan_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()

    # Remove columns from fans if they exist
    if column_exists(conn, 'fans', 'became_superfan_at'):
        op.drop_column('fans', 'became_superfan_at')
    if column_exists(conn, 'fans', 'is_superfan'):
        op.drop_column('fans', 'is_superfan')

    # Remove column from content_pieces if it exists
    if column_exists(conn, 'content_pieces', 'milestones_reached'):
        op.drop_column('content_pieces', 'milestones_reached')

    # Drop notification_delivery_logs if it exists
    if table_exists(conn, 'notification_delivery_logs'):
        if index_exists(conn, 'idx_notif_delivery_user_id'):
            op.drop_index('idx_notif_delivery_user_id', table_name='notification_delivery_logs')
        if index_exists(conn, 'idx_notif_delivery_time'):
            op.drop_index('idx_notif_delivery_time', table_name='notification_delivery_logs')
        if index_exists(conn, 'idx_notif_delivery_dedup'):
            op.drop_index('idx_notif_delivery_dedup', table_name='notification_delivery_logs')
        op.drop_table('notification_delivery_logs')

    # Drop notification_preferences if it exists
    if table_exists(conn, 'notification_preferences'):
        if index_exists(conn, 'idx_notif_prefs_user_id'):
            op.drop_index('idx_notif_prefs_user_id', table_name='notification_preferences')
        op.drop_table('notification_preferences')

    # Drop creator_notifications if it exists
    if table_exists(conn, 'creator_notifications'):
        if index_exists(conn, 'idx_creator_notif_type'):
            op.drop_index('idx_creator_notif_type', table_name='creator_notifications')
        if index_exists(conn, 'idx_creator_notif_user_id'):
            op.drop_index('idx_creator_notif_user_id', table_name='creator_notifications')
        if index_exists(conn, 'idx_creator_notif_entity'):
            op.drop_index('idx_creator_notif_entity', table_name='creator_notifications')
        if index_exists(conn, 'idx_creator_notif_created'):
            op.drop_index('idx_creator_notif_created', table_name='creator_notifications')
        if index_exists(conn, 'idx_creator_notif_user_type'):
            op.drop_index('idx_creator_notif_user_type', table_name='creator_notifications')
        if index_exists(conn, 'idx_creator_notif_user_read'):
            op.drop_index('idx_creator_notif_user_read', table_name='creator_notifications')
        op.drop_table('creator_notifications')
