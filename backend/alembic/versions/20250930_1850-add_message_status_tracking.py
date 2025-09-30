"""add message status tracking for resilient streaming

Revision ID: 20250930_1850
Revises: 20250930_1430
Create Date: 2025-09-30

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250930_1850"
down_revision = "20250930_1430"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add status tracking to ai_chat_messages for resilient generation."""
    
    # Add status column with enum-like constraint
    op.add_column(
        "ai_chat_messages",
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="completed",
            comment="Message status: generating, completed, error, cancelled"
        )
    )
    
    # Add check constraint for valid status values
    op.create_check_constraint(
        "ck_ai_chat_messages_status_valid",
        "ai_chat_messages",
        "status IN ('generating', 'completed', 'error', 'cancelled')"
    )
    
    # Add is_streaming flag for quick filtering
    op.add_column(
        "ai_chat_messages",
        sa.Column(
            "is_streaming",
            sa.Boolean(),
            nullable=False,
            server_default="false",
            comment="True if message is currently being generated"
        )
    )
    
    # Add last_updated timestamp for incremental updates
    op.add_column(
        "ai_chat_messages",
        sa.Column(
            "last_updated",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
            comment="Last time message content was updated"
        )
    )
    
    # Create index for efficient status queries
    op.create_index(
        "idx_ai_chat_messages_status_updated",
        "ai_chat_messages",
        ["status", "last_updated"],
        postgresql_where=sa.text("status IN ('generating', 'error')")
    )
    
    # Create index for finding actively streaming messages by session
    op.create_index(
        "idx_ai_chat_messages_session_streaming",
        "ai_chat_messages",
        ["session_id", "is_streaming"],
        postgresql_where=sa.text("is_streaming = true")
    )
    
    # Add trigger to auto-update last_updated on content change
    op.execute("""
        CREATE OR REPLACE FUNCTION update_ai_chat_message_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.last_updated = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_update_ai_chat_message_timestamp
        BEFORE UPDATE ON ai_chat_messages
        FOR EACH ROW
        WHEN (OLD.content IS DISTINCT FROM NEW.content)
        EXECUTE FUNCTION update_ai_chat_message_timestamp();
    """)


def downgrade() -> None:
    """Remove status tracking from ai_chat_messages."""
    
    # Drop trigger and function
    op.execute("DROP TRIGGER IF EXISTS trigger_update_ai_chat_message_timestamp ON ai_chat_messages")
    op.execute("DROP FUNCTION IF EXISTS update_ai_chat_message_timestamp()")
    
    # Drop indexes
    op.drop_index("idx_ai_chat_messages_session_streaming", table_name="ai_chat_messages")
    op.drop_index("idx_ai_chat_messages_status_updated", table_name="ai_chat_messages")
    
    # Drop columns
    op.drop_column("ai_chat_messages", "last_updated")
    op.drop_column("ai_chat_messages", "is_streaming")
    
    # Drop check constraint before dropping column
    op.drop_constraint("ck_ai_chat_messages_status_valid", "ai_chat_messages")
    op.drop_column("ai_chat_messages", "status")
