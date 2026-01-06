"""System Workflows Service.

Handles creation and management of system workflows (Auto Moderator, Auto Archive).

System workflows are special workflows that:
- Have fixed priorities (1 and 2)
- Have fixed actions that vary by interaction type
- Users can only edit activation conditions (ai_conditions) and status
- Are created automatically for new users
"""
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.workflow import (
    Workflow,
    SYSTEM_WORKFLOW_AUTO_MODERATOR,
    SYSTEM_WORKFLOW_AUTO_ARCHIVE,
    SYSTEM_WORKFLOW_PRIORITIES,
)


# System workflow definitions
SYSTEM_WORKFLOWS = {
    SYSTEM_WORKFLOW_AUTO_MODERATOR: {
        "name": "Auto Moderator",
        "description": "Automatically handles harassment, spam, and inappropriate content",
        "priority": SYSTEM_WORKFLOW_PRIORITIES[SYSTEM_WORKFLOW_AUTO_MODERATOR],
        "action_type": "moderate",  # Special action type for moderation
        "action_config": {
            # Actions vary by interaction type:
            # - DM: block_user
            # - Comment: delete_comment  
            # - Mention: block_user
            "dm_action": "block_user",
            "comment_action": "delete_comment",
            "mention_action": "block_user",
        },
        "default_conditions": [],  # Empty = never runs until user adds conditions
        "example_conditions": [
            "Hateful or abusive messages",
            "Spam or promotional content",
            "Messages with profanity or inappropriate language",
            "Threatening or harassing messages",
        ],
    },
    SYSTEM_WORKFLOW_AUTO_ARCHIVE: {
        "name": "Auto Archive",
        "description": "Automatically archives interactions that don't need a response",
        "priority": SYSTEM_WORKFLOW_PRIORITIES[SYSTEM_WORKFLOW_AUTO_ARCHIVE],
        "action_type": "archive",  # Special action type for archiving
        "action_config": {
            # Archives locally, does not delete from platform
            "archive_locally": True,
        },
        "default_conditions": [],  # Empty = never runs until user adds conditions
        "example_conditions": [
            "Generic thank you messages",
            "Single emoji responses",
            "Messages I don't need to respond to",
            "Simple acknowledgments like 'ok' or 'thanks'",
        ],
    },
}


async def ensure_system_workflows_exist(
    session: AsyncSession,
    user_id: UUID,
    organization_id: Optional[UUID] = None,
) -> List[Workflow]:
    """Ensure system workflows exist for a user.
    
    Creates Auto Moderator and Auto Archive workflows if they don't exist.
    Called during user creation or when accessing workflows.
    
    Args:
        session: Database session
        user_id: User ID to create workflows for
        organization_id: Optional organization ID
        
    Returns:
        List of system workflows (created or existing)
    """
    created_workflows = []
    
    for system_type, config in SYSTEM_WORKFLOWS.items():
        # Check if workflow already exists
        result = await session.execute(
            select(Workflow).where(
                and_(
                    Workflow.user_id == user_id,
                    Workflow.system_workflow_type == system_type,
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            created_workflows.append(existing)
            continue
        
        # Create the system workflow
        workflow = Workflow(
            name=config["name"],
            status="paused",  # Start paused until user adds conditions
            priority=config["priority"],
            is_enabled=True,
            system_workflow_type=system_type,
            platforms=None,  # Applies to all platforms
            interaction_types=None,  # Applies to all interaction types
            view_ids=None,  # Applies to all views
            ai_conditions=config["default_conditions"],  # Empty = never matches
            action_type=config["action_type"],
            action_config=config["action_config"],
            user_id=user_id,
            organization_id=organization_id,
            is_global=False,  # Required field
        )
        session.add(workflow)
        created_workflows.append(workflow)
        
        logger.info(f"Created system workflow '{config['name']}' for user {user_id}")
    
    return created_workflows


async def get_system_workflow(
    session: AsyncSession,
    user_id: UUID,
    system_type: str,
) -> Optional[Workflow]:
    """Get a specific system workflow for a user.
    
    Args:
        session: Database session
        user_id: User ID
        system_type: System workflow type (auto_moderator or auto_archive)
        
    Returns:
        The workflow if found, None otherwise
    """
    result = await session.execute(
        select(Workflow).where(
            and_(
                Workflow.user_id == user_id,
                Workflow.system_workflow_type == system_type,
            )
        )
    )
    return result.scalar_one_or_none()


def is_system_workflow(workflow: Workflow) -> bool:
    """Check if a workflow is a system workflow."""
    return workflow.system_workflow_type is not None


def get_system_workflow_info(system_type: str) -> dict:
    """Get information about a system workflow type.
    
    Args:
        system_type: System workflow type
        
    Returns:
        Dict with name, description, example_conditions, etc.
    """
    if system_type not in SYSTEM_WORKFLOWS:
        return {}
    return SYSTEM_WORKFLOWS[system_type]


def validate_system_workflow_update(
    workflow: Workflow,
    update_data: dict,
) -> tuple[bool, str]:
    """Validate that an update to a system workflow only changes allowed fields.
    
    System workflows can only have these fields updated:
    - ai_conditions (activation conditions)
    - status (active/paused)
    
    Args:
        workflow: The workflow being updated
        update_data: Dict of fields being updated
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not is_system_workflow(workflow):
        return True, ""
    
    allowed_fields = {"ai_conditions", "status"}
    
    for field in update_data:
        if field not in allowed_fields and update_data[field] is not None:
            return False, f"Cannot modify '{field}' on system workflows. Only activation conditions and status can be changed."
    
    return True, ""
