"""Monetization Engine V2 - Complete revamp with 100 templates, projects, and tasks

Revision ID: monetization_v2_001
Revises: 
Create Date: 2026-01-07 16:30:00.000000

This migration creates the new monetization engine schema:
- monetization_templates: 100 curated templates across 5 categories
- monetization_projects: User's active projects with AI customization
- monetization_tasks: Individual tasks from action plans with Kanban status
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'monetization_v2_001'
down_revision = None  # Will be set by Alembic
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create monetization_templates table
    op.create_table(
        'monetization_templates',
        sa.Column('id', sa.String(100), primary_key=True),  # e.g., "online-course-comprehensive"
        sa.Column('category', sa.String(50), nullable=False),  # digital_products, services, etc.
        sa.Column('subcategory', sa.String(50), nullable=False),  # courses, coaching, etc.
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('prerequisites', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('suitable_for', postgresql.JSONB, nullable=False),  # {min_followers, niches, platforms}
        sa.Column('revenue_model', sa.String(50), nullable=False),  # one-time, recurring, hybrid
        sa.Column('expected_timeline', sa.String(100), nullable=False),
        sa.Column('expected_revenue_range', postgresql.JSONB, nullable=False),  # {low, high, unit}
        sa.Column('decision_points', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('action_plan', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('display_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create indexes for template queries
    op.create_index('idx_monetization_templates_category', 'monetization_templates', ['category'])
    op.create_index('idx_monetization_templates_subcategory', 'monetization_templates', ['subcategory'])
    op.create_index('idx_monetization_templates_active', 'monetization_templates', ['is_active', 'display_order'])
    
    # Create monetization_projects table
    op.create_table(
        'monetization_projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_id', sa.String(100), sa.ForeignKey('monetization_templates.id'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),  # User can rename from template title
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),  # active, paused, completed, abandoned
        sa.Column('customized_plan', postgresql.JSONB),  # AI-customized action plan
        sa.Column('decision_values', postgresql.JSONB, nullable=False, server_default='{}'),  # User's choices
        sa.Column('ai_customization_notes', sa.Text),  # AI's rationale for changes
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.CheckConstraint("status IN ('active', 'paused', 'completed', 'abandoned')", name='ck_monetization_projects_status'),
    )
    
    # Create indexes for project queries
    op.create_index('idx_monetization_projects_user', 'monetization_projects', ['user_id'])
    op.create_index('idx_monetization_projects_status', 'monetization_projects', ['status'])
    op.create_index('idx_monetization_projects_user_active', 'monetization_projects', ['user_id', 'status'])
    
    # Create monetization_tasks table
    op.create_table(
        'monetization_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('monetization_projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('phase', sa.Integer, nullable=False),  # 1, 2, 3, etc.
        sa.Column('phase_name', sa.String(100), nullable=False),  # e.g., "Validation", "Content Creation"
        sa.Column('task_id', sa.String(20), nullable=False),  # e.g., "1.1", "2.3"
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='todo'),  # todo, in_progress, done
        sa.Column('estimated_hours', sa.Numeric(5, 1)),
        sa.Column('sort_order', sa.Integer, nullable=False),  # For Kanban ordering
        sa.Column('depends_on_decisions', postgresql.JSONB, server_default='[]'),  # Which decisions affect this task
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('notes', sa.Text),  # User notes on completion
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.CheckConstraint("status IN ('todo', 'in_progress', 'done')", name='ck_monetization_tasks_status'),
    )
    
    # Create indexes for task queries
    op.create_index('idx_monetization_tasks_project', 'monetization_tasks', ['project_id'])
    op.create_index('idx_monetization_tasks_status', 'monetization_tasks', ['status'])
    op.create_index('idx_monetization_tasks_project_phase', 'monetization_tasks', ['project_id', 'phase'])
    op.create_index('idx_monetization_tasks_project_status', 'monetization_tasks', ['project_id', 'status'])


def downgrade() -> None:
    op.drop_table('monetization_tasks')
    op.drop_table('monetization_projects')
    op.drop_table('monetization_templates')
