"""add_user_feedback

Revision ID: 20251008_1708
Revises: 20250107_2010
Create Date: 2025-10-08 17:08:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251008_1708'
down_revision = '20250107_2010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add user_feedback table for bug reports and feature requests."""
    
    # Create enum types
    op.execute("""
        CREATE TYPE feedbacktype AS ENUM ('bug', 'feature_request', 'general', 'improvement')
    """)
    
    op.execute("""
        CREATE TYPE feedbackstatus AS ENUM ('new', 'reviewing', 'in_progress', 'completed', 'wont_fix')
    """)
    
    # Create user_feedback table
    op.create_table(
        'user_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('feedback_type', postgresql.ENUM('bug', 'feature_request', 'general', 'improvement', name='feedbacktype'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('page_url', sa.String(length=500), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('status', postgresql.ENUM('new', 'reviewing', 'in_progress', 'completed', 'wont_fix', name='feedbackstatus'), nullable=False),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_user_feedback_user_id'), 'user_feedback', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_feedback_id'), 'user_feedback', ['id'], unique=False)


def downgrade() -> None:
    """Remove user_feedback table."""
    op.drop_index(op.f('ix_user_feedback_id'), table_name='user_feedback')
    op.drop_index(op.f('ix_user_feedback_user_id'), table_name='user_feedback')
    op.drop_table('user_feedback')
    op.execute('DROP TYPE feedbackstatus')
    op.execute('DROP TYPE feedbacktype')
