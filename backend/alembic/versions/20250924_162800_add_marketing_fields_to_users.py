"""
add marketing preference and event fields to users

Revision ID: 20250924_162800
Revises: 20250920_231820
Create Date: 2025-09-24 16:28:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250924_162800'
# Match the last migration id in your tree
down_revision = '20250920_231820'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('marketing_opt_in', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        batch_op.add_column(sa.Column('marketing_opt_in_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('marketing_unsubscribed_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('marketing_bounced_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('marketing_last_event', sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column('marketing_last_event_at', sa.DateTime(timezone=True), nullable=True))
    # Drop the server_default to keep application-level defaults only
    op.execute("ALTER TABLE users ALTER COLUMN marketing_opt_in DROP DEFAULT;")


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('marketing_last_event_at')
        batch_op.drop_column('marketing_last_event')
        batch_op.drop_column('marketing_bounced_at')
        batch_op.drop_column('marketing_unsubscribed_at')
        batch_op.drop_column('marketing_opt_in_at')
        batch_op.drop_column('marketing_opt_in')
