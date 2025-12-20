"""Service for managing system views and workflows."""
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.view import InteractionView
from app.models.workflow import Workflow


# System views that are created for every user
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
            'exclude_archived': True
        },
        'display': {
            'sortBy': 'newest',
            'showReplies': True,
            'density': 'comfortable'
        },
        'description': 'All non-archived interactions'
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
            'status': ['awaiting_approval']
        },
        'display': {
            'sortBy': 'oldest',  # Show oldest first so they get approved
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
        'description': 'Archived interactions'
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
            'status': ['answered'],
            'has_sent_response': True
        },
        'display': {
            'sortBy': 'newest',
            'showReplies': True,
            'density': 'comfortable'
        },
        'description': 'History of all sent responses'
    },
]


# System workflows that are created for every user
SYSTEM_WORKFLOWS = [
    {
        'name': 'Auto Moderator',
        'type': 'system',
        'priority': 1,  # Highest priority
        'status': 'active',
        'is_enabled': False,  # Disabled by default, user must enable
        'is_global': True,
        'action_type': 'auto_moderate',
        'description': 'Automatically handles harassment, spam, and inappropriate content. Configure conditions and enable to activate.',
        'natural_language_conditions': [
            'Hateful or abusive messages',
            'Spam or promotional content',
            'Messages containing profanity or slurs',
        ],
        'action_config': {
            'use_platform_settings': True,  # Use per-platform settings from auto_moderator_settings
        }
    },
    {
        'name': 'Auto Archive',
        'type': 'system',
        'priority': 2,
        'status': 'active',
        'is_enabled': False,  # Disabled by default
        'is_global': True,
        'action_type': 'auto_archive',
        'description': 'Automatically archives low-value interactions that don\'t need a response.',
        'natural_language_conditions': [
            'Generic thank you messages',
            'Single emoji responses',
            'Messages that don\'t require a response',
        ],
        'action_config': {}
    },
]


class SystemViewsService:
    """Service for managing system views and workflows."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_system_views_for_user(self, user_id: UUID, organization_id: Optional[UUID] = None) -> List[InteractionView]:
        """Create all system views for a new user.
        
        Args:
            user_id: The user to create views for
            organization_id: Optional organization ID
            
        Returns:
            List of created views
        """
        created_views = []
        
        for view_config in SYSTEM_VIEWS:
            # Check if view already exists
            existing = await self.session.execute(
                select(InteractionView).where(
                    and_(
                        InteractionView.user_id == user_id,
                        InteractionView.name == view_config['name'],
                        InteractionView.is_system == True
                    )
                )
            )
            
            if existing.scalar_one_or_none():
                logger.debug(f"System view '{view_config['name']}' already exists for user {user_id}")
                continue
            
            view = InteractionView(
                name=view_config['name'],
                icon=view_config['icon'],
                color=view_config['color'],
                type=view_config['type'],
                is_system=view_config['is_system'],
                is_pinned=view_config['is_pinned'],
                order_index=view_config['order_index'],
                filters=view_config['filters'],
                display=view_config['display'],
                description=view_config.get('description'),
                user_id=user_id,
                organization_id=organization_id,
            )
            
            self.session.add(view)
            created_views.append(view)
            logger.info(f"Created system view '{view_config['name']}' for user {user_id}")
        
        await self.session.flush()
        return created_views
    
    async def create_system_workflows_for_user(self, user_id: UUID, organization_id: Optional[UUID] = None) -> List[Workflow]:
        """Create all system workflows for a new user.
        
        Args:
            user_id: The user to create workflows for
            organization_id: Optional organization ID
            
        Returns:
            List of created workflows
        """
        created_workflows = []
        
        for workflow_config in SYSTEM_WORKFLOWS:
            # Check if workflow already exists
            existing = await self.session.execute(
                select(Workflow).where(
                    and_(
                        Workflow.user_id == user_id,
                        Workflow.name == workflow_config['name'],
                        Workflow.type == 'system'
                    )
                )
            )
            
            if existing.scalar_one_or_none():
                logger.debug(f"System workflow '{workflow_config['name']}' already exists for user {user_id}")
                continue
            
            workflow = Workflow(
                name=workflow_config['name'],
                type=workflow_config['type'],
                priority=workflow_config['priority'],
                status=workflow_config['status'],
                is_enabled=workflow_config['is_enabled'],
                is_global=workflow_config['is_global'],
                action_type=workflow_config['action_type'],
                description=workflow_config.get('description'),
                natural_language_conditions=workflow_config.get('natural_language_conditions'),
                action_config=workflow_config.get('action_config'),
                user_id=user_id,
                organization_id=organization_id,
                created_by_id=user_id,
            )
            
            self.session.add(workflow)
            created_workflows.append(workflow)
            logger.info(f"Created system workflow '{workflow_config['name']}' for user {user_id}")
        
        await self.session.flush()
        return created_workflows
    
    async def setup_user_interactions_system(self, user_id: UUID, organization_id: Optional[UUID] = None) -> dict:
        """Set up the complete interactions system for a new user.
        
        Creates system views and workflows.
        
        Args:
            user_id: The user to set up
            organization_id: Optional organization ID
            
        Returns:
            Dictionary with created views and workflows
        """
        views = await self.create_system_views_for_user(user_id, organization_id)
        workflows = await self.create_system_workflows_for_user(user_id, organization_id)
        
        return {
            'views_created': len(views),
            'workflows_created': len(workflows),
            'view_names': [v.name for v in views],
            'workflow_names': [w.name for w in workflows],
        }
    
    async def get_system_views(self, user_id: UUID) -> List[InteractionView]:
        """Get all system views for a user.
        
        Args:
            user_id: The user to get views for
            
        Returns:
            List of system views
        """
        result = await self.session.execute(
            select(InteractionView).where(
                and_(
                    InteractionView.user_id == user_id,
                    InteractionView.is_system == True
                )
            ).order_by(InteractionView.order_index)
        )
        
        return list(result.scalars().all())
    
    async def get_system_workflows(self, user_id: UUID) -> List[Workflow]:
        """Get all system workflows for a user.
        
        Args:
            user_id: The user to get workflows for
            
        Returns:
            List of system workflows
        """
        result = await self.session.execute(
            select(Workflow).where(
                and_(
                    Workflow.user_id == user_id,
                    Workflow.type == 'system'
                )
            ).order_by(Workflow.priority)
        )
        
        return list(result.scalars().all())


def get_system_views_service(session: AsyncSession) -> SystemViewsService:
    """Factory function to get a SystemViewsService instance."""
    return SystemViewsService(session)
