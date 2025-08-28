"""add timestamps to youtube_videos and youtube_comments

Revision ID: 20250829_0001
Revises: 20250828_2300
Create Date: 2025-08-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250829_0001"
down_revision = "20250828_2300"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # youtube_videos
    op.add_column(
        "youtube_videos",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.add_column(
        "youtube_videos",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # youtube_comments
    op.add_column(
        "youtube_comments",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.add_column(
        "youtube_comments",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("youtube_comments", "updated_at")
    op.drop_column("youtube_comments", "created_at")
    op.drop_column("youtube_videos", "updated_at")
    op.drop_column("youtube_videos", "created_at")
