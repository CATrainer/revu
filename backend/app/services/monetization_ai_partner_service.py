"""AI Partner service for monetization project assistance."""

import json
from typing import List, Dict, Any, Optional
from uuid import UUID
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.monetization_v2 import MonetizationProject, MonetizationTask, MonetizationTemplate
from app.models.monetization import CreatorProfile
from app.services.monetization_recommendation_service import MonetizationRecommendationService
from app.core.config import settings


# Tool definitions for the AI partner
MONETIZATION_AI_TOOLS = [
    {
        "name": "update_monetization_task",
        "description": "Update the status of a task. Use this when the user indicates they've completed a task or want to change its status. NEVER use this for tasks already marked as done.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The task ID (e.g., '1.1', '2.3')"
                },
                "new_status": {
                    "type": "string",
                    "enum": ["todo", "in_progress", "done"],
                    "description": "The new status for the task"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why this change is being made"
                }
            },
            "required": ["task_id", "new_status", "reason"]
        }
    },
    {
        "name": "update_monetization_decisions",
        "description": "Update one or more decision values for the project. This will trigger re-customization of affected tasks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "decisions": {
                    "type": "object",
                    "description": "Key-value pairs of decisions to update"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why these decisions are being updated"
                }
            },
            "required": ["decisions", "reason"]
        }
    }
]


@dataclass
class ToolCall:
    """Represents a tool call from the AI."""
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class AIPartnerResponse:
    """Response from the AI partner."""
    content: str
    tool_calls: List[ToolCall]
    requires_confirmation: bool


class MonetizationAIPartnerService:
    """Service for AI partner interactions in monetization projects."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def build_system_prompt(
        self,
        project: MonetizationProject,
        tasks: List[MonetizationTask],
        user_id: UUID
    ) -> str:
        """Build the system prompt with full project context."""
        # Get creator profile
        recommendation_service = MonetizationRecommendationService(self.db)
        profile = await recommendation_service.build_creator_profile(user_id)
        
        # Get template for context
        template_result = await self.db.execute(
            select(MonetizationTemplate).where(MonetizationTemplate.id == project.template_id)
        )
        template = template_result.scalar_one_or_none()
        
        # Categorize tasks
        completed_tasks = [t for t in tasks if t.status == 'done']
        in_progress_tasks = [t for t in tasks if t.status == 'in_progress']
        todo_tasks = [t for t in tasks if t.status == 'todo']
        
        # Build task lists
        completed_list = "\n".join(f"- [{t.task_id}] {t.title}" for t in completed_tasks) or "None yet"
        in_progress_list = "\n".join(f"- [{t.task_id}] {t.title}: {t.description[:100]}..." for t in in_progress_tasks) or "None"
        
        # Limit todo list to first 10
        todo_list_items = [f"- [{t.task_id}] {t.title}" for t in todo_tasks[:10]]
        if len(todo_tasks) > 10:
            todo_list_items.append(f"... and {len(todo_tasks) - 10} more")
        todo_list = "\n".join(todo_list_items) or "None"
        
        # Format decision values
        decisions_json = json.dumps(project.decision_values or {}, indent=2)
        
        return f"""You are a monetization strategy partner helping a creator execute their project.

# PROJECT CONTEXT
Project: {project.title}
Template: {template.title if template else project.template_id}
Category: {template.category if template else 'Unknown'}
Status: {project.status}

# CREATOR PROFILE  
- Followers: {profile.total_followers:,}
- Platforms: {', '.join(profile.platforms)}
- Niche: {profile.niche}
- Engagement Rate: {profile.avg_engagement_rate:.1f}%
- Primary Platform: {profile.primary_platform}

# CURRENT DECISIONS
{decisions_json}

# TASK STATUS
Completed ({len(completed_tasks)}):
{completed_list}

In Progress ({len(in_progress_tasks)}):
{in_progress_list}

To Do ({len(todo_tasks)}):
{todo_list}

# AI CUSTOMIZATION NOTES
{project.ai_customization_notes or "None yet"}

# GUIDELINES

1. Be direct and analytical. Reference their specific numbers.

2. For any action that modifies project state (completing tasks, changing decisions), 
   ALWAYS use the appropriate tool. Don't just say you'll do it.

3. NEVER attempt to modify completed tasks. They are locked.

4. When suggesting task completion, confirm with the user first:
   "It sounds like you've finished validating your topic. Should I mark task 1.1 as complete?"

5. When updating decisions, explain the impact:
   "Changing to Kajabi will update tasks 2.3 and 4.2 with platform-specific instructions."

6. Keep responses focused: 2-4 paragraphs unless they ask for detail.

7. If they go off-topic, gently redirect:
   "That's Phase 3 work, but we should finish pricing first. Quick decision: $297 or $497?"

8. Acknowledge progress briefly: "Nice. Task 1.2 done. ✓"
   Not: "Awesome job! You're crushing it!"

