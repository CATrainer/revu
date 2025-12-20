"""Interactions system overhaul - enriched context, archive lifecycle, sent responses

Revision ID: 20251216_1900
Revises: 20251216_1700
Create Date: 2025-12-16 19:00:00.000000

This migration adds:
1. Enriched interaction fields (thumbnail, view count, conversation history)
2. Archive lifecycle fields (archived_at, archive_source, last_activity_at)
3. Workflow processing tracking
4. sent_responses table for tracking all sent responses
5. Updated interaction_views for natural language filters
6. Updated workflows table for priority system
7. User archive preferences
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY


# revision identifiers, used by Alembic.
revision = '20251216_1900'
down_revision = '20251216_1700'
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

    # ==========================================================================
    # 1. INTERACTIONS TABLE - Add enrichment and archive fields
    # ==========================================================================
    
    # Post/Video Context enrichment
    if not column_exists(conn, 'interactions', 'parent_content_thumbnail_url'):
        op.add_column('interactions', sa.Column('parent_content_thumbnail_url', sa.Text, nullable=True))
    
    if not column_exists(conn, 'interactions', 'parent_content_view_count'):
        op.add_column('interactions', sa.Column('parent_content_view_count', sa.Integer, nullable=True))
    
    # Conversation history for DMs
    if not column_exists(conn, 'interactions', 'conversation_history'):
        op.add_column('interactions', sa.Column('conversation_history', JSONB, nullable=True))
    
    # Activity tracking
    if not column_exists(conn, 'interactions', 'last_activity_at'):
        op.add_column('interactions', sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True))
        # Initialize with created_at for existing records
        op.execute("UPDATE interactions SET last_activity_at = created_at WHERE last_activity_at IS NULL")
    
    # Archive lifecycle
    if not column_exists(conn, 'interactions', 'archived_at'):
        op.add_column('interactions', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))
    
    if not column_exists(conn, 'interactions', 'archive_source'):
        op.add_column('interactions', sa.Column('archive_source', sa.String(20), nullable=True))
    
    # Workflow processing tracking
    if not column_exists(conn, 'interactions', 'processed_by_workflow_id'):
        op.add_column('interactions', sa.Column('processed_by_workflow_id', UUID(as_uuid=True), nullable=True))
    
    if not column_exists(conn, 'interactions', 'processed_at'):
        op.add_column('interactions', sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True))
    
    # Create indexes for new columns
    if not index_exists(conn, 'idx_interactions_last_activity'):
        op.create_index('idx_interactions_last_activity', 'interactions', ['last_activity_at'])
    
    if not index_exists(conn, 'idx_interactions_archived'):
        op.create_index('idx_interactions_archived', 'interactions', ['archived_at'], 
                       postgresql_where=sa.text('archived_at IS NOT NULL'))
    
    if not index_exists(conn, 'idx_interactions_processed_workflow'):
        op.create_index('idx_interactions_processed_workflow', 'interactions', ['processed_by_workflow_id'])

    # ==========================================================================
    # 2. SENT_RESPONSES TABLE - Track all sent responses
    # ==========================================================================
    
    if not table_exists(conn, 'sent_responses'):
        op.create_table(
            'sent_responses',
            sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('interaction_id', UUID(as_uuid=True), sa.ForeignKey('interactions.id', ondelete='CASCADE'), nullable=False),
            sa.Column('response_text', sa.Text, nullable=False),
            
            # Response type
            sa.Column('response_type', sa.String(20), nullable=False),  # manual, semi_automated, automated
            
            # AI generation details
            sa.Column('ai_model', sa.String(50), nullable=True),
            sa.Column('ai_confidence', sa.Float, nullable=True),
            sa.Column('was_edited', sa.Boolean, default=False),
            sa.Column('original_ai_text', sa.Text, nullable=True),
            
            # Workflow attribution
            sa.Column('workflow_id', UUID(as_uuid=True), sa.ForeignKey('workflows.id', ondelete='SET NULL'), nullable=True),
            
            # Platform response
            sa.Column('platform_response_id', sa.String(255), nullable=True),
            sa.Column('platform_error', sa.Text, nullable=True),
            
            # Timestamps
            sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            
            # Ownership
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('organization_id', UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True),
            
            # Demo mode
            sa.Column('is_demo', sa.Boolean, default=False, nullable=False),
        )
        
        # Indexes for sent_responses
        op.create_index('idx_sent_responses_interaction', 'sent_responses', ['interaction_id'])
        op.create_index('idx_sent_responses_user', 'sent_responses', ['user_id'])
        op.create_index('idx_sent_responses_sent_at', 'sent_responses', ['sent_at'])
        op.create_index('idx_sent_responses_type', 'sent_responses', ['response_type'])

    # ==========================================================================
    # 3. INTERACTION_VIEWS TABLE - Add natural language filter support
    # ==========================================================================
    
    if not column_exists(conn, 'interaction_views', 'natural_language_filter'):
        op.add_column('interaction_views', sa.Column('natural_language_filter', sa.Text, nullable=True))
    
    if not column_exists(conn, 'interaction_views', 'compiled_filters'):
        op.add_column('interaction_views', sa.Column('compiled_filters', JSONB, nullable=True))
    
    if not column_exists(conn, 'interaction_views', 'filter_compiled_at'):
        op.add_column('interaction_views', sa.Column('filter_compiled_at', sa.DateTime(timezone=True), nullable=True))
    
    if not column_exists(conn, 'interaction_views', 'filter_compiler_model'):
        op.add_column('interaction_views', sa.Column('filter_compiler_model', sa.String(50), nullable=True))

    # ==========================================================================
    # 4. WORKFLOWS TABLE - Add priority system and enhanced conditions
    # ==========================================================================
    
    if not column_exists(conn, 'workflows', 'type'):
        op.add_column('workflows', sa.Column('type', sa.String(20), nullable=True, server_default='custom'))
        op.execute("UPDATE workflows SET type = 'custom' WHERE type IS NULL")
    
    if not column_exists(conn, 'workflows', 'priority'):
        op.add_column('workflows', sa.Column('priority', sa.Integer, nullable=True, server_default='100'))
        op.execute("UPDATE workflows SET priority = 100 WHERE priority IS NULL")
    
    if not column_exists(conn, 'workflows', 'is_enabled'):
        op.add_column('workflows', sa.Column('is_enabled', sa.Boolean, nullable=True, server_default='true'))
        op.execute("UPDATE workflows SET is_enabled = true WHERE is_enabled IS NULL")
    
    if not column_exists(conn, 'workflows', 'natural_language_conditions'):
        op.add_column('workflows', sa.Column('natural_language_conditions', ARRAY(sa.Text), nullable=True))
    
    if not column_exists(conn, 'workflows', 'compiled_conditions'):
        op.add_column('workflows', sa.Column('compiled_conditions', JSONB, nullable=True))
    
    if not column_exists(conn, 'workflows', 'platforms'):
        op.add_column('workflows', sa.Column('platforms', ARRAY(sa.String(32)), nullable=True))
    
    if not column_exists(conn, 'workflows', 'interaction_types'):
        op.add_column('workflows', sa.Column('interaction_types', ARRAY(sa.String(16)), nullable=True))
    
    if not column_exists(conn, 'workflows', 'action_type'):
        op.add_column('workflows', sa.Column('action_type', sa.String(50), nullable=True))
    
    if not column_exists(conn, 'workflows', 'action_config'):
        op.add_column('workflows', sa.Column('action_config', JSONB, nullable=True))
    
    # Index for workflow priority ordering
    if not index_exists(conn, 'idx_workflows_priority'):
        op.create_index('idx_workflows_priority', 'workflows', ['user_id', 'priority'])

    # ==========================================================================
    # 5. USERS TABLE - Add archive preferences
    # ==========================================================================
    
    if not column_exists(conn, 'users', 'archive_inactive_days'):
        op.add_column('users', sa.Column('archive_inactive_days', sa.Integer, nullable=True, server_default='7'))
    
    if not column_exists(conn, 'users', 'archive_delete_days'):
        op.add_column('users', sa.Column('archive_delete_days', sa.Integer, nullable=True, server_default='30'))

    # ==========================================================================
    # 6. AUTO_MODERATOR_SETTINGS TABLE - Per-user moderation config
    # ==========================================================================
    
    if not table_exists(conn, 'auto_moderator_settings'):
        op.create_table(
            'auto_moderator_settings',
            sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
            
            # Per-platform actions for comments
            sa.Column('youtube_comment_action', sa.String(30), nullable=True, server_default="'delete'"),  # delete, hide, report, none
            sa.Column('instagram_comment_action', sa.String(30), nullable=True, server_default="'delete'"),
            sa.Column('tiktok_comment_action', sa.String(30), nullable=True, server_default="'delete'"),
            sa.Column('twitter_comment_action', sa.String(30), nullable=True, server_default="'hide'"),
            
            # Per-platform actions for DMs
            sa.Column('youtube_dm_action', sa.String(30), nullable=True, server_default="'block'"),
            sa.Column('instagram_dm_action', sa.String(30), nullable=True, server_default="'block'"),
            sa.Column('tiktok_dm_action', sa.String(30), nullable=True, server_default="'block'"),
            sa.Column('twitter_dm_action', sa.String(30), nullable=True, server_default="'block'"),
            
            # Per-platform actions for mentions
            sa.Column('youtube_mention_action', sa.String(30), nullable=True, server_default="'block'"),
            sa.Column('instagram_mention_action', sa.String(30), nullable=True, server_default="'block'"),
            sa.Column('tiktok_mention_action', sa.String(30), nullable=True, server_default="'block'"),
            sa.Column('twitter_mention_action', sa.String(30), nullable=True, server_default="'mute'"),
            
            # Timestamps
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        
        op.create_index('idx_auto_moderator_settings_user', 'auto_moderator_settings', ['user_id'])


def downgrade() -> None:
    conn = op.get_bind()
    
    # Drop auto_moderator_settings table
    if table_exists(conn, 'auto_moderator_settings'):
        op.drop_index('idx_auto_moderator_settings_user', table_name='auto_moderator_settings')
        op.drop_table('auto_moderator_settings')
    
    # Remove user archive preferences
    if column_exists(conn, 'users', 'archive_inactive_days'):
        op.drop_column('users', 'archive_inactive_days')
    if column_exists(conn, 'users', 'archive_delete_days'):
        op.drop_column('users', 'archive_delete_days')
    
    # Remove workflow enhancements
    workflow_columns = [
        'type', 'priority', 'is_enabled', 'natural_language_conditions',
        'compiled_conditions', 'platforms', 'interaction_types', 'action_type', 'action_config'
    ]
    for col in workflow_columns:
        if column_exists(conn, 'workflows', col):
            op.drop_column('workflows', col)
    
    if index_exists(conn, 'idx_workflows_priority'):
        op.drop_index('idx_workflows_priority', table_name='workflows')
    
    # Remove view enhancements
    view_columns = ['natural_language_filter', 'compiled_filters', 'filter_compiled_at', 'filter_compiler_model']
    for col in view_columns:
        if column_exists(conn, 'interaction_views', col):
            op.drop_column('interaction_views', col)
    
    # Drop sent_responses table
    if table_exists(conn, 'sent_responses'):
        op.drop_index('idx_sent_responses_type', table_name='sent_responses')
        op.drop_index('idx_sent_responses_sent_at', table_name='sent_responses')
        op.drop_index('idx_sent_responses_user', table_name='sent_responses')
        op.drop_index('idx_sent_responses_interaction', table_name='sent_responses')
        op.drop_table('sent_responses')
    
    # Remove interaction enhancements
    interaction_columns = [
        'parent_content_thumbnail_url', 'parent_content_view_count', 'conversation_history',
        'last_activity_at', 'archived_at', 'archive_source', 'processed_by_workflow_id', 'processed_at'
    ]
    for col in interaction_columns:
        if column_exists(conn, 'interactions', col):
            op.drop_column('interactions', col)
    
    if index_exists(conn, 'idx_interactions_processed_workflow'):
        op.drop_index('idx_interactions_processed_workflow', table_name='interactions')
    if index_exists(conn, 'idx_interactions_archived'):
        op.drop_index('idx_interactions_archived', table_name='interactions')
    if index_exists(conn, 'idx_interactions_last_activity'):
        op.drop_index('idx_interactions_last_activity', table_name='interactions')
