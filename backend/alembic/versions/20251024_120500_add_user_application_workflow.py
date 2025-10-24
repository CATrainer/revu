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
    
    # Create ENUM types
    account_type_enum = postgresql.ENUM('creator', 'agency', 'legacy', name='account_type_enum', create_type=True)
    account_type_enum.create(op.get_bind(), checkfirst=True)
    
    approval_status_enum = postgresql.ENUM('pending', 'approved', 'rejected', name='approval_status_enum', create_type=True)
    approval_status_enum.create(op.get_bind(), checkfirst=True)
    
    application_status_enum = postgresql.ENUM('pending', 'approved', 'rejected', name='application_status_enum', create_type=True)
    application_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Add new columns to users table
    op.add_column('users', sa.Column('account_type', postgresql.ENUM('creator', 'agency', 'legacy', name='account_type_enum'), nullable=True))
    op.add_column('users', sa.Column('approval_status', postgresql.ENUM('pending', 'approved', 'rejected', name='approval_status_enum'), nullable=False, server_default='pending'))
    op.add_column('users', sa.Column('application_submitted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('users', sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('rejected_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('users', sa.Column('rejection_reason', sa.Text(), nullable=True))
    
    # Create foreign key constraints for approved_by and rejected_by
    op.create_foreign_key('fk_users_approved_by', 'users', 'users', ['approved_by'], ['id'])
    op.create_foreign_key('fk_users_rejected_by', 'users', 'users', ['rejected_by'], ['id'])
    
    # Data migration for existing users
    op.execute("""
        UPDATE users 
        SET account_type = 'legacy' 
        WHERE account_type IS NULL
    """)
    
    op.execute("""
        UPDATE users 
        SET approval_status = CASE 
            WHEN access_status = 'full' THEN 'approved'
            WHEN access_status = 'waiting' THEN 'pending'
            ELSE 'pending'
        END
        WHERE approval_status = 'pending' AND access_status IS NOT NULL
    """)
    
    op.execute("""
        UPDATE users 
        SET approved_at = early_access_granted_at
        WHERE early_access_granted_at IS NOT NULL 
        AND approved_at IS NULL
        AND approval_status = 'approved'
    """)
    
    # Add indexes for performance
    op.create_index('idx_users_approval_status', 'users', ['approval_status'])
    op.create_index('idx_users_account_type', 'users', ['account_type'])
    op.create_index('idx_users_approval_account', 'users', ['approval_status', 'account_type'])
    op.create_index('idx_users_is_admin', 'users', ['is_admin'], postgresql_where=sa.text('is_admin = true'))
    op.create_index('idx_users_access_status', 'users', ['access_status'])
    
    # Create applications table
    op.create_table(
        'applications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_type', postgresql.ENUM('creator', 'agency', name='application_status_enum'), nullable=False),
        sa.Column('application_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'approved', 'rejected', name='application_status_enum'), nullable=False, server_default='pending'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_applications_user_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], name='fk_applications_reviewed_by'),
    )
    
    op.create_index('idx_applications_user_id', 'applications', ['user_id'])
    op.create_index('idx_applications_status', 'applications', ['status'])
    op.create_index('idx_applications_submitted_at', 'applications', ['submitted_at'], postgresql_using='btree', postgresql_ops={'submitted_at': 'DESC'})
    op.create_index('idx_applications_account_type', 'applications', ['account_type'])
    
    # Create admin_notification_settings table
    op.create_table(
        'admin_notification_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('notification_types', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{"creator_applications": true, "agency_applications": true}'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('added_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['added_by'], ['users.id'], name='fk_admin_notifications_added_by'),
    )
    
    op.create_index('idx_admin_notifications_active', 'admin_notification_settings', ['is_active'])


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
