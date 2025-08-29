"""add tags to youtube_videos

Revision ID: add_tags_yt_videos_20250829_1805
Revises: 20250829_1510-add_owner_like_heart_to_youtube_comments
Create Date: 2025-08-29 18:05:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_tags_yt_videos_20250829_1805'
down_revision = 'add_owner_like_heart_to_youtube_comments'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'youtube_videos',
        sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=False, server_default=sa.text("'{}'"))
    )
    # Drop server_default after backfilling existing rows to empty array
    op.alter_column('youtube_videos', 'tags', server_default=None)


def downgrade() -> None:
    op.drop_column('youtube_videos', 'tags')
