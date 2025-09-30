"""add vector embeddings for RAG

Revision ID: 20250930_1930
Revises: 20250930_1900
Create Date: 2025-09-30

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250930_1930"
down_revision = "20250930_1900"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add vector embeddings support for content and conversations."""
    
    # Enable pgvector extension if not already enabled
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Content embeddings for semantic search
    op.create_table(
        "content_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user_content_performance.id", ondelete="CASCADE"), nullable=False),
        sa.Column("embedding", postgresql.ARRAY(sa.Float), nullable=False, comment="1536-dim OpenAI embedding"),
        sa.Column("content_type", sa.String(50), nullable=False, comment="video, post, reel, etc"),
        sa.Column("content_text", sa.Text(), nullable=True, comment="Text used for embedding"),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("content_id", name="uq_content_id_embedding"),
    )
    
    # Vector index for fast similarity search (ivfflat)
    # Note: This uses cosine distance operator <=>
    op.execute("""
        CREATE INDEX idx_content_embeddings_vector 
        ON content_embeddings 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)
    
    # Standard indexes
    op.create_index("idx_content_embeddings_user", "content_embeddings", ["user_id"])
    op.create_index("idx_content_embeddings_type", "content_embeddings", ["content_type"])
    
    # Conversation embeddings for chat history search
    op.create_table(
        "conversation_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_chat_messages.id", ondelete="CASCADE"), nullable=True),
        sa.Column("embedding", postgresql.ARRAY(sa.Float), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False, comment="Conversation chunk"),
        sa.Column("chunk_index", sa.Integer(), nullable=False, comment="Order in conversation"),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    
    # Vector index for conversation search
    op.execute("""
        CREATE INDEX idx_conversation_embeddings_vector 
        ON conversation_embeddings 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)
    
    op.create_index("idx_conversation_embeddings_user", "conversation_embeddings", ["user_id"])
    op.create_index("idx_conversation_embeddings_session", "conversation_embeddings", ["session_id"])
    
    # Template embeddings for smart template matching
    op.create_table(
        "template_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("embedding", postgresql.ARRAY(sa.Float), nullable=False),
        sa.Column("template_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("template_id", name="uq_template_id_embedding"),
    )
    
    # Vector index for template matching
    op.execute("""
        CREATE INDEX idx_template_embeddings_vector 
        ON template_embeddings 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 10)
    """)
    
    # Embedding generation queue for async processing
    op.create_table(
        "embedding_queue",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("item_type", sa.String(50), nullable=False, comment="content, conversation, template"),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending", comment="pending, processing, completed, failed"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="5", comment="1=highest, 10=lowest"),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    
    op.create_check_constraint(
        "ck_embedding_queue_status",
        "embedding_queue",
        "status IN ('pending', 'processing', 'completed', 'failed')"
    )
    op.create_index("idx_embedding_queue_status", "embedding_queue", ["status", "priority"])


def downgrade() -> None:
    """Remove vector embeddings support."""
    
    op.drop_index("idx_embedding_queue_status", table_name="embedding_queue")
    op.drop_constraint("ck_embedding_queue_status", "embedding_queue")
    op.drop_table("embedding_queue")
    
    op.drop_index("idx_template_embeddings_vector", table_name="template_embeddings")
    op.drop_table("template_embeddings")
    
    op.drop_index("idx_conversation_embeddings_session", table_name="conversation_embeddings")
    op.drop_index("idx_conversation_embeddings_user", table_name="conversation_embeddings")
    op.drop_index("idx_conversation_embeddings_vector", table_name="conversation_embeddings")
    op.drop_table("conversation_embeddings")
    
    op.drop_index("idx_content_embeddings_type", table_name="content_embeddings")
    op.drop_index("idx_content_embeddings_user", table_name="content_embeddings")
    op.drop_index("idx_content_embeddings_vector", table_name="content_embeddings")
    op.drop_table("content_embeddings")
    
    # Note: Not dropping vector extension as other tables might use it
