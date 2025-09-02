"""
Add user_interaction_history table to enable cross-video intelligence.

- User's YouTube channel ID
- Video and comment IDs
- Interaction type (comment, reply, like)
- Sentiment analysis result
- Topics discussed (JSONB array)
- Created timestamp
- Indexes on user_channel_id and created_at
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250902_0002"
down_revision = "20250902_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_interaction_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_channel_id", sa.String(length=128), nullable=False),
        sa.Column("video_id", sa.String(length=128), nullable=False),
        sa.Column("comment_id", sa.String(length=128), nullable=True),
        sa.Column("interaction_type", sa.String(length=32), nullable=False),  # comment | reply | like
        sa.Column("sentiment_result", sa.String(length=32), nullable=True),   # positive | neutral | negative (or other labels)
        sa.Column("topics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),  # JSON array of strings
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # Indexes for quick lookups by channel and time
    op.create_index("ix_uih_user_channel_id", "user_interaction_history", ["user_channel_id"], unique=False)
    op.create_index("ix_uih_created_at", "user_interaction_history", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_uih_created_at", table_name="user_interaction_history")
    op.drop_index("ix_uih_user_channel_id", table_name="user_interaction_history")
    op.drop_table("user_interaction_history")
