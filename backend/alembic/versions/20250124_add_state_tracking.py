"""Add state tracking for async operations

Revision ID: 20250124_state_tracking
Revises: previous_revision
Create Date: 2025-01-24 18:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250124_state_tracking'
down_revision = None  # Update with actual previous revision
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add state tracking fields for async operations."""
    
    # 1. Add demo_mode_status to users table
    op.add_column('users', sa.Column('demo_mode_status', sa.String(20), nullable=False, server_default='disabled'))
    op.add_column('users', sa.Column('demo_mode_error', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('demo_profile_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('demo_mode_disabled_at', sa.DateTime(timezone=True), nullable=True))
    
    # Migrate existing demo_mode boolean to demo_mode_status
    op.execute("""
        UPDATE users 
        SET demo_mode_status = CASE 
            WHEN demo_mode = TRUE THEN 'enabled'
            ELSE 'disabled'
        END
    """)
    
    # Add check constraint for demo_mode_status
    op.create_check_constraint(
        'demo_mode_status_check',
        'users',
        "demo_mode_status IN ('disabled', 'enabling', 'enabled', 'disabling', 'failed')"
    )
    
    # 2. Add connection_status to platform_connections table
    op.add_column('platform_connections', sa.Column('connection_status', sa.String(20), nullable=False, server_default='disconnected'))
    op.add_column('platform_connections', sa.Column('connection_error', sa.Text(), nullable=True))
    op.add_column('platform_connections', sa.Column('oauth_state', sa.String(255), nullable=True))
    op.add_column('platform_connections', sa.Column('last_token_refresh_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('platform_connections', sa.Column('next_token_refresh_at', sa.DateTime(timezone=True), nullable=True))
    
    # Migrate existing connections to 'connected' status if they have tokens
    op.execute("""
        UPDATE platform_connections 
        SET connection_status = CASE 
            WHEN access_token IS NOT NULL AND is_active = TRUE THEN 'connected'
            ELSE 'disconnected'
        END
    """)
    
    # Add check constraint for connection_status
    op.create_check_constraint(
        'connection_status_check',
        'platform_connections',
        "connection_status IN ('disconnected', 'connecting', 'connected', 'refreshing', 'failed')"
    )
    
    # 3. Create background_jobs table
    op.create_table(
        'background_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('job_type', sa.String(50), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_details', postgresql.JSONB(), nullable=True),
        sa.Column('result_data', postgresql.JSONB(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_retries', sa.Integer(), nullable=False, server_default='3'),
    )
    
    # Add check constraint for job status
    op.create_check_constraint(
        'job_status_check',
        'background_jobs',
        "status IN ('pending', 'running', 'completed', 'failed', 'cancelled')"
    )
    
    # Create indexes for background_jobs
    op.create_index('idx_background_jobs_user_id', 'background_jobs', ['user_id'])
    op.create_index('idx_background_jobs_status', 'background_jobs', ['status'])
    op.create_index('idx_background_jobs_created_at', 'background_jobs', ['created_at'])
    op.create_index('idx_background_jobs_job_type', 'background_jobs', ['job_type'])
    
    # 4. Create user_sessions table
    op.create_table(
        'user_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_token', sa.String(255), nullable=False, unique=True),
        sa.Column('refresh_token', sa.String(255), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('ip_address', postgresql.INET(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('is_valid', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Create indexes for user_sessions
    op.create_index('idx_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('idx_user_sessions_session_token', 'user_sessions', ['session_token'])
    op.create_index('idx_user_sessions_expires_at', 'user_sessions', ['expires_at'])


def downgrade() -> None:
    """Remove state tracking fields."""
    
    # Drop tables
    op.drop_table('user_sessions')
    op.drop_table('background_jobs')
    
    # Remove platform_connections columns
    op.drop_column('platform_connections', 'next_token_refresh_at')
    op.drop_column('platform_connections', 'last_token_refresh_at')
    op.drop_column('platform_connections', 'oauth_state')
    op.drop_column('platform_connections', 'connection_error')
    op.drop_column('platform_connections', 'connection_status')
    
    # Remove users columns
    op.drop_column('users', 'demo_mode_disabled_at')
    op.drop_column('users', 'demo_profile_id')
    op.drop_column('users', 'demo_mode_error')
    op.drop_column('users', 'demo_mode_status')
