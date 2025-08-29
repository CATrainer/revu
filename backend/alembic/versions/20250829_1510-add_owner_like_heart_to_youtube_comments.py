"""add owner like/heart flags to youtube_comments

Revision ID: add_owner_like_heart_to_youtube_comments
Revises: 20250829_0010-add_timestamps_to_sync_logs
Create Date: 2025-08-29 15:10:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_owner_like_heart_to_youtube_comments'
down_revision = '20250829_0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('youtube_comments') as batch_op:
        batch_op.add_column(sa.Column('hearted_by_owner', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('liked_by_owner', sa.Boolean(), nullable=False, server_default=sa.false()))
    # Remove server_default after setting initial values
    with op.batch_alter_table('youtube_comments') as batch_op:
        batch_op.alter_column('hearted_by_owner', server_default=None)
        batch_op.alter_column('liked_by_owner', server_default=None)


def downgrade() -> None:
    with op.batch_alter_table('youtube_comments') as batch_op:
        batch_op.drop_column('liked_by_owner')
        batch_op.drop_column('hearted_by_owner')
