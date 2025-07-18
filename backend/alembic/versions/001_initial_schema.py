"""Initial database schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2024-03-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    # Note: pgvector should be enabled in Supabase dashboard
    
    # Create organizations table
    op.create_table('organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('subscription_tier', sa.String(50), server_default='trial'),
        sa.Column('subscription_status', sa.String(50), server_default='active'),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('billing_email', sa.String(255), nullable=True),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("type IN ('business', 'agency')", name='check_organization_type'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_customer_id'),
        sa.UniqueConstraint('stripe_subscription_id')
    )
    
    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('auth_id', sa.String(255), nullable=True, comment='Supabase Auth ID'),
        sa.Column('hashed_password', sa.String(255), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('auth_id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Create locations table
    op.create_table('locations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('google_place_id', sa.String(255), nullable=True),
        sa.Column('timezone', sa.String(50), server_default='Europe/London'),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('brand_voice_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('business_info', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('google_place_id')
    )
    op.create_index(op.f('ix_locations_google_place_id'), 'locations', ['google_place_id'], unique=True)
    
    # Create user_memberships table
    op.create_table('user_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, comment='Role: owner, admin, manager, member'),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=True, comment='NULL for org-wide roles'),
        sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("role IN ('owner', 'admin', 'manager', 'member')", name='check_membership_role'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'organization_id', 'location_id', name='uq_user_org_location')
    )
    
    # Create platform_connections table
    op.create_table('platform_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_info', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("platform IN ('google', 'facebook', 'tripadvisor', 'twitter')", name='check_platform_type'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('location_id', 'platform', name='uq_location_platform')
    )
    
    # Create reviews table
    op.create_table('reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('platform_review_id', sa.String(255), nullable=True),
        sa.Column('author_name', sa.String(255), nullable=True),
        sa.Column('author_id', sa.String(255), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('review_text', sa.Text(), nullable=True),
        sa.Column('review_reply', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('replied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sentiment', sa.String(50), nullable=True),
        sa.Column('sentiment_score', sa.Float(), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String()), server_default='{}'),
        sa.Column('staff_mentions', postgresql.ARRAY(sa.String()), server_default='{}'),
        sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('flag_reason', sa.String(255), nullable=True),
        sa.Column('meta_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
        sa.CheckConstraint("sentiment IN ('positive', 'negative', 'neutral', 'mixed')", name='check_sentiment_type'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('location_id', 'platform', 'platform_review_id')
    )
    
    # Create review_responses table
    op.create_table('review_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('review_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('response_text', sa.Text(), nullable=False),
        sa.Column('response_type', sa.String(50), nullable=False),
        sa.Column('ai_model', sa.String(50), nullable=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='draft'),
        sa.Column('approval_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approval_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("response_type IN ('ai_generated', 'manual', 'template', 'ai_edited')", name='check_response_type'),
        sa.CheckConstraint("status IN ('draft', 'pending_approval', 'approved', 'sent', 'failed')", name='check_response_status'),
        sa.ForeignKeyConstraint(['approval_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create response_templates table
    op.create_table('response_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('template_text', sa.Text(), nullable=False),
        sa.Column('placeholders', postgresql.ARRAY(sa.String()), server_default='{}'),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create automation_rules table
    op.create_table('automation_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trigger_type', sa.String(50), nullable=False),
        sa.Column('trigger_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('action_type', sa.String(50), nullable=False),
        sa.Column('action_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("trigger_type IN ('new_review', 'rating_threshold', 'keyword_match', 'sentiment')", name='check_trigger_type'),
        sa.CheckConstraint("action_type IN ('auto_reply', 'notification', 'tag', 'assign')", name='check_action_type'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create competitors table
    op.create_table('competitors',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('platform_id', sa.String(255), nullable=True),
        sa.Column('tracking_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create analytics_snapshots table
    op.create_table('analytics_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('location_id', 'date', name='uq_location_date')
    )
    
    # Create indexes for performance
    op.create_index('idx_reviews_location_date', 'reviews', ['location_id', 'published_at'])
    op.create_index('idx_reviews_sentiment', 'reviews', ['location_id', 'sentiment'])
    op.create_index('idx_reviews_rating', 'reviews', ['location_id', 'rating'])
    op.create_index('idx_reviews_platform', 'reviews', ['location_id', 'platform'])
    op.create_index('idx_user_memberships_user', 'user_memberships', ['user_id'])
    op.create_index('idx_user_memberships_org', 'user_memberships', ['organization_id'])
    op.create_index('idx_analytics_location_date', 'analytics_snapshots', ['location_id', 'date'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_analytics_location_date', table_name='analytics_snapshots')
    op.drop_index('idx_user_memberships_org', table_name='user_memberships')
    op.drop_index('idx_user_memberships_user', table_name='user_memberships')
    op.drop_index('idx_reviews_platform', table_name='reviews')
    op.drop_index('idx_reviews_rating', table_name='reviews')
    op.drop_index('idx_reviews_sentiment', table_name='reviews')
    op.drop_index('idx_reviews_location_date', table_name='reviews')
    
    # Drop tables in reverse order
    op.drop_table('analytics_snapshots')
    op.drop_table('competitors')
    op.drop_table('automation_rules')
    op.drop_table('response_templates')
    op.drop_table('review_responses')
    op.drop_table('reviews')
    op.drop_table('platform_connections')
    op.drop_table('user_memberships')
    op.drop_index(op.f('ix_locations_google_place_id'), table_name='locations')
    op.drop_table('locations')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_table('organizations')