"""add chat session branching support

Revision ID: 20250930_1430
Revises: 20250930_1400
Create Date: 2025-09-30

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250930_1430"
down_revision = "20250930_1400"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add branching support to ai_chat_sessions."""
    
    # Add parent session reference
    op.add_column(
        "ai_chat_sessions",
        sa.Column("parent_session_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    
    # Add branch point message reference
    op.add_column(
        "ai_chat_sessions",
        sa.Column("branch_point_message_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    
    # Add context inheritance settings
    op.add_column(
        "ai_chat_sessions",
        sa.Column(
            "context_inheritance",
            postgresql.JSONB(),
            nullable=True,
            comment="Settings for what context is inherited from parent (messages, summary, etc.)"
        )
    )
    
    # Add branch metadata
    op.add_column(
        "ai_chat_sessions",
        sa.Column(
            "branch_name",
            sa.String(255),
            nullable=True,
            comment="Optional name for the branch/thread"
        )
    )
    
    # Add depth level for nested branches
    op.add_column(
        "ai_chat_sessions",
        sa.Column(
            "depth_level",
            sa.Integer(),
            nullable=False,
            server_default="0",
            comment="Nesting depth: 0=root, 1=first branch, etc."
        )
    )
    
    # Create foreign key for parent session
    op.create_foreign_key(
        "fk_ai_chat_sessions_parent",
        "ai_chat_sessions",
        "ai_chat_sessions",
        ["parent_session_id"],
        ["id"],
        ondelete="CASCADE"
    )
    
    # Create index for efficient parent/child lookups
    op.create_index(
        "idx_ai_chat_sessions_parent_id",
        "ai_chat_sessions",
        ["parent_session_id"]
    )
    
    # Create index for branch point lookups
    op.create_index(
        "idx_ai_chat_sessions_branch_point",
        "ai_chat_sessions",
        ["branch_point_message_id"]
    )


def downgrade() -> None:
    """Remove branching support from ai_chat_sessions."""
    
    op.drop_index("idx_ai_chat_sessions_branch_point", table_name="ai_chat_sessions")
    op.drop_index("idx_ai_chat_sessions_parent_id", table_name="ai_chat_sessions")
    op.drop_constraint("fk_ai_chat_sessions_parent", "ai_chat_sessions", type_="foreignkey")
    
    op.drop_column("ai_chat_sessions", "depth_level")
    op.drop_column("ai_chat_sessions", "branch_name")
    op.drop_column("ai_chat_sessions", "context_inheritance")
    op.drop_column("ai_chat_sessions", "branch_point_message_id")
    op.drop_column("ai_chat_sessions", "parent_session_id")
