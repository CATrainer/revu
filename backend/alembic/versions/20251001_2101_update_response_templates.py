"""update response templates for user-based usage

Revision ID: 20251001_2101
Revises: 20251001_2100
Create Date: 2025-10-01 21:01:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = '20251001_2101'
down_revision = '20251001_2100'
branch_labels = None
depends_on = None


def upgrade():
    """Make response_templates location_id nullable and created_by_id required.
    
    This allows templates to be user-based (for content creators) instead of
    only location-based (for businesses).
    """
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if response_templates table exists
    existing_tables = inspector.get_table_names()
    if 'response_templates' not in existing_tables:
        print("⚠️  response_templates table doesn't exist, skipping migration")
        return
    
    # Get existing columns
    existing_columns = inspector.get_columns('response_templates')
    column_dict = {col['name']: col for col in existing_columns}
    
    # Make location_id nullable (if it exists and is currently NOT NULL)
    if 'location_id' in column_dict:
        # Check if column is currently NOT NULL
        if not column_dict['location_id']['nullable']:
            op.alter_column(
                'response_templates',
                'location_id',
                existing_type=sa.dialects.postgresql.UUID(),
                nullable=True,
                comment='Location ID - nullable to support user-based templates'
            )
            print("✅ Made location_id nullable")
        else:
            print("ℹ️  location_id already nullable")
    
    # Make created_by_id required (if it exists and is currently NULL)
    if 'created_by_id' in column_dict:
        # First, set any NULL values to a default (if needed)
        # Note: This assumes there are no NULL values or we handle them appropriately
        if column_dict['created_by_id']['nullable']:
            # Check if there are any NULL values
            result = conn.execute(sa.text(
                "SELECT COUNT(*) FROM response_templates WHERE created_by_id IS NULL"
            ))
            null_count = result.scalar()
            
            if null_count > 0:
                print(f"⚠️  Found {null_count} templates with NULL created_by_id")
                print("   These need to be assigned to a user before making the field required")
                print("   Skipping created_by_id constraint change")
            else:
                op.alter_column(
                    'response_templates',
                    'created_by_id',
                    existing_type=sa.dialects.postgresql.UUID(),
                    nullable=False,
                    comment='User who created the template - required for data ownership'
                )
                print("✅ Made created_by_id required")
        else:
            print("ℹ️  created_by_id already required")
    
    print("✅ Successfully updated response_templates table for user-based usage")


def downgrade():
    """Revert response_templates changes."""
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if table exists
    existing_tables = inspector.get_table_names()
    if 'response_templates' not in existing_tables:
        print("⚠️  response_templates table doesn't exist, skipping downgrade")
        return
    
    # Get existing columns
    existing_columns = inspector.get_columns('response_templates')
    column_dict = {col['name']: col for col in existing_columns}
    
    # Revert created_by_id to nullable (if needed for downgrade compatibility)
    if 'created_by_id' in column_dict and not column_dict['created_by_id']['nullable']:
        op.alter_column(
            'response_templates',
            'created_by_id',
            existing_type=sa.dialects.postgresql.UUID(),
            nullable=True
        )
        print("✅ Reverted created_by_id to nullable")
    
    # Revert location_id to NOT NULL (only if safe - check for NULL values first)
    if 'location_id' in column_dict and column_dict['location_id']['nullable']:
        result = conn.execute(sa.text(
            "SELECT COUNT(*) FROM response_templates WHERE location_id IS NULL"
        ))
        null_count = result.scalar()
        
        if null_count > 0:
            print(f"⚠️  Cannot revert location_id to NOT NULL: {null_count} templates have NULL location_id")
            print("   Please assign locations to these templates before running downgrade")
        else:
            op.alter_column(
                'response_templates',
                'location_id',
                existing_type=sa.dialects.postgresql.UUID(),
                nullable=False
            )
            print("✅ Reverted location_id to NOT NULL")
    
    print("✅ Successfully reverted response_templates changes")
