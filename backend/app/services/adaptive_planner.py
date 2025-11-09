"""Adaptive planning service for modifying implementation plans during execution."""

import os
import json
from typing import Dict, List, Optional
from datetime import datetime

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.models.monetization import ActiveProject, PlanModification, CreatorProfile
from app.core.config import settings


class AdaptivePlanner:
    """Modifies implementation plans during execution based on signals."""

    def __init__(self, db: AsyncSession):
        self.db = db
        api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
        if not api_key:
            raise ValueError("CLAUDE_API_KEY not configured")

        self.ai = AsyncAnthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"

    async def evaluate_adaptation(
        self,
        project_id: str,
        trigger_type: str,
        trigger_content: str
    ) -> Optional[Dict]:
        """
        Decide if plan should be adapted and how.

        Args:
            project_id: Active project being modified
            trigger_type: "user_request" | "progress_signal" | "market_feedback"
            trigger_content: The actual signal (user message, data, etc.)

        Returns:
            Adaptation plan if should adapt, None if should not
        """

        logger.info(f"Evaluating adaptation for project {project_id}, trigger: {trigger_type}")

        # Get current project state
        project = await self._get_project(project_id)
        if not project:
            logger.error(f"Project {project_id} not found")
            return None

        profile = await self._get_creator_profile(project.user_id)
        progress = await self._get_project_progress(project)

        # Build evaluation prompt
        prompt = self._build_evaluation_prompt(
            project,
            profile,
            progress,
            trigger_type,
            trigger_content
        )

        # AI decides
        decision = await self._call_ai_evaluation(prompt)

        if not decision.get('should_adapt', False):
            logger.info(f"No adaptation needed for project {project_id}")
            return None

        # If adapting, apply modifications
        modifications = await self._apply_modifications(
            project_id,
            decision.get('modifications', [])
        )

        # Log the adaptation
        await self._log_modification(
            project_id,
            trigger_type,
            trigger_content,
            modifications,
            decision.get('rationale', '')
        )

        return {
            "modifications": modifications,
            "user_message": decision.get('user_message', ''),
            "updated_plan": project.customized_plan
        }

    def _build_evaluation_prompt(
        self,
        project: 'ActiveProject',
        profile: Dict,
        progress: Dict,
        trigger_type: str,
        trigger_content: str
    ) -> str:
        """Build prompt for AI to evaluate if adaptation is needed."""

        prompt = f"""You are evaluating whether to adapt an implementation plan based on new information.

# CURRENT STATE

## Project: {project.opportunity_title}
Status: {project.status}
Progress: {project.overall_progress}% overall
Current Phase: {project.current_phase_index + 1}
Started: {project.started_at.strftime('%Y-%m-%d')}

## Current Plan
{json.dumps(project.customized_plan, indent=2)}

## Completed Tasks
{json.dumps(progress.get('completed_tasks', []), indent=2)}

## User Context
Available time: {profile.get('time_available_hours_per_week', 10)} hours/week
Current workload: {self._estimate_current_workload(project, progress)}

# NEW SIGNAL

Type: {trigger_type}
Content: {trigger_content}

# DECISION FRAMEWORK

Evaluate the signal:

1. **ASSESS SIGNAL STRENGTH**
   - Is this actionable or just noise?
   - Does it align with their goals?
   - Is timing right?
   - How strong is the evidence?

2. **EVALUATE CAPACITY**
   - Can they handle this addition?
   - What's the opportunity cost?
   - Will it derail current progress?
   - Do they have required skills/resources?

3. **DETERMINE APPROACH**
   Options:
   - Add to current phase (immediate action)
   - Add future phase (later action)
   - Replace existing task (pivot)
   - Ignore (not strong enough signal)

4. **PLAN MODIFICATIONS**
   If adapting:
   - What specific changes to make?
   - How to maintain momentum?
   - How to communicate clearly?

# OUTPUT FORMAT

Return JSON:
```json
{{
  "should_adapt": boolean,
  "rationale": "Clear explanation of decision",
  "signal_strength": "weak" | "medium" | "strong",
  "modifications": [
    {{
      "type": "add_task" | "remove_task" | "add_phase" | "reorder" | "adjust_timeline",
      "phase_id": "which phase (e.g., 2)",
      "task_id": "optional, for task-level changes",
      "details": {{
        /* new task object or phase object or adjustment */
      }},
      "reason": "why this specific change",
      "impact": "how this affects overall plan"
    }}
  ],
  "user_message": "Clear, concise explanation for user",
  "follow_up_questions": ["if need clarification"]
}}
```

# RULES

1. **Be conservative**: Don't adapt without strong reason
2. **Maintain focus**: Core plan should stay intact
3. **Stay realistic**: Don't overcommit their time
4. **Explain clearly**: User needs to understand WHY
5. **Consider timing**: Is this the right time to add this?

Evaluate now:"""

        return prompt

    async def _call_ai_evaluation(self, prompt: str) -> Dict:
        """Call AI to evaluate adaptation."""

        try:
            response = await self.ai.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.7,
                system="You are an adaptive planning expert. Return only valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            decision = json.loads(content.strip())

            return decision

        except Exception as e:
            logger.error(f"Error calling AI for adaptation evaluation: {e}")
            # Default to no adaptation
            return {
                "should_adapt": False,
                "rationale": "Error evaluating adaptation",
                "signal_strength": "unknown"
            }

    async def _apply_modifications(
        self,
        project_id: str,
        modifications: List[Dict]
    ) -> List[Dict]:
        """
        Apply modifications to project plan in database.

        Returns the applied modifications with any adjustments.
        """

        project = await self._get_project(project_id)
        if not project:
            return []

        plan = project.customized_plan
        if not isinstance(plan, dict) or 'phases' not in plan:
            logger.error(f"Invalid plan structure for project {project_id}")
            return []

        applied = []

        for mod in modifications:
            try:
                if mod['type'] == 'add_task':
                    # Insert task into specified phase
                    phase_id = mod.get('phase_id')
                    if phase_id and phase_id.isdigit():
                        phase_idx = int(phase_id) - 1
                        if 0 <= phase_idx < len(plan['phases']):
                            plan['phases'][phase_idx]['steps'].append(mod['details'])
                            applied.append(mod)

                elif mod['type'] == 'remove_task':
                    # Mark task as skipped
                    phase_id = mod.get('phase_id')
                    task_id = mod.get('task_id')
                    if phase_id and task_id and phase_id.isdigit():
                        phase_idx = int(phase_id) - 1
                        if 0 <= phase_idx < len(plan['phases']):
                            # Find task by ID
                            for step in plan['phases'][phase_idx]['steps']:
                                if step.get('id') == task_id:
                                    step['skipped'] = True
                                    step['skip_reason'] = mod.get('reason', '')
                                    applied.append(mod)
                                    break

                elif mod['type'] == 'add_phase':
                    # Add entire new phase
                    plan['phases'].append(mod['details'])
                    applied.append(mod)

                elif mod['type'] == 'adjust_timeline':
                    # Update phase timelines
                    phase_id = mod.get('phase_id')
                    if phase_id and phase_id.isdigit():
                        phase_idx = int(phase_id) - 1
                        if 0 <= phase_idx < len(plan['phases']):
                            plan['phases'][phase_idx]['timeline'] = mod['details'].get('new_timeline')
                            applied.append(mod)

            except Exception as e:
                logger.error(f"Error applying modification: {e}")
                continue

        # Save updated plan
        if applied:
            await self._update_project_plan(project_id, plan)
            logger.info(f"Applied {len(applied)} modifications to project {project_id}")

        return applied

    async def _log_modification(
        self,
        project_id: str,
        trigger_type: str,
        trigger_content: str,
        modifications: List[Dict],
        rationale: str
    ):
        """Log modification to plan_modifications table."""

        try:
            for mod in modifications:
                modification = PlanModification(
                    project_id=project_id,
                    modification_type=mod['type'],
                    trigger_type=trigger_type,
                    trigger_content=trigger_content,
                    changes=mod,
                    ai_rationale=rationale,
                    modified_at=datetime.utcnow()
                )
                self.db.add(modification)

            await self.db.commit()
            logger.info(f"Logged {len(modifications)} modifications for project {project_id}")

        except Exception as e:
            logger.error(f"Error logging modifications: {e}")
            await self.db.rollback()

    def _estimate_current_workload(self, project: 'ActiveProject', progress: Dict) -> str:
        """Estimate how busy they currently are."""

        completed = len(progress.get('completed_tasks', []))
        total_tasks = sum(
            len(phase.get('steps', []))
            for phase in project.customized_plan.get('phases', [])
        )

        if total_tasks == 0:
            return "unknown"

        completion_rate = completed / total_tasks

        if completion_rate < 0.2:
            return "just starting"
        elif completion_rate < 0.5:
            return "moderate - mid-project"
        elif completion_rate < 0.8:
            return "high - near completion"
        else:
            return "very high - finishing up"

    async def _get_project(self, project_id: str) -> Optional['ActiveProject']:
        """Get project from DB."""
        result = await self.db.execute(
            select(ActiveProject).where(ActiveProject.id == project_id)
        )
        return result.scalar_one_or_none()

    async def _get_creator_profile(self, user_id: str) -> Dict:
        """Get profile from DB."""
        result = await self.db.execute(
            select(CreatorProfile).where(CreatorProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return {}

        return {
            "primary_platform": profile.primary_platform,
            "follower_count": profile.follower_count,
            "engagement_rate": float(profile.engagement_rate),
            "niche": profile.niche,
            "time_available_hours_per_week": profile.time_available_hours_per_week
        }

    async def _get_project_progress(self, project: 'ActiveProject') -> Dict:
        """Get progress data."""
        from app.models.monetization import ProjectTaskCompletion

        result = await self.db.execute(
            select(ProjectTaskCompletion)
            .where(ProjectTaskCompletion.project_id == project.id)
        )
        completions = result.scalars().all()

        return {
            "completed_tasks": [
                {
                    "task_id": c.task_id,
                    "task_title": c.task_title,
                    "completed_at": c.completed_at.isoformat() if c.completed_at else None
                }
                for c in completions
            ]
        }

    async def _update_project_plan(self, project_id: str, plan: Dict):
        """Update customized_plan in DB."""
        project = await self._get_project(project_id)
        if project:
            project.customized_plan = plan
            project.updated_at = datetime.utcnow()
            await self.db.commit()
