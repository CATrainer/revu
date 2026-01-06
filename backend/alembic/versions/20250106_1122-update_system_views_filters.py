"""Update system views with new filters for All, Archive, Sent views

Revision ID: 20250106_1122
Revises: 20250901_1200
Create Date: 2025-01-06

This migration updates existing system views with the correct filters:
- All: exclude_archived=True, exclude_sent=True (excludes sent unless new activity)
- Awaiting Approval: status=['awaiting_approval'], exclude_archived=True
- Archive: archived_only=True (only shows archived interactions)
- Sent: has_sent_response=True, exclude_archived=True
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import json

# revision identifiers, used by Alembic.
revision = "20250106_1122"
down_revision = "20251216_1900"
branch_labels = None
depends_on = None


# New filter configurations for system views
SYSTEM_VIEW_FILTERS = {
    'All': {
        'filters': {
            'exclude_archived': True,
            'exclude_sent': True
        },
        'description': 'Interactions needing attention (excludes sent and archived)'
    },
    'Awaiting Approval': {
        'filters': {
            'status': ['awaiting_approval'],
            'exclude_archived': True
        },
        'description': 'AI-generated responses waiting for your approval'
    },
    'Archive': {
        'filters': {
            'archived_only': True
        },
        'description': 'Manually or automatically archived interactions'
    },
    'Sent': {
        'filters': {
            'has_sent_response': True,
            'exclude_archived': True
        },
        'description': 'Interactions where you have sent a response'
    },
}

# Old filter configurations for downgrade
OLD_SYSTEM_VIEW_FILTERS = {
    'All': {
        'filters': {
            'exclude_archived': True
        },
        'description': 'All non-archived interactions'
    },
    'Awaiting Approval': {
        'filters': {
            'status': ['awaiting_approval']
        },
        'description': 'AI-generated responses waiting for your approval'
    },
    'Archive': {
        'filters': {
            'archived_only': True
        },
        'description': 'Archived interactions'
    },
    'Sent': {
        'filters': {
            'status': ['answered'],
            'has_sent_response': True
        },
        'description': 'History of all sent responses'
    },
}


def upgrade() -> None:
    """Update system views with new filter configurations."""
    connection = op.get_bind()
    
    for view_name, config in SYSTEM_VIEW_FILTERS.items():
        # Update the filters and description for each system view
        connection.execute(
            sa.text("""
                UPDATE interaction_views 
                SET filters = :filters::jsonb,
                    description = :description,
                    updated_at = NOW()
                WHERE name = :name 
                AND is_system = true
            """),
            {
                'name': view_name,
                'filters': json.dumps(config['filters']),
                'description': config['description']
            }
        )
    
    print(f"Updated {len(SYSTEM_VIEW_FILTERS)} system views with new filters")


def downgrade() -> None:
    """Revert system views to old filter configurations."""
    connection = op.get_bind()
    
    for view_name, config in OLD_SYSTEM_VIEW_FILTERS.items():
        connection.execute(
            sa.text("""
                UPDATE interaction_views 
                SET filters = :filters::jsonb,
                    description = :description,
                    updated_at = NOW()
                WHERE name = :name 
                AND is_system = true
            """),
            {
                'name': view_name,
                'filters': json.dumps(config['filters']),
                'description': config['description']
            }
        )
    
    print(f"Reverted {len(OLD_SYSTEM_VIEW_FILTERS)} system views to old filters")
