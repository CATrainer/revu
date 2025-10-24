"""add user approval workflow and application tables

Revision ID: 20251024_120500
Revises: 2aa5e9a1f29b
Create Date: 2025-10-24 12:05:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20251024_120500"
down_revision = "2aa5e9a1f29b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply new onboarding workflow schema changes."""
    
    # Create ENUM types using DO blocks for idempotency (IF NOT EXISTS not supported for CREATE TYPE)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE account_type_enum AS ENUM ('creator', 'agency', 'legacy');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE application_status_enum AS ENUM ('pending', 'approved', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Add new columns to users table using raw SQL to avoid type recreation
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type account_type_enum")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status approval_status_enum NOT NULL DEFAULT 'pending'")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_by UUID")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT")
    
    # Create foreign key constraints for approved_by and rejected_by (with exception handling)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE users ADD CONSTRAINT fk_users_approved_by 
                FOREIGN KEY (approved_by) REFERENCES users(id);
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE users ADD CONSTRAINT fk_users_rejected_by 
                FOREIGN KEY (rejected_by) REFERENCES users(id);
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Data migration for existing users
    op.execute("""
        UPDATE users 
        SET account_type = 'legacy'::account_type_enum 
        WHERE account_type IS NULL
    """)
    
    op.execute("""
        UPDATE users 
        SET approval_status = (CASE 
            WHEN access_status = 'full' THEN 'approved'
            WHEN access_status = 'waiting' THEN 'pending'
            ELSE 'pending'
        END)::approval_status_enum
        WHERE approval_status = 'pending'::approval_status_enum AND access_status IS NOT NULL
    """)
    
    op.execute("""
        UPDATE users 
        SET approved_at = early_access_granted_at
        WHERE early_access_granted_at IS NOT NULL 
        AND approved_at IS NULL
        AND approval_status = 'approved'::approval_status_enum
    """)
    
    # Add indexes for performance (idempotent)
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users (approval_status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_account_type ON users (account_type)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_approval_account ON users (approval_status, account_type)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users (is_admin) WHERE is_admin = true")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_access_status ON users (access_status)")
    
    # Create applications table using raw SQL to avoid type recreation
    op.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            account_type account_type_enum NOT NULL,
            application_data JSONB NOT NULL,
            submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            reviewed_at TIMESTAMP WITH TIME ZONE,
            reviewed_by UUID,
            status application_status_enum NOT NULL DEFAULT 'pending',
            admin_notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT fk_applications_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_applications_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
        )
    """)
    
    op.execute("CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications (submitted_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_applications_account_type ON applications (account_type)")
    
    # Create admin_notification_settings table using raw SQL
    op.execute("""
        CREATE TABLE IF NOT EXISTS admin_notification_settings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) NOT NULL UNIQUE,
            notification_types JSONB NOT NULL DEFAULT '{"creator_applications": true, "agency_applications": true}',
            is_active BOOLEAN NOT NULL DEFAULT true,
            added_by UUID,
            added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT fk_admin_notifications_added_by FOREIGN KEY (added_by) REFERENCES users(id)
        )
    """)
    
    op.execute("CREATE INDEX IF NOT EXISTS idx_admin_notifications_active ON admin_notification_settings (is_active)")


def downgrade() -> None:
    """Revert onboarding workflow schema changes."""
    
    # Drop indexes
    op.drop_index('idx_admin_notifications_active', table_name='admin_notification_settings')
    op.drop_index('idx_applications_account_type', table_name='applications')
    op.drop_index('idx_applications_submitted_at', table_name='applications')
    op.drop_index('idx_applications_status', table_name='applications')
    op.drop_index('idx_applications_user_id', table_name='applications')
    op.drop_index('idx_users_access_status', table_name='users')
    op.drop_index('idx_users_is_admin', table_name='users')
    op.drop_index('idx_users_approval_account', table_name='users')
    op.drop_index('idx_users_account_type', table_name='users')
    op.drop_index('idx_users_approval_status', table_name='users')
    
    # Drop tables
    op.drop_table('admin_notification_settings')
    op.drop_table('applications')
    
    # Drop foreign keys
    op.drop_constraint('fk_users_rejected_by', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_approved_by', 'users', type_='foreignkey')
    
    # Drop columns from users
    op.drop_column('users', 'rejection_reason')
    op.drop_column('users', 'rejected_by')
    op.drop_column('users', 'rejected_at')
    op.drop_column('users', 'approved_by')
    op.drop_column('users', 'approved_at')
    op.drop_column('users', 'application_submitted_at')
    op.drop_column('users', 'approval_status')
    op.drop_column('users', 'account_type')
    
    # Drop ENUM types
    op.execute('DROP TYPE IF EXISTS application_status_enum')
    op.execute('DROP TYPE IF EXISTS approval_status_enum')
    op.execute('DROP TYPE IF EXISTS account_type_enum')
