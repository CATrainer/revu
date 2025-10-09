"""Add insights feature tables

Revision ID: 20251010_insights
Revises: 
Create Date: 2025-10-10 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY


# revision identifiers, used by Alembic.
revision = '20251010_insights'
down_revision = '20251010_merge'  # Points to merge migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create content_pieces table
    op.create_table(
        'content_pieces',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE')),
        sa.Column('platform', sa.String(32), nullable=False),
        sa.Column('platform_id', sa.String(255), nullable=False, unique=True),
        sa.Column('content_type', sa.String(50), nullable=False),
        sa.Column('title', sa.Text, nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('url', sa.Text, nullable=False),
        sa.Column('thumbnail_url', sa.Text),
        sa.Column('duration_seconds', sa.Integer),
        sa.Column('hashtags', ARRAY(sa.String(100))),
        sa.Column('mentions', ARRAY(sa.String(100))),
        sa.Column('caption', sa.Text),
        sa.Column('published_at', sa.DateTime, nullable=False),
        sa.Column('timezone', sa.String(50)),
        sa.Column('day_of_week', sa.Integer),
        sa.Column('hour_of_day', sa.Integer),
        sa.Column('follower_count_at_post', sa.Integer),
        sa.Column('theme', sa.String(100)),
        sa.Column('summary', sa.Text),
        sa.Column('detected_topics', ARRAY(sa.String(100))),
        sa.Column('is_deleted', sa.Boolean, default=False),
        sa.Column('last_synced_at', sa.DateTime),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()'), onupdate=sa.text('now()')),
    )
    
    # Create indexes for content_pieces
    op.create_index('idx_content_user_platform', 'content_pieces', ['user_id', 'platform'])
    op.create_index('idx_content_published', 'content_pieces', ['user_id', 'published_at'])
    op.create_index('idx_content_theme', 'content_pieces', ['user_id', 'theme'])
    op.create_index('idx_content_platform', 'content_pieces', ['platform'])
    op.create_index('idx_content_type', 'content_pieces', ['content_type'])
    op.create_index('idx_content_platform_id', 'content_pieces', ['platform_id'])
    
    # Create content_performance table
    op.create_table(
        'content_performance',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('content_id', UUID(as_uuid=True), sa.ForeignKey('content_pieces.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('views', sa.Integer, default=0),
        sa.Column('impressions', sa.Integer, default=0),
        sa.Column('likes', sa.Integer, default=0),
        sa.Column('comments_count', sa.Integer, default=0),
        sa.Column('shares', sa.Integer, default=0),
        sa.Column('saves', sa.Integer, default=0),
        sa.Column('watch_time_minutes', sa.Integer),
        sa.Column('average_view_duration_seconds', sa.Integer),
        sa.Column('retention_rate', sa.Numeric(5, 2)),
        sa.Column('engagement_rate', sa.Numeric(5, 2)),
        sa.Column('click_through_rate', sa.Numeric(5, 2)),
        sa.Column('followers_gained', sa.Integer, default=0),
        sa.Column('profile_visits', sa.Integer, default=0),
        sa.Column('revenue', sa.Numeric(10, 2)),
        sa.Column('performance_score', sa.Numeric(5, 2)),
        sa.Column('percentile_rank', sa.Integer),
        sa.Column('performance_category', sa.String(20)),
        sa.Column('views_last_24h', sa.Integer, default=0),
        sa.Column('engagement_last_24h', sa.Integer, default=0),
        sa.Column('platform_specific_metrics', JSONB),
        sa.Column('calculated_at', sa.DateTime, server_default=sa.text('now()')),
        sa.Column('last_updated', sa.DateTime, server_default=sa.text('now()'), onupdate=sa.text('now()')),
    )
    
    # Create indexes for content_performance
    op.create_index('idx_performance_content', 'content_performance', ['content_id'])
    op.create_index('idx_performance_category', 'content_performance', ['performance_category'])
    op.create_index('idx_performance_score', 'content_performance', ['performance_score'])
    
    # Create content_insights table
    op.create_table(
        'content_insights',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('content_id', UUID(as_uuid=True), sa.ForeignKey('content_pieces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('insight_type', sa.String(50), nullable=False),
        sa.Column('category', sa.String(100)),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('impact_level', sa.String(20)),
        sa.Column('supporting_data', JSONB),
        sa.Column('confidence_score', sa.Numeric(3, 2)),
        sa.Column('is_positive', sa.Boolean),
        sa.Column('is_actionable', sa.Boolean, default=False),
        sa.Column('generated_at', sa.DateTime, server_default=sa.text('now()')),
    )
    
    # Create indexes for content_insights
    op.create_index('idx_insight_content', 'content_insights', ['content_id'])
    op.create_index('idx_insight_content_type', 'content_insights', ['content_id', 'insight_type'])
    
    # Create content_themes table
    op.create_table(
        'content_themes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('color', sa.String(7)),
        sa.Column('content_count', sa.Integer, default=0),
        sa.Column('total_views', sa.Integer, default=0),
        sa.Column('avg_engagement_rate', sa.Numeric(5, 2)),
        sa.Column('avg_performance_score', sa.Numeric(5, 2)),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, server_default=sa.text('now()'), onupdate=sa.text('now()')),
        sa.Column('last_calculated_at', sa.DateTime),
    )
    
    # Create unique index for user_id + name
    op.create_index('idx_theme_user_name', 'content_themes', ['user_id', 'name'], unique=True)
    
    # Create action_plans table
    op.create_table(
        'action_plans',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('goal', sa.Text, nullable=False),
        sa.Column('source_type', sa.String(50)),
        sa.Column('source_content_id', UUID(as_uuid=True), sa.ForeignKey('content_pieces.id', ondelete='SET NULL')),
        sa.Column('source_chat_session_id', UUID(as_uuid=True), sa.ForeignKey('ai_chat_sessions.id', ondelete='SET NULL')),
        sa.Column('start_date', sa.DateTime),
        sa.Column('end_date', sa.DateTime),
        sa.Column('estimated_duration_days', sa.Integer),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('progress_percentage', sa.Integer, default=0),
        sa.Column('projected_outcomes', JSONB),
        sa.Column('actual_outcomes', JSONB),
        sa.Column('completion_notes', sa.Text),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, server_default=sa.text('now()'), onupdate=sa.text('now()')),
        sa.Column('completed_at', sa.DateTime),
    )
    
    # Create indexes for action_plans
    op.create_index('idx_action_plan_user', 'action_plans', ['user_id'])
    op.create_index('idx_action_plan_user_status', 'action_plans', ['user_id', 'status'])
    op.create_index('idx_action_plan_status', 'action_plans', ['status'])
    op.create_index('idx_action_plan_dates', 'action_plans', ['start_date', 'end_date'])
    
    # Create action_items table
    op.create_table(
        'action_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('plan_id', UUID(as_uuid=True), sa.ForeignKey('action_plans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('order_index', sa.Integer, nullable=False),
        sa.Column('due_date', sa.DateTime),
        sa.Column('estimated_hours', sa.Integer),
        sa.Column('is_completed', sa.Boolean, default=False),
        sa.Column('completed_at', sa.DateTime),
        sa.Column('projected_outcome', sa.Text),
        sa.Column('actual_outcome', sa.Text),
        sa.Column('linked_content_id', UUID(as_uuid=True), sa.ForeignKey('content_pieces.id', ondelete='SET NULL')),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, server_default=sa.text('now()'), onupdate=sa.text('now()')),
    )
    
    # Create indexes for action_items
    op.create_index('idx_action_item_plan', 'action_items', ['plan_id'])
    op.create_index('idx_action_item_plan_order', 'action_items', ['plan_id', 'order_index'])
    op.create_index('idx_action_item_completed', 'action_items', ['is_completed'])
    op.create_index('idx_action_item_due_date', 'action_items', ['due_date'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('action_items')
    op.drop_table('action_plans')
    op.drop_table('content_themes')
    op.drop_table('content_insights')
    op.drop_table('content_performance')
    op.drop_table('content_pieces')
