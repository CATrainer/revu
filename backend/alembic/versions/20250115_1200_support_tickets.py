"""Add support ticket tables

Revision ID: 20250115_1200_support_tickets
Revises: 20260106_1755-b9f567acd2a8_merge_20250106_1320_and_workflow_v2
Create Date: 2025-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250115_1200_support_tickets'
down_revision = '20260106_1755-b9f567acd2a8_merge_20250106_1320_and_workflow_v2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create support_tickets table
    op.create_table(
        'support_tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ticket_number', sa.String(20), nullable=False, index=True, unique=True),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, default='open'),
        sa.Column('priority', sa.String(20), nullable=False, default='medium'),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_support_tickets_agency_id', 'support_tickets', ['agency_id'])
    op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])

    # Create support_ticket_responses table
    op.create_table(
        'support_ticket_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ticket_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_staff', sa.Boolean(), nullable=False, default=False),
        sa.Column('author_name', sa.String(100), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_support_ticket_responses_ticket_id', 'support_ticket_responses', ['ticket_id'])

    # Create newsletter_subscriptions table
    op.create_table(
        'newsletter_subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('changelog_updates', sa.Boolean(), nullable=False, default=True),
        sa.Column('product_news', sa.Boolean(), nullable=False, default=False),
        sa.Column('sendgrid_contact_id', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('subscribed_at', sa.DateTime(), nullable=False),
        sa.Column('unsubscribed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_newsletter_subscriptions_email', 'newsletter_subscriptions', ['email'])


def downgrade() -> None:
    op.drop_table('newsletter_subscriptions')
    op.drop_table('support_ticket_responses')
    op.drop_table('support_tickets')
