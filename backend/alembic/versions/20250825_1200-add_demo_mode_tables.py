"""add_demo_mode_tables

Revision ID: add_demo_mode_tables
Revises: 20250822_0002
Create Date: 2025-08-25 12:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_demo_mode_tables'
down_revision = '20250822_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create table demo_accounts
    op.create_table(
        'demo_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('persona_type', sa.String(), nullable=True),
        sa.Column('platform_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('content_schedule', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('engagement_patterns', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_demo_accounts')),
        sa.UniqueConstraint('email', name=op.f('uq_demo_accounts_email')),
    )

    # Create table demo_content
    op.create_table(
        'demo_content',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('content_type', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['demo_accounts.id'], name=op.f('fk_demo_content_account_id_demo_accounts'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_demo_content')),
    )

    # Create table demo_comments
    op.create_table(
        'demo_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('content_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('author_name', sa.String(), nullable=True),
        sa.Column('author_avatar', sa.String(), nullable=True),
        sa.Column('comment_text', sa.Text(), nullable=True),
        sa.Column('sentiment', sa.String(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('likes_count', sa.Integer(), nullable=True),
        sa.Column('replies_count', sa.Integer(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('response', sa.Text(), nullable=True),
        sa.Column('response_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['content_id'], ['demo_content.id'], name=op.f('fk_demo_comments_content_id_demo_content'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_demo_comments')),
    )


def downgrade() -> None:
    op.drop_table('demo_comments')
    op.drop_table('demo_content')
    op.drop_table('demo_accounts')
