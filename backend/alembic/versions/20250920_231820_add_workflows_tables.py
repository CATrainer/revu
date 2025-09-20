"""add workflows, approvals, executions tables

Revision ID: 20250920_231820
Revises: 
Create Date: 2025-09-20 23:18:20.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250920_231820'
down_revision = '20250916_add_org_location'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # workflows
    op.create_table(
        'workflows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trigger', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('actions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_workflows_organization_id_organizations')),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_workflows_created_by_id_users')),
    )

    # workflow_approvals
    op.create_table(
        'workflow_approvals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('platform', sa.String(length=32), nullable=False),
        sa.Column('interaction_type', sa.String(length=16), nullable=False),
        sa.Column('author', sa.String(length=255), nullable=True),
        sa.Column('link_url', sa.Text(), nullable=True),
        sa.Column('user_message', sa.Text(), nullable=False),
        sa.Column('proposed_response', sa.Text(), nullable=False),
        sa.Column('edited_response', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('rejected_reason', sa.Text(), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], name=op.f('fk_workflow_approvals_workflow_id_workflows')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_workflow_approvals_organization_id_organizations')),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_workflow_approvals_created_by_id_users')),
    )

    # workflow_executions
    op.create_table(
        'workflow_executions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='completed'),
        sa.Column('context', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('result', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], name=op.f('fk_workflow_executions_workflow_id_workflows')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_workflow_executions_organization_id_organizations')),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_workflow_executions_created_by_id_users')),
    )


def downgrade() -> None:
    op.drop_table('workflow_executions')
    op.drop_table('workflow_approvals')
    op.drop_table('workflows')
