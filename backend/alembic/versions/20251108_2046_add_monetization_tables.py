"""add monetization tables

Revision ID: 20251108_2046
Revises: (check latest)
Create Date: 2025-11-08 20:46:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251108_2046'
down_revision = None  # TODO: Update with actual latest revision
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Creator Profiles table
    op.create_table(
        'creator_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('primary_platform', sa.String(length=50), nullable=False),
        sa.Column('follower_count', sa.Integer(), nullable=False),
        sa.Column('engagement_rate', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('niche', sa.String(length=100), nullable=False),
        sa.Column('platform_url', sa.String(length=500), nullable=True),
        sa.Column('avg_content_views', sa.Integer(), nullable=True),
        sa.Column('content_frequency', sa.Integer(), nullable=True),
        sa.Column('audience_demographics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('community_signals', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('creator_personality', sa.String(length=50), nullable=True),
        sa.Column('time_available_hours_per_week', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # Active Projects table
    op.create_table(
        'active_projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('opportunity_id', sa.String(length=100), nullable=False, server_default='premium-community'),
        sa.Column('opportunity_title', sa.String(length=200), nullable=False, server_default='Premium Community'),
        sa.Column('opportunity_category', sa.String(length=50), nullable=False, server_default='community'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('current_phase_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('overall_progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('planning_progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('execution_progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('timeline_progress', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('target_launch_date', sa.Date(), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('customized_plan', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("status IN ('active', 'completed', 'abandoned')", name='valid_status'),
        sa.CheckConstraint('overall_progress >= 0 AND overall_progress <= 100', name='valid_overall_progress'),
        sa.CheckConstraint('planning_progress >= 0 AND planning_progress <= 100', name='valid_planning_progress'),
        sa.CheckConstraint('execution_progress >= 0 AND execution_progress <= 100', name='valid_execution_progress'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='one_project_per_user')
    )
    op.create_index('idx_active_projects_user', 'active_projects', ['user_id'])
    op.create_index('idx_active_projects_status', 'active_projects', ['status'])
    
    # Project Chat Messages table
    op.create_table(
        'project_chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('detected_actions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("role IN ('user', 'assistant')", name='valid_role'),
        sa.ForeignKeyConstraint(['project_id'], ['active_projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_chat_messages_project', 'project_chat_messages', ['project_id', 'created_at'])
    
    # Project Task Completions table
    op.create_table(
        'project_task_completions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', sa.String(length=20), nullable=False),
        sa.Column('task_title', sa.String(length=500), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_via', sa.String(length=20), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.CheckConstraint("completed_via IN ('manual', 'ai_auto', 'ai_confirmed')", name='valid_completed_via'),
        sa.ForeignKeyConstraint(['project_id'], ['active_projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'task_id', name='unique_task_completion')
    )
    op.create_index('idx_task_completions_project', 'project_task_completions', ['project_id'])
    
    # Project Decisions table
    op.create_table(
        'project_decisions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('decision_category', sa.String(length=50), nullable=False),
        sa.Column('decision_value', sa.Text(), nullable=False),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.Column('confidence', sa.String(length=20), nullable=False),
        sa.Column('related_message_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('superseded_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default='true'),
        sa.CheckConstraint("decision_category IN ('pricing', 'platform', 'structure', 'timeline', 'content')", name='valid_category'),
        sa.CheckConstraint("confidence IN ('high', 'medium', 'low')", name='valid_confidence'),
        sa.ForeignKeyConstraint(['project_id'], ['active_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['related_message_id'], ['project_chat_messages.id'], ),
        sa.ForeignKeyConstraint(['superseded_by'], ['project_decisions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_decisions_project', 'project_decisions', ['project_id'])
    op.create_index('idx_decisions_current', 'project_decisions', ['project_id', 'is_current'])
    
    # AI Usage Logs table
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=False),
        sa.Column('input_tokens', sa.Integer(), nullable=False),
        sa.Column('output_tokens', sa.Integer(), nullable=False),
        sa.Column('estimated_cost', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('endpoint', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['active_projects.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_usage_user_date', 'ai_usage_logs', ['user_id', 'created_at'])
    op.create_index('idx_usage_project', 'ai_usage_logs', ['project_id'])


def downgrade() -> None:
    op.drop_index('idx_usage_project', table_name='ai_usage_logs')
    op.drop_index('idx_usage_user_date', table_name='ai_usage_logs')
    op.drop_table('ai_usage_logs')
    
    op.drop_index('idx_decisions_current', table_name='project_decisions')
    op.drop_index('idx_decisions_project', table_name='project_decisions')
    op.drop_table('project_decisions')
    
    op.drop_index('idx_task_completions_project', table_name='project_task_completions')
    op.drop_table('project_task_completions')
    
    op.drop_index('idx_chat_messages_project', table_name='project_chat_messages')
    op.drop_table('project_chat_messages')
    
    op.drop_index('idx_active_projects_status', table_name='active_projects')
    op.drop_index('idx_active_projects_user', table_name='active_projects')
    op.drop_table('active_projects')
    
    op.drop_table('creator_profiles')
