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
    
    # Check what tables/indexes already exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Content embeddings for semantic search
    if "content_embeddings" not in existing_tables:
        op.execute("""
            CREATE TABLE content_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content_id UUID NOT NULL REFERENCES user_content_performance(id) ON DELETE CASCADE,
                embedding vector(1536) NOT NULL,
                content_type VARCHAR(50) NOT NULL,
                content_text TEXT,
                metadata JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_content_id_embedding UNIQUE (content_id)
            )
        """)
        
        # Vector index for fast similarity search (ivfflat)
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_content_embeddings_vector 
            ON content_embeddings 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        """)
        
        # Standard indexes
        op.execute("CREATE INDEX IF NOT EXISTS idx_content_embeddings_user ON content_embeddings (user_id)")
        op.execute("CREATE INDEX IF NOT EXISTS idx_content_embeddings_type ON content_embeddings (content_type)")
    
    # Conversation embeddings for chat history search
    if "conversation_embeddings" not in existing_tables:
        op.execute("""
            CREATE TABLE conversation_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
                message_id UUID REFERENCES ai_chat_messages(id) ON DELETE CASCADE,
                embedding vector(1536) NOT NULL,
                chunk_text TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                metadata JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        
        # Vector index for conversation search
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_vector 
            ON conversation_embeddings 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        """)
        
        op.execute("CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_user ON conversation_embeddings (user_id)")
        op.execute("CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_session ON conversation_embeddings (session_id)")
    
    # Template embeddings for smart template matching
    if "template_embeddings" not in existing_tables:
        op.execute("""
            CREATE TABLE template_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id UUID NOT NULL REFERENCES content_templates(id) ON DELETE CASCADE,
                embedding vector(1536) NOT NULL,
                template_text TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_template_id_embedding UNIQUE (template_id)
            )
        """)
        
        # Vector index for template matching
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_template_embeddings_vector 
            ON template_embeddings 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 10)
        """)
    
    # Embedding generation queue for async processing
    if "embedding_queue" not in existing_tables:
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
        
        # Check constraint (drop if exists first to avoid conflicts)
        op.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'ck_embedding_queue_status'
                ) THEN
                    ALTER TABLE embedding_queue ADD CONSTRAINT ck_embedding_queue_status 
                    CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
                END IF;
            END $$;
        """)
        
        op.execute("CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue (status, priority)")


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
