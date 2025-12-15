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


def upgrade() -> None:
    # Create creator_notifications table
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
    
    # Create indexes for creator_notifications
    op.create_index('idx_creator_notif_user_read', 'creator_notifications', ['user_id', 'is_read'])
    op.create_index('idx_creator_notif_user_type', 'creator_notifications', ['user_id', 'type'])
    op.create_index('idx_creator_notif_created', 'creator_notifications', ['created_at'])
    op.create_index('idx_creator_notif_entity', 'creator_notifications', ['entity_type', 'entity_id'])
    op.create_index('idx_creator_notif_user_id', 'creator_notifications', ['user_id'])
    op.create_index('idx_creator_notif_type', 'creator_notifications', ['type'])

    # Create notification_preferences table
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
    
    op.create_index('idx_notif_prefs_user_id', 'notification_preferences', ['user_id'])

    # Create notification_delivery_logs table
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
    
    # Create indexes for notification_delivery_logs
    op.create_index('idx_notif_delivery_dedup', 'notification_delivery_logs', 
                    ['user_id', 'notification_type', 'entity_type', 'entity_id', 'dedup_key'])
    op.create_index('idx_notif_delivery_time', 'notification_delivery_logs', 
                    ['user_id', 'notification_type', 'delivered_at'])
    op.create_index('idx_notif_delivery_user_id', 'notification_delivery_logs', ['user_id'])

    # Add milestones_reached to content_pieces if not exists
    op.add_column('content_pieces', 
                  sa.Column('milestones_reached', JSONB, nullable=True, server_default='[]'))

    # Add is_superfan and became_superfan_at to fans if not exists
    op.add_column('fans',
                  sa.Column('is_superfan', sa.Boolean, nullable=False, server_default='false'))
    op.add_column('fans',
                  sa.Column('became_superfan_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove columns from fans
    op.drop_column('fans', 'became_superfan_at')
    op.drop_column('fans', 'is_superfan')
    
    # Remove column from content_pieces
    op.drop_column('content_pieces', 'milestones_reached')
    
    # Drop notification_delivery_logs
    op.drop_index('idx_notif_delivery_user_id', table_name='notification_delivery_logs')
    op.drop_index('idx_notif_delivery_time', table_name='notification_delivery_logs')
    op.drop_index('idx_notif_delivery_dedup', table_name='notification_delivery_logs')
    op.drop_table('notification_delivery_logs')
    
    # Drop notification_preferences
    op.drop_index('idx_notif_prefs_user_id', table_name='notification_preferences')
    op.drop_table('notification_preferences')
    
    # Drop creator_notifications
    op.drop_index('idx_creator_notif_type', table_name='creator_notifications')
    op.drop_index('idx_creator_notif_user_id', table_name='creator_notifications')
    op.drop_index('idx_creator_notif_entity', table_name='creator_notifications')
    op.drop_index('idx_creator_notif_created', table_name='creator_notifications')
    op.drop_index('idx_creator_notif_user_type', table_name='creator_notifications')
    op.drop_index('idx_creator_notif_user_read', table_name='creator_notifications')
    op.drop_table('creator_notifications')
