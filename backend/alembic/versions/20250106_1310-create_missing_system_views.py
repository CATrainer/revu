"""Create missing system views for all users

Revision ID: 20250106_1310
Revises: 20250106_1122
Create Date: 2025-01-06

This migration creates missing system views (Awaiting Approval, Archive, Sent)
for users who only have the "All" view.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import json
from uuid import uuid4
from datetime import datetime

# revision identifiers, used by Alembic.
revision = "20250106_1310"
down_revision = "20250106_1122"
branch_labels = None
depends_on = None


# System views that should exist for every user
SYSTEM_VIEWS = [
    {
        'name': 'All',
        'icon': '📥',
        'color': '#3b82f6',
        'type': 'system',
        'is_system': True,
        'is_pinned': True,
        'order_index': 0,
        'filters': {
            'exclude_archived': True,
            'exclude_sent': True
        },
        'display': {
            'sortBy': 'newest',
            'showReplies': True,
            'density': 'comfortable'
        },
        'description': 'Interactions needing attention (excludes sent and archived)'
    },
    {
        'name': 'Awaiting Approval',
        'icon': '⏳',
        'color': '#f59e0b',
        'type': 'system',
        'is_system': True,
        'is_pinned': True,
        'order_index': 1,
        'filters': {
            'status': ['awaiting_approval'],
            'exclude_archived': True
        },
        'display': {
            'sortBy': 'oldest',
            'showReplies': True,
            'density': 'comfortable'
        },
        'description': 'AI-generated responses waiting for your approval'
    },
    {
        'name': 'Archive',
        'icon': '📦',
        'color': '#6b7280',
        'type': 'system',
        'is_system': True,
        'is_pinned': True,
        'order_index': 2,
        'filters': {
            'archived_only': True
        },
        'display': {
            'sortBy': 'newest',
            'showReplies': False,
            'density': 'compact'
        },
        'description': 'Manually or automatically archived interactions'
    },
    {
        'name': 'Sent',
        'icon': '✅',
        'color': '#10b981',
        'type': 'system',
        'is_system': True,
        'is_pinned': True,
        'order_index': 3,
        'filters': {
            'has_sent_response': True,
            'exclude_archived': True
        },
        'display': {
            'sortBy': 'newest',
            'showReplies': True,
            'density': 'comfortable'
        },
        'description': 'Interactions where you have sent a response'
    },
]


def upgrade() -> None:
    """Create missing system views for all users."""
    connection = op.get_bind()
    
    # Get all distinct user_ids that have at least one system view
    result = connection.execute(
        sa.text("""
            SELECT DISTINCT user_id, organization_id 
            FROM interaction_views 
            WHERE is_system = true
        """)
    )
    users = result.fetchall()
    
    created_count = 0
    
    for user_row in users:
        user_id = user_row[0]
        org_id = user_row[1]
        
        for view_config in SYSTEM_VIEWS:
            # Check if this view already exists for this user
            existing = connection.execute(
                sa.text("""
                    SELECT id FROM interaction_views 
                    WHERE user_id = :user_id 
                    AND name = :name 
                    AND is_system = true
                """),
                {'user_id': user_id, 'name': view_config['name']}
            ).fetchone()
            
            if existing:
                continue
            
            # Create the missing view
            new_id = str(uuid4())
            now = datetime.utcnow()
            
            connection.execute(
                sa.text("""
                    INSERT INTO interaction_views (
                        id, name, icon, color, type, is_system, is_pinned, 
                        order_index, filters, display, description,
                        user_id, organization_id, created_at, updated_at
                    ) VALUES (
                        :id, :name, :icon, :color, :type, :is_system, :is_pinned,
                        :order_index, CAST(:filters AS jsonb), CAST(:display AS jsonb), :description,
                        :user_id, :organization_id, :created_at, :updated_at
                    )
                """),
                {
                    'id': new_id,
                    'name': view_config['name'],
                    'icon': view_config['icon'],
                    'color': view_config['color'],
                    'type': view_config['type'],
                    'is_system': view_config['is_system'],
                    'is_pinned': view_config['is_pinned'],
                    'order_index': view_config['order_index'],
                    'filters': json.dumps(view_config['filters']),
                    'display': json.dumps(view_config['display']),
                    'description': view_config['description'],
                    'user_id': user_id,
                    'organization_id': org_id,
                    'created_at': now,
                    'updated_at': now,
                }
            )
            created_count += 1
            print(f"Created system view '{view_config['name']}' for user {user_id}")
    
    print(f"Created {created_count} missing system views for {len(users)} users")


def downgrade() -> None:
    """Remove system views created by this migration (except 'All')."""
    connection = op.get_bind()
    
    # Only delete the views we might have created (not 'All' which existed before)
    connection.execute(
        sa.text("""
            DELETE FROM interaction_views 
            WHERE is_system = true 
            AND name IN ('Awaiting Approval', 'Archive', 'Sent')
        """)
    )
    
    print("Removed Awaiting Approval, Archive, and Sent system views")
