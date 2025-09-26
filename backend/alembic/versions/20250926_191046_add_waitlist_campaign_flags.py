"""
add waitlist campaign timestamp flags to users

Revision ID: 20250926_191046
Revises: 20250924_162800
Create Date: 2025-09-26 19:10:46
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250926_191046'
down_revision = '20250924_162800'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('countdown_t14_sent_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('countdown_t7_sent_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('countdown_t1_sent_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('launch_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('launch_sent_at')
        batch_op.drop_column('countdown_t1_sent_at')
        batch_op.drop_column('countdown_t7_sent_at')
        batch_op.drop_column('countdown_t14_sent_at')
