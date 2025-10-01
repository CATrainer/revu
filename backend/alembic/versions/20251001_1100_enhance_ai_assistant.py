"""enhance ai assistant features

Revision ID: enhance_ai_assistant
Revises: 20250930_1850
Create Date: 2025-10-01 11:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

revision = 'enhance_ai_assistant'
down_revision = '20250930_1850'
branch_labels = None
depends_on = None

def upgrade():
    # Add session metadata columns
    op.add_column('ai_chat_sessions', sa.Column('starred', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('ai_chat_sessions', sa.Column('archived', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('ai_chat_sessions', sa.Column('last_message_at', sa.DateTime(), nullable=True))
    
    # Create tags table
    op.create_table(
        'tags',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('color', sa.String(7), nullable=False, server_default='#3b82f6'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('user_id', 'name', name='uq_user_tag_name')
    )
    op.create_index('ix_tags_user_id', 'tags', ['user_id'])
    
    # Create session_tags join table
    op.create_table(
        'session_tags',
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tags.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('session_id', 'tag_id')
    )
    
    # Create attachments table
    op.create_table(
        'attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_chat_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_type', sa.String(100), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('storage_url', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_attachments_message_id', 'attachments', ['message_id'])
    
    # Create session_shares table
    op.create_table(
        'session_shares',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(100), unique=True, nullable=False),
        sa.Column('permission', sa.String(20), nullable=False, server_default='view'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('require_auth', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_session_shares_token', 'session_shares', ['token'])
    op.create_index('ix_session_shares_session_id', 'session_shares', ['session_id'])
    
    # Create session_collaborators table
    op.create_table(
        'session_collaborators',
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission', sa.String(20), nullable=False, server_default='view'),
        sa.Column('added_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('session_id', 'user_id')
    )
    
    # Create message_comments table
    op.create_table(
        'message_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_chat_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True, onupdate=sa.text('now()'))
    )
    op.create_index('ix_message_comments_message_id', 'message_comments', ['message_id'])
    
    # Create full-text search index on message content
    op.execute("""
        CREATE INDEX idx_message_content_search 
        ON ai_chat_messages 
        USING gin(to_tsvector('english', content))
    """)
    
    # Create index on session titles for search
    op.execute("""
        CREATE INDEX idx_session_title_search 
        ON ai_chat_sessions 
        USING gin(to_tsvector('english', title))
    """)

def downgrade():
    # Drop indexes
    op.execute("DROP INDEX IF EXISTS idx_session_title_search")
    op.execute("DROP INDEX IF EXISTS idx_message_content_search")
    
    # Drop tables in reverse order
    op.drop_table('message_comments')
    op.drop_table('session_collaborators')
    op.drop_table('session_shares')
    op.drop_table('attachments')
    op.drop_table('session_tags')
    op.drop_table('tags')
    
    # Drop columns
    op.drop_column('ai_chat_sessions', 'last_message_at')
    op.drop_column('ai_chat_sessions', 'archived')
    op.drop_column('ai_chat_sessions', 'starred')