Current conversation continues below."""

    async def get_project_context(
        self,
        project_id: UUID,
        user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get full project context for AI partner."""
        # Get project
        project_result = await self.db.execute(
            select(MonetizationProject)
            .where(
                MonetizationProject.id == project_id,
                MonetizationProject.user_id == user_id
            )
        )
        project = project_result.scalar_one_or_none()
        
        if not project:
            return None
        
        # Get tasks
        tasks_result = await self.db.execute(
            select(MonetizationTask)
            .where(MonetizationTask.project_id == project_id)
            .order_by(MonetizationTask.phase, MonetizationTask.sort_order)
        )
        tasks = list(tasks_result.scalars().all())
        
        # Build system prompt
        system_prompt = await self.build_system_prompt(project, tasks, user_id)
        
        return {
            "project": project,
            "tasks": tasks,
            "system_prompt": system_prompt,
            "tools": MONETIZATION_AI_TOOLS
        }
    
    async def chat(
        self,
        project_id: UUID,
        user_id: UUID,
        messages: List[Dict[str, str]],
        stream: bool = False
    ) -> AIPartnerResponse:
        """
        Send a message to the AI partner and get a response.
        
        Args:
            project_id: The project ID
            user_id: The user ID
            messages: List of message dicts with 'role' and 'content'
            stream: Whether to stream the response
            
        Returns:
            AIPartnerResponse with content and any tool calls
        """
        try:
            from anthropic import AsyncAnthropic
            
            # Get project context
            context = await self.get_project_context(project_id, user_id)
            
            if not context:
                return AIPartnerResponse(
                    content="I couldn't find your project. Please make sure you have an active project.",
                    tool_calls=[],
                    requires_confirmation=False
                )
            
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            # Call Claude with tools
            response = await client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=context["system_prompt"],
                tools=context["tools"],
                messages=messages
            )
            
            # Extract content and tool calls
            content = ""
            tool_calls = []
            
            for block in response.content:
                if block.type == "text":
                    content += block.text
                elif block.type == "tool_use":
                    tool_calls.append(ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input
                    ))
            
            return AIPartnerResponse(
                content=content,
                tool_calls=tool_calls,
                requires_confirmation=len(tool_calls) > 0
            )
            
        except Exception as e:
            logger.error(f"AI partner chat error: {e}")
            return AIPartnerResponse(
                content=f"I encountered an error. Please try again. ({str(e)[:100]})",
                tool_calls=[],
                requires_confirmation=False
            )
    
    async def execute_tool(
        self,
        project_id: UUID,
        user_id: UUID,
        tool_name: str,
        tool_args: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a tool call after user confirmation.
        
        Returns a result dict with success status and any relevant data.
        """
        if tool_name == "update_monetization_task":
            return await self._execute_update_task(project_id, user_id, tool_args)
        elif tool_name == "update_monetization_decisions":
            return await self._execute_update_decisions(project_id, user_id, tool_args)
        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    async def _execute_update_task(
        self,
        project_id: UUID,
        user_id: UUID,
        args: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute task status update."""
        task_id = args.get("task_id")
        new_status = args.get("new_status")
        reason = args.get("reason", "")
        
        # Find the task
        task_result = await self.db.execute(
            select(MonetizationTask)
            .join(MonetizationProject)
            .where(
                MonetizationTask.task_id == task_id,
                MonetizationTask.project_id == project_id,
                MonetizationProject.user_id == user_id
            )
        )
        task = task_result.scalar_one_or_none()
        
        if not task:
            return {"success": False, "error": f"Task {task_id} not found"}
        
        # Check if task is already done (protected)
        if task.status == "done":
            return {"success": False, "error": f"Task {task_id} is already completed and cannot be modified"}
        
        # Update the task
        from datetime import datetime
        old_status = task.status
        task.status = new_status
        
        if new_status == "done":
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None
        
        await self.db.commit()
        
        return {
            "success": True,
            "task_id": task_id,
            "old_status": old_status,
            "new_status": new_status,
            "reason": reason,
            "message": f"Task {task_id} updated from {old_status} to {new_status}"
        }
    
    async def _execute_update_decisions(
        self,
        project_id: UUID,
        user_id: UUID,
        args: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute decision values update."""
        decisions = args.get("decisions", {})
        reason = args.get("reason", "")
        
        # Get the project
        project_result = await self.db.execute(
            select(MonetizationProject)
            .where(
                MonetizationProject.id == project_id,
                MonetizationProject.user_id == user_id
            )
        )
        project = project_result.scalar_one_or_none()
        
        if not project:
            return {"success": False, "error": "Project not found"}
        
        # Merge decisions
        current_decisions = project.decision_values or {}
        updated_decisions = {**current_decisions, **decisions}
        project.decision_values = updated_decisions
        
        await self.db.commit()
        
        # Trigger re-customization in background
        changed_keys = list(decisions.keys())
        
        return {
            "success": True,
            "updated_decisions": decisions,
            "reason": reason,
            "changed_keys": changed_keys,
            "message": f"Updated {len(decisions)} decision(s). Tasks will be re-customized."
        }


def get_ai_partner_service(db: AsyncSession) -> MonetizationAIPartnerService:
    """Dependency injection helper."""
    return MonetizationAIPartnerService(db)
