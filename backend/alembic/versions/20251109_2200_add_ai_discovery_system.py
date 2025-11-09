"""add ai discovery system tables

Revision ID: 20251109_2200
Revises: 7864c3b2812d
Create Date: 2025-11-09 22:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251109_2200'
down_revision = '7864c3b2812d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =============================================
    # CONTENT ANALYSIS TABLE
    # =============================================
    op.create_table(
        'content_analysis',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('top_topics', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('content_type_performance', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('audience_questions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('question_volume_per_week', sa.Integer(), nullable=True),
        sa.Column('repeat_engagers_count', sa.Integer(), nullable=True),
        sa.Column('dm_volume_estimate', sa.String(length=20), nullable=True),
        sa.Column('growth_trajectory', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('key_strengths', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('analyzed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        sa.CheckConstraint("dm_volume_estimate IN ('low', 'medium', 'high') OR dm_volume_estimate IS NULL", name='valid_dm_volume')
    )
    op.create_index('idx_content_analysis_user', 'content_analysis', ['user_id'])
    op.create_index('idx_content_analysis_expires', 'content_analysis', ['expires_at'])

    # =============================================
    # OPPORTUNITY TEMPLATES TABLE
    # =============================================
    op.create_table(
        'opportunity_templates',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('ideal_for', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('revenue_model', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('implementation_template', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('success_patterns', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("category IN ('community', 'course', 'coaching', 'sponsorship', 'product', 'hybrid', 'content', 'affiliate', 'service', 'tool')", name='valid_category')
    )
    op.create_index('idx_templates_category', 'opportunity_templates', ['category'])

    # =============================================
    # GENERATED OPPORTUNITIES TABLE
    # =============================================
    op.create_table(
        'generated_opportunities',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('generation_context', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('opportunities', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('selected_opportunity_id', sa.String(length=100), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_generated_opps_user', 'generated_opportunities', ['user_id'])
    op.create_index('idx_generated_opps_generated_at', 'generated_opportunities', ['generated_at'], postgresql_using='btree', postgresql_ops={'generated_at': 'DESC'})

    # =============================================
    # PLAN MODIFICATIONS TABLE
    # =============================================
    op.create_table(
        'plan_modifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('modification_type', sa.String(length=50), nullable=False),
        sa.Column('trigger_type', sa.String(length=50), nullable=False),
        sa.Column('trigger_content', sa.Text(), nullable=False),
        sa.Column('changes', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('ai_rationale', sa.Text(), nullable=False),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['active_projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("modification_type IN ('add_task', 'remove_task', 'add_phase', 'reorder', 'adjust_timeline')", name='valid_modification_type'),
        sa.CheckConstraint("trigger_type IN ('user_request', 'progress_signal', 'market_feedback')", name='valid_trigger_type')
    )
    op.create_index('idx_plan_mods_project', 'plan_modifications', ['project_id'])

    # =============================================
    # ENHANCE EXISTING TABLES
    # =============================================

    # Add columns to creator_profiles
    conn = op.get_bind()

    conn.execute(sa.text("""
        ALTER TABLE creator_profiles
        ADD COLUMN IF NOT EXISTS goals JSONB
    """))

    conn.execute(sa.text("""
        ALTER TABLE creator_profiles
        ADD COLUMN IF NOT EXISTS constraints JSONB
    """))

    conn.execute(sa.text("""
        ALTER TABLE creator_profiles
        ADD COLUMN IF NOT EXISTS preferences JSONB
    """))

    # Add columns to active_projects
    conn.execute(sa.text("""
        ALTER TABLE active_projects
        ADD COLUMN IF NOT EXISTS opportunity_data JSONB
    """))

    conn.execute(sa.text("""
        ALTER TABLE active_projects
        ADD COLUMN IF NOT EXISTS is_custom_generated BOOLEAN DEFAULT false
    """))

    conn.execute(sa.text("""
        ALTER TABLE active_projects
        ADD COLUMN IF NOT EXISTS generation_id UUID REFERENCES generated_opportunities(id)
    """))


def downgrade() -> None:
    # Remove columns from active_projects
    op.drop_column('active_projects', 'generation_id')
    op.drop_column('active_projects', 'is_custom_generated')
    op.drop_column('active_projects', 'opportunity_data')

    # Remove columns from creator_profiles
    op.drop_column('creator_profiles', 'preferences')
    op.drop_column('creator_profiles', 'constraints')
    op.drop_column('creator_profiles', 'goals')

    # Drop tables in reverse order
    op.drop_index('idx_plan_mods_project', table_name='plan_modifications')
    op.drop_table('plan_modifications')

    op.drop_index('idx_generated_opps_generated_at', table_name='generated_opportunities')
    op.drop_index('idx_generated_opps_user', table_name='generated_opportunities')
    op.drop_table('generated_opportunities')

    op.drop_index('idx_templates_category', table_name='opportunity_templates')
    op.drop_table('opportunity_templates')

    op.drop_index('idx_content_analysis_expires', table_name='content_analysis')
    op.drop_index('idx_content_analysis_user', table_name='content_analysis')
    op.drop_table('content_analysis')
