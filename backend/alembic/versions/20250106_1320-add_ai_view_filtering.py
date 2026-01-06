"""Add AI view filtering support

Revision ID: 20250106_1320
Revises: 20250106_1310
Create Date: 2025-01-06

This migration adds:
1. filter_mode column to interaction_views (ai or manual)
2. ai_prompt column for natural language view criteria
3. interaction_view_tags table to track which interactions match which AI views
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision = "20250106_1320"
down_revision = "20250106_1310"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add AI filtering support to views."""
    
    # Add filter_mode column to interaction_views
    op.add_column(
        'interaction_views',
        sa.Column('filter_mode', sa.String(20), server_default='manual', nullable=False)
    )
    
    # Add ai_prompt column for natural language criteria
    op.add_column(
        'interaction_views',
        sa.Column('ai_prompt', sa.Text(), nullable=True)
    )
    
    # Add ai_prompt_hash for detecting changes (to know when to re-tag)
    op.add_column(
        'interaction_views',
        sa.Column('ai_prompt_hash', sa.String(64), nullable=True)
    )
    
    # Create interaction_view_tags table
    op.create_table(
        'interaction_view_tags',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('interaction_id', UUID(as_uuid=True), sa.ForeignKey('interactions.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('view_id', UUID(as_uuid=True), sa.ForeignKey('interaction_views.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('matches', sa.Boolean(), nullable=False, default=True),  # True if interaction matches view criteria
        sa.Column('confidence', sa.Float(), nullable=True),  # LLM confidence score
        sa.Column('evaluated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('prompt_hash', sa.String(64), nullable=True),  # Hash of prompt used for evaluation
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('interaction_id', 'view_id', name='uq_interaction_view_tag')
    )
    
    # Create index for efficient lookups
    op.create_index(
        'ix_interaction_view_tags_view_matches',
        'interaction_view_tags',
        ['view_id', 'matches'],
        postgresql_where=sa.text('matches = true')
    )
    
    print("Added AI view filtering support")


def downgrade() -> None:
    """Remove AI filtering support."""
    
    # Drop the table
    op.drop_index('ix_interaction_view_tags_view_matches', table_name='interaction_view_tags')
    op.drop_table('interaction_view_tags')
    
    # Remove columns from interaction_views
    op.drop_column('interaction_views', 'ai_prompt_hash')
    op.drop_column('interaction_views', 'ai_prompt')
    op.drop_column('interaction_views', 'filter_mode')
    
    print("Removed AI view filtering support")
