"""add agency tables for talent management

Revision ID: 20251128_1200
Revises: 20251117_1800
Create Date: 2025-11-28 12:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = "20251128_1200"
down_revision = "20251117_1800"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create agency tables and related infrastructure."""

    # Create ENUM types using DO blocks for idempotency
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE agency_member_role_enum AS ENUM ('owner', 'admin', 'member');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE agency_member_status_enum AS ENUM ('pending_invite', 'pending_request', 'active', 'removed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE agency_invitation_status_enum AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE agency_opportunity_status_enum AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined', 'completed', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create agencies table
    op.execute("""
        CREATE TABLE IF NOT EXISTS agencies (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            owner_id UUID NOT NULL,
            logo_url VARCHAR(500),
            website VARCHAR(500),
            description TEXT,
            settings JSONB NOT NULL DEFAULT '{}',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT fk_agencies_owner_id FOREIGN KEY (owner_id) REFERENCES users(id)
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_agencies_slug ON agencies (slug)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agencies_owner_id ON agencies (owner_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON agencies (is_active)")

    # Create agency_members table
    op.execute("""
        CREATE TABLE IF NOT EXISTS agency_members (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            agency_id UUID NOT NULL,
            user_id UUID NOT NULL,
            role agency_member_role_enum NOT NULL DEFAULT 'member',
            status agency_member_status_enum NOT NULL DEFAULT 'pending_invite',
            invited_by UUID,
            invited_at TIMESTAMP WITH TIME ZONE,
            joined_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT fk_agency_members_agency_id FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
            CONSTRAINT fk_agency_members_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_agency_members_invited_by FOREIGN KEY (invited_by) REFERENCES users(id),
            CONSTRAINT uq_agency_members_agency_user UNIQUE (agency_id, user_id)
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_members_agency_id ON agency_members (agency_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_members_user_id ON agency_members (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_members_status ON agency_members (status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_members_role ON agency_members (role)")

    # Create agency_invitations table
    op.execute("""
        CREATE TABLE IF NOT EXISTS agency_invitations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            agency_id UUID NOT NULL,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) UNIQUE NOT NULL,
            invited_by UUID NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            accepted_at TIMESTAMP WITH TIME ZONE,
            status agency_invitation_status_enum NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT fk_agency_invitations_agency_id FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
            CONSTRAINT fk_agency_invitations_invited_by FOREIGN KEY (invited_by) REFERENCES users(id)
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_invitations_agency_id ON agency_invitations (agency_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_invitations_email ON agency_invitations (email)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_invitations_token ON agency_invitations (token)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_invitations_status ON agency_invitations (status)")

    # Create agency_opportunities table
    op.execute("""
        CREATE TABLE IF NOT EXISTS agency_opportunities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            agency_id UUID NOT NULL,
            creator_id UUID NOT NULL,
            created_by UUID NOT NULL,

            title VARCHAR(255) NOT NULL,
            brand_name VARCHAR(255) NOT NULL,
            brand_logo_url VARCHAR(500),
            description TEXT NOT NULL,

            requirements JSONB NOT NULL DEFAULT '{}',
            compensation JSONB NOT NULL DEFAULT '{}',

            deadline TIMESTAMP WITH TIME ZONE,
            content_deadline TIMESTAMP WITH TIME ZONE,

            status agency_opportunity_status_enum NOT NULL DEFAULT 'draft',
            sent_at TIMESTAMP WITH TIME ZONE,
            viewed_at TIMESTAMP WITH TIME ZONE,
            creator_response_at TIMESTAMP WITH TIME ZONE,
            creator_notes TEXT,

            project_id UUID,

            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

            CONSTRAINT fk_agency_opportunities_agency_id FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
            CONSTRAINT fk_agency_opportunities_creator_id FOREIGN KEY (creator_id) REFERENCES users(id),
            CONSTRAINT fk_agency_opportunities_created_by FOREIGN KEY (created_by) REFERENCES users(id),
            CONSTRAINT fk_agency_opportunities_project_id FOREIGN KEY (project_id) REFERENCES active_projects(id) ON DELETE SET NULL
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_opportunities_agency_id ON agency_opportunities (agency_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_opportunities_creator_id ON agency_opportunities (creator_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_opportunities_status ON agency_opportunities (status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_opportunities_created_by ON agency_opportunities (created_by)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agency_opportunities_sent_at ON agency_opportunities (sent_at)")

    # Add agency_id column to users table
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id UUID")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE users ADD CONSTRAINT fk_users_agency_id
                FOREIGN KEY (agency_id) REFERENCES agencies(id);
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users (agency_id)")


def downgrade() -> None:
    """Remove agency tables and related infrastructure."""

    # Drop index and column from users
    op.execute("DROP INDEX IF EXISTS idx_users_agency_id")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_agency_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS agency_id")

    # Drop agency_opportunities table
    op.execute("DROP INDEX IF EXISTS idx_agency_opportunities_sent_at")
    op.execute("DROP INDEX IF EXISTS idx_agency_opportunities_created_by")
    op.execute("DROP INDEX IF EXISTS idx_agency_opportunities_status")
    op.execute("DROP INDEX IF EXISTS idx_agency_opportunities_creator_id")
    op.execute("DROP INDEX IF EXISTS idx_agency_opportunities_agency_id")
    op.execute("DROP TABLE IF EXISTS agency_opportunities")

    # Drop agency_invitations table
    op.execute("DROP INDEX IF EXISTS idx_agency_invitations_status")
    op.execute("DROP INDEX IF EXISTS idx_agency_invitations_token")
    op.execute("DROP INDEX IF EXISTS idx_agency_invitations_email")
    op.execute("DROP INDEX IF EXISTS idx_agency_invitations_agency_id")
    op.execute("DROP TABLE IF EXISTS agency_invitations")

    # Drop agency_members table
    op.execute("DROP INDEX IF EXISTS idx_agency_members_role")
    op.execute("DROP INDEX IF EXISTS idx_agency_members_status")
    op.execute("DROP INDEX IF EXISTS idx_agency_members_user_id")
    op.execute("DROP INDEX IF EXISTS idx_agency_members_agency_id")
    op.execute("DROP TABLE IF EXISTS agency_members")

    # Drop agencies table
    op.execute("DROP INDEX IF EXISTS idx_agencies_is_active")
    op.execute("DROP INDEX IF EXISTS idx_agencies_owner_id")
    op.execute("DROP INDEX IF EXISTS idx_agencies_slug")
    op.execute("DROP TABLE IF EXISTS agencies")

    # Drop ENUM types
    op.execute("DROP TYPE IF EXISTS agency_opportunity_status_enum")
    op.execute("DROP TYPE IF EXISTS agency_invitation_status_enum")
    op.execute("DROP TYPE IF EXISTS agency_member_status_enum")
    op.execute("DROP TYPE IF EXISTS agency_member_role_enum")
