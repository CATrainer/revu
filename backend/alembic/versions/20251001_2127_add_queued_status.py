"""add queued status to ai_chat_messages

Revision ID: 20251001_2127
Revises: 20251001_2102
Create Date: 2025-10-01 21:27:00

"""
from alembic import op
import sqlalchemy as sa


revision = '20251001_2127'
down_revision = '20251001_2102'
branch_labels = None
depends_on = None


def upgrade():
    """Add 'queued' to allowed status values for async Celery processing."""
    
    # Drop the existing constraint
    op.drop_constraint(
        "ck_ai_chat_messages_status_valid",
        "ai_chat_messages",
        type_="check"
    )
    
    # Re-create with 'queued' added
    op.create_check_constraint(
        "ck_ai_chat_messages_status_valid",
        "ai_chat_messages",
        "status IN ('queued', 'generating', 'completed', 'error', 'cancelled')"
    )
    
    print("✅ Added 'queued' status to ai_chat_messages constraint")


def downgrade():
    """Remove 'queued' from allowed status values."""
    
    # Drop the constraint with 'queued'
    op.drop_constraint(
        "ck_ai_chat_messages_status_valid",
        "ai_chat_messages",
        type_="check"
    )
    
    # Re-create without 'queued'
    op.create_check_constraint(
        "ck_ai_chat_messages_status_valid",
        "ai_chat_messages",
        "status IN ('generating', 'completed', 'error', 'cancelled')"
    )
    
    print("✅ Removed 'queued' status from ai_chat_messages constraint")
