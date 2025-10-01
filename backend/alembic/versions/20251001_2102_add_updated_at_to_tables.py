"""add updated_at to ai_chat_messages and tags

Revision ID: 20251001_2102
Revises: 20251001_2101
Create Date: 2025-10-01 21:02:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = '20251001_2102'
down_revision = '20251001_2101'
branch_labels = None
depends_on = None


def upgrade():
    """Add updated_at column to ai_chat_messages and tags tables.
    
    These columns are needed for PostgreSQL triggers that automatically
    update timestamps on row changes.
    """
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if ai_chat_messages table exists
    existing_tables = inspector.get_table_names()
    
    if 'ai_chat_messages' in existing_tables:
        # Get existing columns
        existing_columns = {col['name'] for col in inspector.get_columns('ai_chat_messages')}
        
        # Add updated_at to ai_chat_messages if it doesn't exist
        if 'updated_at' not in existing_columns:
            op.add_column('ai_chat_messages', sa.Column(
                'updated_at',
                sa.DateTime(timezone=True),
                nullable=True,
                comment='Last updated timestamp - auto-updated by trigger'
            ))
            print("✅ Added updated_at to ai_chat_messages")
        else:
            print("ℹ️  updated_at already exists in ai_chat_messages")
    
    if 'tags' in existing_tables:
        # Get existing columns
        existing_columns = {col['name'] for col in inspector.get_columns('tags')}
        
        # Add updated_at to tags if it doesn't exist
        if 'updated_at' not in existing_columns:
            op.add_column('tags', sa.Column(
                'updated_at',
                sa.DateTime(timezone=True),
                nullable=True,
                comment='Last updated timestamp - auto-updated by trigger'
            ))
            print("✅ Added updated_at to tags")
        else:
            print("ℹ️  updated_at already exists in tags")
    
    # Create or replace the set_updated_at function if it doesn't exist
    # This function is used by triggers to automatically update updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    print("✅ Created/updated set_updated_at() function")
    
    # Create triggers for both tables if they don't exist
    # These triggers automatically update the updated_at column on row updates
    
    # Trigger for ai_chat_messages
    op.execute("""
        DROP TRIGGER IF EXISTS trg_ai_chat_messages_updated_at ON ai_chat_messages;
        
        CREATE TRIGGER trg_ai_chat_messages_updated_at
            BEFORE UPDATE ON ai_chat_messages
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
    """)
    print("✅ Created trigger for ai_chat_messages")
    
    # Trigger for tags
    op.execute("""
        DROP TRIGGER IF EXISTS trg_tags_updated_at ON tags;
        
        CREATE TRIGGER trg_tags_updated_at
            BEFORE UPDATE ON tags
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
    """)
    print("✅ Created trigger for tags")
    
    print("✅ Successfully added updated_at columns and triggers")


def downgrade():
    """Remove updated_at columns and triggers."""
    conn = op.get_bind()
    inspector = inspect(conn)
    
    existing_tables = inspector.get_table_names()
    
    # Drop triggers first
    if 'ai_chat_messages' in existing_tables:
        op.execute("DROP TRIGGER IF EXISTS trg_ai_chat_messages_updated_at ON ai_chat_messages")
        print("✅ Dropped trigger from ai_chat_messages")
        
        # Check if column exists before dropping
        existing_columns = {col['name'] for col in inspector.get_columns('ai_chat_messages')}
        if 'updated_at' in existing_columns:
            op.drop_column('ai_chat_messages', 'updated_at')
            print("✅ Dropped updated_at from ai_chat_messages")
    
    if 'tags' in existing_tables:
        op.execute("DROP TRIGGER IF EXISTS trg_tags_updated_at ON tags")
        print("✅ Dropped trigger from tags")
        
        # Check if column exists before dropping
        existing_columns = {col['name'] for col in inspector.get_columns('tags')}
        if 'updated_at' in existing_columns:
            op.drop_column('tags', 'updated_at')
            print("✅ Dropped updated_at from tags")
    
    # Note: We don't drop set_updated_at() function as other tables might use it
    print("✅ Successfully removed updated_at columns and triggers")
