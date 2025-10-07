"""Add response queue and fan profiles

Revision ID: 20250107_2230
Revises: 20250107_2210
Create Date: 2025-01-07 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20250107_2230'
down_revision = '20250107_2210'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Response Queue table
    op.create_table('response_queue',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('interaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('response_text', sa.Text(), nullable=False),
        sa.Column('platform', sa.String(32), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('scheduled_for', sa.DateTime(), nullable=True),
        sa.Column('attempted_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('batch_id', sa.String(50), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_data', postgresql.JSONB(), nullable=True),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['interaction_id'], ['interactions.id']),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_response_queue_interaction_id', 'response_queue', ['interaction_id'])
    op.create_index('ix_response_queue_platform', 'response_queue', ['platform'])
    op.create_index('ix_response_queue_status', 'response_queue', ['status'])
    op.create_index('ix_response_queue_scheduled_for', 'response_queue', ['scheduled_for'])
    op.create_index('ix_response_queue_user_id', 'response_queue', ['user_id'])

    # Platform Rate Limits table
    op.create_table('platform_rate_limits',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(32), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('max_per_hour', sa.Integer(), nullable=False),
        sa.Column('max_per_minute', sa.Integer(), nullable=False),
        sa.Column('min_interval_seconds', sa.Integer(), nullable=False),
        sa.Column('responses_last_hour', sa.Integer(), nullable=False),
        sa.Column('responses_last_minute', sa.Integer(), nullable=False),
        sa.Column('last_response_at', sa.DateTime(), nullable=True),
        sa.Column('add_random_delay', sa.Boolean(), nullable=False),
        sa.Column('min_delay_seconds', sa.Integer(), nullable=False),
        sa.Column('max_delay_seconds', sa.Integer(), nullable=False),
        sa.Column('hour_window_start', sa.DateTime(), nullable=True),
        sa.Column('minute_window_start', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_platform_rate_limits_platform', 'platform_rate_limits', ['platform'])
    op.create_index('ix_platform_rate_limits_user_id', 'platform_rate_limits', ['user_id'])

    # Add superfan fields to fans table
    op.add_column('fans', sa.Column('is_superfan', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('fans', sa.Column('superfan_since', sa.DateTime(), nullable=True))
    op.add_column('fans', sa.Column('lifetime_value_score', sa.Integer(), server_default='0', nullable=False))
    op.add_column('fans', sa.Column('sentiment_score', sa.Numeric(3, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('fans', 'sentiment_score')
    op.drop_column('fans', 'lifetime_value_score')
    op.drop_column('fans', 'superfan_since')
    op.drop_column('fans', 'is_superfan')
    op.drop_table('platform_rate_limits')
    op.drop_table('response_queue')
