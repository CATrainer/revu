"""enhance youtube and add instagram integration

Revision ID: 20251109_0030
Revises: 20251108_2046
Create Date: 2025-11-09 00:30:00

This migration:
1. Adds analytics and enrichment fields to YouTube tables
2. Creates Instagram tables (connections, media, comments, insights)
3. Adds all fields needed for Interaction/ContentPiece/Fan mapping
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '20251109_0030'
down_revision = '20251108_2046'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ========================================
    # PART 1: Enhance YouTube Tables
    # ========================================
    
    # Add channel metrics to youtube_connections
    op.add_column('youtube_connections', sa.Column('subscriber_count', sa.Integer(), nullable=True))
    op.add_column('youtube_connections', sa.Column('total_views', sa.BigInteger(), nullable=True))
    op.add_column('youtube_connections', sa.Column('video_count', sa.Integer(), nullable=True))
    op.add_column('youtube_connections', sa.Column('average_views_per_video', sa.Integer(), nullable=True))
    op.add_column('youtube_connections', sa.Column('engagement_rate', sa.Numeric(5, 2), nullable=True))
    op.add_column('youtube_connections', sa.Column('subscriber_growth_30d', sa.Integer(), nullable=True))
    op.add_column('youtube_connections', sa.Column('views_growth_30d', sa.Integer(), nullable=True))
    op.add_column('youtube_connections', sa.Column('last_metrics_update', sa.DateTime(timezone=True), nullable=True))
    
    # Add analytics and metadata to youtube_videos
    op.add_column('youtube_videos', sa.Column('category_id', sa.String(), nullable=True))
    op.add_column('youtube_videos', sa.Column('video_tags', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('youtube_videos', sa.Column('default_audio_language', sa.String(), nullable=True))
    op.add_column('youtube_videos', sa.Column('default_language', sa.String(), nullable=True))
    op.add_column('youtube_videos', sa.Column('impressions', sa.Integer(), nullable=True))
    op.add_column('youtube_videos', sa.Column('click_through_rate', sa.Numeric(5, 2), nullable=True))
    op.add_column('youtube_videos', sa.Column('average_view_duration', sa.Integer(), nullable=True))
    op.add_column('youtube_videos', sa.Column('average_view_percentage', sa.Numeric(5, 2), nullable=True))
    op.add_column('youtube_videos', sa.Column('watch_time_minutes', sa.Integer(), nullable=True))
    op.add_column('youtube_videos', sa.Column('subscribers_gained', sa.Integer(), nullable=True))
    op.add_column('youtube_videos', sa.Column('subscribers_lost', sa.Integer(), nullable=True))
    op.add_column('youtube_videos', sa.Column('engagement_rate', sa.Numeric(5, 2), nullable=True))
    op.add_column('youtube_videos', sa.Column('shares_count', sa.Integer(), nullable=True))
    op.add_column('youtube_videos', sa.Column('traffic_sources', postgresql.JSONB(), nullable=True))
    op.add_column('youtube_videos', sa.Column('device_types', postgresql.JSONB(), nullable=True))
    op.add_column('youtube_videos', sa.Column('audience_demographics', postgresql.JSONB(), nullable=True))
    op.add_column('youtube_videos', sa.Column('performance_score', sa.Numeric(5, 2), nullable=True))
    op.add_column('youtube_videos', sa.Column('percentile_rank', sa.Integer(), nullable=True))
    op.add_column('youtube_videos', sa.Column('is_trending', sa.Boolean(), server_default='false', nullable=False))
    
    # Add enrichment and management fields to youtube_comments
    op.add_column('youtube_comments', sa.Column('sentiment', sa.String(16), nullable=True))
    op.add_column('youtube_comments', sa.Column('priority_score', sa.Integer(), server_default='50', nullable=False))
    op.add_column('youtube_comments', sa.Column('categories', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('youtube_comments', sa.Column('detected_keywords', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('youtube_comments', sa.Column('language', sa.String(10), nullable=True))
    op.add_column('youtube_comments', sa.Column('status', sa.String(20), server_default='unread', nullable=False))
    op.add_column('youtube_comments', sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('youtube_comments', sa.Column('assigned_to_user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('youtube_comments', sa.Column('internal_notes', sa.Text(), nullable=True))
    op.add_column('youtube_comments', sa.Column('workflow_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('youtube_comments', sa.Column('workflow_action', sa.String(50), nullable=True))
    op.add_column('youtube_comments', sa.Column('replied_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('youtube_comments', sa.Column('response_text', sa.Text(), nullable=True))
    
    # Add foreign keys for youtube_comments
    op.create_foreign_key(
        'fk_youtube_comments_assigned_to_user',
        'youtube_comments', 'users',
        ['assigned_to_user_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_youtube_comments_workflow',
        'youtube_comments', 'workflows',
        ['workflow_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Add indexes for youtube_comments
    op.create_index('ix_youtube_comments_status', 'youtube_comments', ['status'])
    op.create_index('ix_youtube_comments_sentiment', 'youtube_comments', ['sentiment'])
    op.create_index('ix_youtube_comments_priority_score', 'youtube_comments', ['priority_score'])
    
    # ========================================
    # PART 2: Create Instagram Tables
    # ========================================
    
    # Instagram connections
    op.create_table(
        'instagram_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('instagram_user_id', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('account_type', sa.String(), nullable=True),
        sa.Column('profile_picture_url', sa.Text(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('follower_count', sa.Integer(), nullable=True),
        sa.Column('following_count', sa.Integer(), nullable=True),
        sa.Column('media_count', sa.Integer(), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('connection_status', sa.String(), nullable=False, server_default='active'),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('instagram_user_id', name='uq_instagram_connections_instagram_user_id')
    )
    op.create_index('ix_instagram_connections_user_id', 'instagram_connections', ['user_id'])
    
    # Instagram media
    op.create_table(
        'instagram_media',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('media_id', sa.String(), nullable=False),
        sa.Column('media_type', sa.String(), nullable=False),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('media_url', sa.Text(), nullable=True),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('permalink', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('like_count', sa.Integer(), nullable=True),
        sa.Column('comment_count', sa.Integer(), nullable=True),
        sa.Column('save_count', sa.Integer(), nullable=True),
        sa.Column('share_count', sa.Integer(), nullable=True),
        sa.Column('play_count', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('engagement_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('hashtags', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('is_story', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('story_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_fetched_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['connection_id'], ['instagram_connections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('media_id', name='uq_instagram_media_media_id')
    )
    op.create_index('ix_instagram_media_connection_id', 'instagram_media', ['connection_id'])
    op.create_index('ix_instagram_media_timestamp', 'instagram_media', ['timestamp'])
    
    # Instagram comments
    op.create_table(
        'instagram_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('media_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('comment_id', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('like_count', sa.Integer(), nullable=True),
        sa.Column('parent_comment_id', sa.String(), nullable=True),
        sa.Column('is_hidden', sa.Boolean(), nullable=False, server_default='false'),
        # Enrichment fields
        sa.Column('sentiment', sa.String(16), nullable=True),
        sa.Column('priority_score', sa.Integer(), server_default='50', nullable=False),
        sa.Column('categories', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('detected_keywords', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('language', sa.String(10), nullable=True),
        # Management fields
        sa.Column('status', sa.String(20), server_default='unread', nullable=False),
        sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('assigned_to_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('workflow_action', sa.String(50), nullable=True),
        sa.Column('replied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('response_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['media_id'], ['instagram_media.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('comment_id', name='uq_instagram_comments_comment_id')
    )
    op.create_index('ix_instagram_comments_media_id', 'instagram_comments', ['media_id'])
    op.create_index('ix_instagram_comments_status', 'instagram_comments', ['status'])
    op.create_index('ix_instagram_comments_sentiment', 'instagram_comments', ['sentiment'])
    op.create_index('ix_instagram_comments_priority_score', 'instagram_comments', ['priority_score'])
    
    # Instagram insights
    op.create_table(
        'instagram_insights',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('profile_views', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('website_clicks', sa.Integer(), nullable=True),
        sa.Column('email_contacts', sa.Integer(), nullable=True),
        sa.Column('phone_call_clicks', sa.Integer(), nullable=True),
        sa.Column('follower_count', sa.Integer(), nullable=True),
        sa.Column('follower_demographics', postgresql.JSONB(), nullable=True),
        sa.Column('audience_online_times', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['connection_id'], ['instagram_connections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('connection_id', 'date', name='uq_instagram_insights_connection_date')
    )
    op.create_index('ix_instagram_insights_connection_id', 'instagram_insights', ['connection_id'])
    op.create_index('ix_instagram_insights_date', 'instagram_insights', ['date'])


def downgrade() -> None:
    # Drop Instagram tables
    op.drop_table('instagram_insights')
    op.drop_table('instagram_comments')
    op.drop_table('instagram_media')
    op.drop_table('instagram_connections')
    
    # Remove YouTube comment enhancements
    op.drop_index('ix_youtube_comments_priority_score', 'youtube_comments')
    op.drop_index('ix_youtube_comments_sentiment', 'youtube_comments')
    op.drop_index('ix_youtube_comments_status', 'youtube_comments')
    op.drop_constraint('fk_youtube_comments_workflow', 'youtube_comments', type_='foreignkey')
    op.drop_constraint('fk_youtube_comments_assigned_to_user', 'youtube_comments', type_='foreignkey')
    op.drop_column('youtube_comments', 'response_text')
    op.drop_column('youtube_comments', 'replied_at')
    op.drop_column('youtube_comments', 'workflow_action')
    op.drop_column('youtube_comments', 'workflow_id')
    op.drop_column('youtube_comments', 'internal_notes')
    op.drop_column('youtube_comments', 'assigned_to_user_id')
    op.drop_column('youtube_comments', 'tags')
    op.drop_column('youtube_comments', 'status')
    op.drop_column('youtube_comments', 'language')
    op.drop_column('youtube_comments', 'detected_keywords')
    op.drop_column('youtube_comments', 'categories')
    op.drop_column('youtube_comments', 'priority_score')
    op.drop_column('youtube_comments', 'sentiment')
    
    # Remove YouTube video enhancements
    op.drop_column('youtube_videos', 'is_trending')
    op.drop_column('youtube_videos', 'percentile_rank')
    op.drop_column('youtube_videos', 'performance_score')
    op.drop_column('youtube_videos', 'audience_demographics')
    op.drop_column('youtube_videos', 'device_types')
    op.drop_column('youtube_videos', 'traffic_sources')
    op.drop_column('youtube_videos', 'shares_count')
    op.drop_column('youtube_videos', 'engagement_rate')
    op.drop_column('youtube_videos', 'subscribers_lost')
    op.drop_column('youtube_videos', 'subscribers_gained')
    op.drop_column('youtube_videos', 'watch_time_minutes')
    op.drop_column('youtube_videos', 'average_view_percentage')
    op.drop_column('youtube_videos', 'average_view_duration')
    op.drop_column('youtube_videos', 'click_through_rate')
    op.drop_column('youtube_videos', 'impressions')
    op.drop_column('youtube_videos', 'default_language')
    op.drop_column('youtube_videos', 'default_audio_language')
    op.drop_column('youtube_videos', 'video_tags')
    op.drop_column('youtube_videos', 'category_id')
    
    # Remove YouTube connection enhancements
    op.drop_column('youtube_connections', 'last_metrics_update')
    op.drop_column('youtube_connections', 'views_growth_30d')
    op.drop_column('youtube_connections', 'subscriber_growth_30d')
    op.drop_column('youtube_connections', 'engagement_rate')
    op.drop_column('youtube_connections', 'average_views_per_video')
    op.drop_column('youtube_connections', 'video_count')
    op.drop_column('youtube_connections', 'total_views')
    op.drop_column('youtube_connections', 'subscriber_count')
