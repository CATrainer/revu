"""Add organization and location models

Revision ID: 20250916_add_org_location
Revises: 
Create Date: 2025-09-16 17:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '20250916_add_org_location'
down_revision = '20250909_1530'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Check if organizations table exists
    organizations_exists = conn.execute(text("""
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'organizations'
    """)).fetchone()
    
    if not organizations_exists:
        # Create organizations table
        op.create_table('organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
        )
        op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)

    # Check if locations table exists
    locations_exists = conn.execute(text("""
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'locations'
    """)).fetchone()
    
    if not locations_exists:
        # Create locations table
        op.create_table('locations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('google_place_id', sa.String(length=255), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=False),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('brand_voice_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('business_info', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_locations_id'), 'locations', ['id'], unique=False)

    # Check if organization_id column exists in users table
    org_id_column_exists = conn.execute(text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'organization_id'
    """)).fetchone()
    
    if not org_id_column_exists:
        # Add organization_id to users table
        op.add_column('users', sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(None, 'users', 'organizations', ['organization_id'], ['id'])


def downgrade() -> None:
    # Remove organization_id from users table
    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_column('users', 'organization_id')
    
    # Drop tables
    op.drop_index(op.f('ix_locations_id'), table_name='locations')
    op.drop_table('locations')
    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')
