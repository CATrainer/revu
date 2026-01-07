"""Add role column to agency_invitations table

Revision ID: phase7_invitation_role
Revises: 20251216_1900
Create Date: 2025-01-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'phase7_invitation_role'
down_revision: Union[str, None] = '20251216_1900'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add role column to agency_invitations table."""
    # Check if the column already exists
    conn = op.get_bind()
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'agency_invitations' AND column_name = 'role'
    """))
    if result.fetchone() is None:
        # Add role column with default 'member'
        op.add_column(
            'agency_invitations',
            sa.Column(
                'role',
                sa.Enum('owner', 'admin', 'member', name='agency_member_role_enum', create_type=False),
                nullable=False,
                server_default='member',
                comment='Role to assign when invitation is accepted'
            )
        )


def downgrade() -> None:
    """Remove role column from agency_invitations table."""
    op.drop_column('agency_invitations', 'role')
