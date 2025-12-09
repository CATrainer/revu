"""rename_metadata_columns_in_agency_models

Revision ID: 1b514d565aa0
Revises: e186bf30ab03
Create Date: 2025-12-09 10:42:44.223980

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1b514d565aa0'
down_revision = 'e186bf30ab03'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename metadata column to notification_metadata in agency_notifications table
    op.alter_column('agency_notifications', 'metadata', 
                    new_column_name='notification_metadata')
    
    # Rename metadata column to activity_metadata in agency_activities table
    op.alter_column('agency_activities', 'metadata', 
                    new_column_name='activity_metadata')


def downgrade() -> None:
    # Revert notification_metadata back to metadata in agency_notifications table
    op.alter_column('agency_notifications', 'notification_metadata', 
                    new_column_name='metadata')
    
    # Revert activity_metadata back to metadata in agency_activities table
    op.alter_column('agency_activities', 'activity_metadata', 
                    new_column_name='metadata')