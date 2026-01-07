"""AI-powered project customization service for monetization projects."""

import json
from typing import List, Dict, Any, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.monetization_v2 import MonetizationProject, MonetizationTask, MonetizationTemplate
from app.services.monetization_recommendation_service import MonetizationRecommendationService
from app.core.config import settings


class MonetizationCustomizationService:
    """Service for AI-powered project customization."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def customize_project_with_ai(
        self,
        project_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Customize a project's tasks based on creator profile.
        Called after project creation to personalize the action plan.
        
        Returns True if customization was successful.
        """
        try:
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
                logger.warning(f"Project not found for customization: {project_id}")
                return False
            
            # Get tasks
            tasks_result = await self.db.execute(
                select(MonetizationTask)
                .where(MonetizationTask.project_id == project_id)
                .order_by(MonetizationTask.sort_order)
            )
            tasks = list(tasks_result.scalars().all())
            
            if not tasks:
                logger.warning(f"No tasks found for project: {project_id}")
                return False
            
            # Get template for context
            template_result = await self.db.execute(
                select(MonetizationTemplate)
                .where(MonetizationTemplate.id == project.template_id)
            )
            template = template_result.scalar_one_or_none()
            
            if not template:
                logger.warning(f"Template not found: {project.template_id}")
                return False
            
            # Build creator profile
            recommendation_service = MonetizationRecommendationService(self.db)
            profile = await recommendation_service.build_creator_profile(user_id)
            
            # Generate customized tasks using AI
            customized_result = await self._generate_customized_tasks(
                template=template,
                tasks=tasks,
                profile=profile,
                decision_values=project.decision_values or {}
            )
            
            if not customized_result:
                logger.warning(f"AI customization failed for project: {project_id}")
                return False
            
            # Update tasks with customized content
            task_updates = {t['id']: t for t in customized_result.get('tasks', [])}
            
            for task in tasks:
                if task.task_id in task_updates:
                    update_data = task_updates[task.task_id]
                    task.description = update_data.get('description', task.description)
                    if 'estimated_hours' in update_data and update_data['estimated_hours']:
                        task.estimated_hours = update_data['estimated_hours']
            
            # Save customization notes to project
            project.ai_customization_notes = customized_result.get('customization_notes', '')
            project.customized_plan = customized_result.get('tasks', [])
            
            await self.db.commit()
            
            logger.info(f"Successfully customized project {project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error customizing project {project_id}: {e}")
            return False
    
    async def _generate_customized_tasks(
        self,
        template: MonetizationTemplate,
        tasks: List[MonetizationTask],
        profile: Any,
        decision_values: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Generate customized task descriptions using AI."""
        try:
            from anthropic import AsyncAnthropic
            
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            # Build task list for prompt
            task_list = []
            for task in tasks:
                task_list.append({
                    "id": task.task_id,
                    "title": task.title,
                    "description": task.description,
                    "estimated_hours": task.estimated_hours,
                    "phase": task.phase,
                    "phase_name": task.phase_name
                })
            
            prompt = f"""You are customizing a monetization action plan for a specific creator.

TEMPLATE: {template.title}
CATEGORY: {template.category}

CURRENT TASKS:
{json.dumps(task_list, indent=2)}

CREATOR PROFILE:
- Total Followers: {profile.total_followers:,}
- Platforms: {', '.join(profile.platforms)}
- Primary Platform: {profile.primary_platform}
- Niche: {profile.niche}
- Engagement Rate: {profile.avg_engagement_rate:.1f}%
- Posting Frequency: {profile.posting_frequency}
- Existing Revenue Streams: {', '.join(profile.existing_revenue_streams) if profile.existing_revenue_streams else 'None yet'}

DECISION VALUES (user choices): {json.dumps(decision_values) if decision_values else 'Not yet configured'}

Your task: Customize each task description to be specific to this creator.
- Reference their platforms, niche, and follower count where relevant
- Make descriptions actionable and specific to their situation
- Adjust estimated hours if their situation warrants (more followers = more work for launch, etc.)
- Keep the same task IDs and titles
- Keep descriptions concise but personalized (2-3 sentences max)

Return JSON in this exact format:
{{
    "tasks": [
        {{"id": "1.1", "title": "...", "description": "...", "estimated_hours": X}},
        ...
    ],
    "customization_notes": "Brief 1-2 sentence summary of what was customized"
}}

Return ONLY valid JSON, no other text."""

            response = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse the response
            response_text = response.content[0].text.strip()
            
            # Try to extract JSON if wrapped in markdown
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                json_lines = []
                in_json = False
                for line in lines:
                    if line.startswith("```json"):
                        in_json = True
                        continue
                    elif line.startswith("```"):
                        in_json = False
                        continue
                    if in_json:
                        json_lines.append(line)
                response_text = "\n".join(json_lines)
            
            result = json.loads(response_text)
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"AI customization generation failed: {e}")
            return None
    
    async def recustomize_tasks_for_decisions(
        self,
        project_id: UUID,
        user_id: UUID,
        changed_decision_keys: List[str]
    ) -> bool:
        """
        Re-customize tasks that depend on changed decisions.
        Called when user updates decision values.
        """
        try:
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
                return False
            
            # Get tasks that depend on changed decisions and are not done
            tasks_result = await self.db.execute(
                select(MonetizationTask)
                .where(
                    MonetizationTask.project_id == project_id,
                    MonetizationTask.status != 'done'
                )
                .order_by(MonetizationTask.sort_order)
            )
            all_tasks = list(tasks_result.scalars().all())
            
            # Filter to tasks affected by changed decisions
            affected_tasks = []
            for task in all_tasks:
                task_deps = set(task.depends_on_decisions or [])
                if task_deps & set(changed_decision_keys):
                    affected_tasks.append(task)
            
            if not affected_tasks:
                logger.info(f"No tasks affected by decision changes for project {project_id}")
                return True
            
            # Get template
            template_result = await self.db.execute(
                select(MonetizationTemplate)
                .where(MonetizationTemplate.id == project.template_id)
            )
            template = template_result.scalar_one_or_none()
            
            if not template:
                return False
            
            # Build creator profile
            recommendation_service = MonetizationRecommendationService(self.db)
            profile = await recommendation_service.build_creator_profile(user_id)
            
            # Re-customize only affected tasks
            customized_result = await self._generate_customized_tasks(
                template=template,
                tasks=affected_tasks,
                profile=profile,
                decision_values=project.decision_values or {}
            )
            
            if not customized_result:
                return False
            
            # Update affected tasks
            task_updates = {t['id']: t for t in customized_result.get('tasks', [])}
            
            for task in affected_tasks:
                if task.task_id in task_updates:
                    update_data = task_updates[task.task_id]
                    task.description = update_data.get('description', task.description)
                    if 'estimated_hours' in update_data and update_data['estimated_hours']:
                        task.estimated_hours = update_data['estimated_hours']
            
            # Append to customization notes
            new_notes = customized_result.get('customization_notes', '')
            if new_notes:
                existing_notes = project.ai_customization_notes or ''
                project.ai_customization_notes = f"{existing_notes}\n\nUpdated: {new_notes}".strip()
            
            await self.db.commit()
            
            logger.info(f"Re-customized {len(affected_tasks)} tasks for project {project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error re-customizing tasks for project {project_id}: {e}")
            return False


async def customize_project_background(project_id: UUID, user_id: UUID, db: AsyncSession):
    """Background task wrapper for project customization."""
    service = MonetizationCustomizationService(db)
    await service.customize_project_with_ai(project_id, user_id)


def get_customization_service(db: AsyncSession) -> MonetizationCustomizationService:
    """Dependency injection helper."""
    return MonetizationCustomizationService(db)
