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
    # Get database connection for raw SQL
    conn = op.get_bind()

    # =============================================
    # CONTENT ANALYSIS TABLE
    # =============================================
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS content_analysis (
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            user_id UUID NOT NULL,
            top_topics JSONB NOT NULL,
            content_type_performance JSONB NOT NULL,
            audience_questions JSONB NOT NULL,
            question_volume_per_week INTEGER,
            repeat_engagers_count INTEGER,
            dm_volume_estimate VARCHAR(20),
            growth_trajectory JSONB NOT NULL,
            key_strengths JSONB,
            analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            PRIMARY KEY (id),
            UNIQUE (user_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            CONSTRAINT valid_dm_volume CHECK (dm_volume_estimate IN ('low', 'medium', 'high') OR dm_volume_estimate IS NULL)
        )
    """))

    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_content_analysis_user ON content_analysis (user_id)
    """))

    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_content_analysis_expires ON content_analysis (expires_at)
    """))

    # =============================================
    # OPPORTUNITY TEMPLATES TABLE
    # =============================================
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS opportunity_templates (
            id VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            ideal_for JSONB NOT NULL,
            revenue_model JSONB NOT NULL,
            implementation_template JSONB NOT NULL,
            success_patterns JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT valid_category CHECK (category IN ('community', 'course', 'coaching', 'sponsorship', 'product', 'hybrid', 'content', 'affiliate', 'service', 'tool'))
        )
    """))

    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_templates_category ON opportunity_templates (category)
    """))

    # =============================================
    # GENERATED OPPORTUNITIES TABLE
    # =============================================
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS generated_opportunities (
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            user_id UUID NOT NULL,
            generation_context JSONB NOT NULL,
            opportunities JSONB NOT NULL,
            selected_opportunity_id VARCHAR(100),
            generated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """))

    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_generated_opps_user ON generated_opportunities (user_id)
    """))

    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_generated_opps_generated_at ON generated_opportunities (generated_at DESC)
    """))

    # =============================================
    # PLAN MODIFICATIONS TABLE
    # =============================================
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS plan_modifications (
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            project_id UUID NOT NULL,
            modification_type VARCHAR(50) NOT NULL,
            trigger_type VARCHAR(50) NOT NULL,
            trigger_content TEXT NOT NULL,
            changes JSONB NOT NULL,
            ai_rationale TEXT NOT NULL,
            modified_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY (project_id) REFERENCES active_projects(id) ON DELETE CASCADE,
            CONSTRAINT valid_modification_type CHECK (modification_type IN ('add_task', 'remove_task', 'add_phase', 'reorder', 'adjust_timeline')),
            CONSTRAINT valid_trigger_type CHECK (trigger_type IN ('user_request', 'progress_signal', 'market_feedback'))
        )
    """))

    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_plan_mods_project ON plan_modifications (project_id)
    """))

    # =============================================
    # ENHANCE EXISTING TABLES
    # =============================================

    # Add columns to creator_profiles
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
