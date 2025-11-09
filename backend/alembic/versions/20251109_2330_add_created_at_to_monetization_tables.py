"""add created_at to project_task_completions and project_decisions

Revision ID: 20251109_2330
Revises: 20251109_2200
Create Date: 2025-11-09 23:30:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251109_2330'
down_revision = '20251109_2200'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add created_at column to tables that are missing it
    # Using raw SQL with IF NOT EXISTS for idempotency

    conn = op.get_bind()

    # project_task_completions
    conn.execute(sa.text("""
        ALTER TABLE project_task_completions
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    """))

    # project_decisions
    conn.execute(sa.text("""
        ALTER TABLE project_decisions
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    """))


def downgrade() -> None:
    # Remove created_at columns
    op.drop_column('project_decisions', 'created_at')
    op.drop_column('project_task_completions', 'created_at')
