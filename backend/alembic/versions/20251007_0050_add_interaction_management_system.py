"""Add Interaction Management System - Views, Interactions, Fans, Threads

Revision ID: 20251007_0050
Revises: 20251001_2127
Create Date: 2025-10-07 00:50:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

# revision identifiers
revision = '20251007_0050'
down_revision = '20251001_2127'
branch_labels = None
depends_on = None


def upgrade():
    # ==================== INTERACTIONS ====================
    op.create_table(
        'interactions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('platform', sa.String(32), nullable=False),
        sa.Column('type', sa.String(16), nullable=False),
        sa.Column('platform_id', sa.String(255), nullable=False, unique=True),
        
        # Content
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('media_urls', ARRAY(sa.Text)),
        
        # Author info
        sa.Column('author_name', sa.String(255)),
        sa.Column('author_username', sa.String(255)),
        sa.Column('author_profile_url', sa.Text),
        sa.Column('author_avatar_url', sa.Text),
        sa.Column('author_follower_count', sa.Integer),
        sa.Column('author_is_verified', sa.Boolean, default=False),
        
        # Context
        sa.Column('parent_content_id', sa.String(255)),
        sa.Column('parent_content_title', sa.Text),
        sa.Column('parent_content_url', sa.Text),
        sa.Column('is_reply', sa.Boolean, default=False),
        sa.Column('reply_to_id', UUID(as_uuid=True)),
        
        # Enriched data (AI-powered)
        sa.Column('sentiment', sa.String(16)),
        sa.Column('priority_score', sa.Integer, default=50),
        sa.Column('categories', ARRAY(sa.String(50))),
        sa.Column('detected_keywords', ARRAY(sa.String(100))),
        sa.Column('language', sa.String(10)),
        
        # Relations
        sa.Column('thread_id', UUID(as_uuid=True)),
        sa.Column('fan_id', UUID(as_uuid=True)),
        
        # Workflow tracking
        sa.Column('triggered_workflows', ARRAY(UUID(as_uuid=True))),
        sa.Column('applied_actions', JSONB),
        
        # Metadata
        sa.Column('tags', ARRAY(sa.String(50))),
        sa.Column('status', sa.String(20), default='unread'),
        sa.Column('assigned_to_user_id', UUID(as_uuid=True)),
        sa.Column('internal_notes', sa.Text),
        
        # Engagement metrics
        sa.Column('like_count', sa.Integer, default=0),
        sa.Column('reply_count', sa.Integer, default=0),
        
        # Timestamps
        sa.Column('platform_created_at', sa.DateTime),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('read_at', sa.DateTime),
        sa.Column('replied_at', sa.DateTime),
        
        # Foreign keys
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE')),
    )
    
    # Indexes for performance
    op.create_index('idx_interactions_user_status', 'interactions', ['user_id', 'status'])
    op.create_index('idx_interactions_priority', 'interactions', ['user_id', 'priority_score'])
    op.create_index('idx_interactions_platform', 'interactions', ['platform', 'type'])
    op.create_index('idx_interactions_thread', 'interactions', ['thread_id'])
    op.create_index('idx_interactions_fan', 'interactions', ['fan_id'])
    op.create_index('idx_interactions_created', 'interactions', ['created_at'])
    op.create_index('idx_interactions_platform_id', 'interactions', ['platform_id'])
    
    # ==================== INTERACTION THREADS ====================
    op.create_table(
        'interaction_threads',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('author_username', sa.String(255), nullable=False),
        sa.Column('author_name', sa.String(255)),
        sa.Column('platform', sa.String(32), nullable=False),
        
        # Thread metadata
        sa.Column('interaction_count', sa.Integer, default=1),
        sa.Column('first_interaction_at', sa.DateTime),
        sa.Column('last_interaction_at', sa.DateTime),
        sa.Column('sentiment_summary', sa.String(16)),
        sa.Column('is_customer', sa.Boolean, default=False),
        sa.Column('total_revenue', sa.Numeric(10, 2), default=0),
        
        # Foreign keys
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fan_id', UUID(as_uuid=True)),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    op.create_index('idx_threads_user_author', 'interaction_threads', ['user_id', 'author_username'])
    op.create_index('idx_threads_fan', 'interaction_threads', ['fan_id'])
    
    # ==================== VIEWS ====================
    op.create_table(
        'interaction_views',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('icon', sa.String(50), default='📋'),
        sa.Column('color', sa.String(20), default='#3b82f6'),
        sa.Column('type', sa.String(20), default='custom'),
        
        # Filter configuration
        sa.Column('filters', JSONB, nullable=False, server_default='{}'),
        
        # Display preferences
        sa.Column('display', JSONB, nullable=False, server_default='{"sortBy": "newest", "showReplies": true, "density": "comfortable"}'),
        
        # Metadata
        sa.Column('is_pinned', sa.Boolean, default=False),
        sa.Column('is_shared', sa.Boolean, default=False),
        sa.Column('is_template', sa.Boolean, default=False),
        sa.Column('is_system', sa.Boolean, default=False),
        sa.Column('order_index', sa.Integer, default=0),
        
        # Connected workflows
        sa.Column('workflow_ids', ARRAY(UUID(as_uuid=True))),
        
        # Foreign keys
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE')),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    op.create_index('idx_views_user', 'interaction_views', ['user_id'])
    op.create_index('idx_views_pinned', 'interaction_views', ['user_id', 'is_pinned'])
    op.create_index('idx_views_shared', 'interaction_views', ['organization_id', 'is_shared'])
    
    # ==================== FANS (CRM) ====================
    op.create_table(
        'fans',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('username', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255)),
        sa.Column('email', sa.String(255)),
        sa.Column('phone', sa.String(50)),
        
        # Profile info
        sa.Column('avatar_url', sa.Text),
        sa.Column('profile_url', sa.Text),
        sa.Column('bio', sa.Text),
        sa.Column('platforms', JSONB),
        
        # Engagement metrics
        sa.Column('total_interactions', sa.Integer, default=0),
        sa.Column('first_interaction_at', sa.DateTime),
        sa.Column('last_interaction_at', sa.DateTime),
        sa.Column('avg_sentiment', sa.String(16)),
        sa.Column('engagement_score', sa.Integer, default=0),
        
        # Classification
        sa.Column('is_superfan', sa.Boolean, default=False),
        sa.Column('is_vip', sa.Boolean, default=False),
        sa.Column('is_customer', sa.Boolean, default=False),
        sa.Column('is_blocked', sa.Boolean, default=False),
        sa.Column('tags', ARRAY(sa.String(50))),
        
        # Revenue
        sa.Column('lifetime_value', sa.Numeric(10, 2), default=0),
        sa.Column('purchase_count', sa.Integer, default=0),
        sa.Column('last_purchase_at', sa.DateTime),
        
        # Notes
        sa.Column('notes', sa.Text),
        sa.Column('custom_fields', JSONB),
        
        # Foreign keys
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE')),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    op.create_index('idx_fans_user', 'fans', ['user_id'])
    op.create_index('idx_fans_username', 'fans', ['user_id', 'username'])
    op.create_index('idx_fans_superfan', 'fans', ['user_id', 'is_superfan'])
    op.create_index('idx_fans_engagement', 'fans', ['user_id', 'engagement_score'])
    
    # ==================== INTERACTION ANALYTICS ====================
    op.create_table(
        'interaction_analytics',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('hour', sa.Integer),
        
        # Counts
        sa.Column('total_interactions', sa.Integer, default=0),
        sa.Column('total_replied', sa.Integer, default=0),
        sa.Column('total_archived', sa.Integer, default=0),
        sa.Column('total_spam', sa.Integer, default=0),
        
        # By type
        sa.Column('comments_count', sa.Integer, default=0),
        sa.Column('dms_count', sa.Integer, default=0),
        sa.Column('mentions_count', sa.Integer, default=0),
        
        # By priority
        sa.Column('urgent_count', sa.Integer, default=0),
        sa.Column('important_count', sa.Integer, default=0),
        
        # Sentiment
        sa.Column('positive_count', sa.Integer, default=0),
        sa.Column('negative_count', sa.Integer, default=0),
        sa.Column('neutral_count', sa.Integer, default=0),
        
        # Performance
        sa.Column('avg_response_time_minutes', sa.Integer),
        sa.Column('response_rate', sa.Numeric(5, 2)),
        
        # Revenue
        sa.Column('sales_count', sa.Integer, default=0),
        sa.Column('revenue', sa.Numeric(10, 2), default=0),
        sa.Column('collab_opportunities', sa.Integer, default=0),
        
        # Foreign keys
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('view_id', UUID(as_uuid=True), sa.ForeignKey('interaction_views.id', ondelete='CASCADE')),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    op.create_index('idx_analytics_user_date', 'interaction_analytics', ['user_id', 'date'])
    op.create_index('idx_analytics_view', 'interaction_analytics', ['view_id', 'date'])
    
    # Add foreign key constraints
    op.create_foreign_key('fk_interactions_thread', 'interactions', 'interaction_threads', ['thread_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_interactions_fan', 'interactions', 'fans', ['fan_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_threads_fan', 'interaction_threads', 'fans', ['fan_id'], ['id'], ondelete='SET NULL')
    
    print("✅ Interaction Management System tables created successfully!")


def downgrade():
    op.drop_table('interaction_analytics')
    op.drop_table('fans')
    op.drop_table('interaction_views')
    op.drop_table('interaction_threads')
    op.drop_table('interactions')
    print("✅ Interaction Management System tables dropped")
