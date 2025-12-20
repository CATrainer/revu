"""Workflow Engine V2 - Priority-based workflow execution with AI condition evaluation."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import json

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.interaction import Interaction
from app.models.workflow import Workflow
from app.models.auto_moderator_settings import AutoModeratorSettings
from app.services.archive_service import get_archive_service


class WorkflowEngineV2:
    """Priority-based workflow engine.
    
    Key principles:
    1. Only ONE workflow runs per interaction (highest priority wins)
    2. System workflows have fixed priorities (1-2)
    3. Custom workflows start at priority 3+
    4. Natural language conditions are evaluated by AI
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self._anthropic_client = None
    
    @property
    def anthropic_client(self):
        """Lazy-load Anthropic client."""
        if self._anthropic_client is None:
            from anthropic import AsyncAnthropic
            import os
            self._anthropic_client = AsyncAnthropic(
                api_key=os.getenv("ANTHROPIC_API_KEY")
            )
        return self._anthropic_client
    
    async def process_interaction(
        self,
        interaction: Interaction,
        user_id: UUID,
    ) -> Optional[Dict[str, Any]]:
        """Process an interaction through the workflow system.
        
        Only ONE workflow runs per interaction - highest priority wins.
        
        Args:
            interaction: The interaction to process
            user_id: The user who owns this interaction
            
        Returns:
            Result dict if a workflow executed, None otherwise
        """
        # Skip if already processed
        if interaction.processed_by_workflow_id:
            logger.debug(f"Interaction {interaction.id} already processed by workflow {interaction.processed_by_workflow_id}")
            return None
        
        # Get all active workflows in priority order (lower priority number = higher priority)
        result = await self.session.execute(
            select(Workflow)
            .where(
                and_(
                    Workflow.user_id == user_id,
                    Workflow.status == 'active',
                    Workflow.is_enabled == True
                )
            )
            .order_by(Workflow.priority.asc())
        )
        workflows = list(result.scalars().all())
        
        if not workflows:
            logger.debug(f"No active workflows for user {user_id}")
            return None
        
        for workflow in workflows:
            # Check platform filter
            if workflow.platforms and interaction.platform not in workflow.platforms:
                continue
            
            # Check interaction type filter
            if workflow.interaction_types and interaction.type not in workflow.interaction_types:
                continue
            
            # Evaluate natural language conditions
            if workflow.natural_language_conditions:
                matches = await self._evaluate_conditions(interaction, workflow)
                if not matches:
                    continue
            
            # All conditions matched - execute action
            logger.info(f"Workflow '{workflow.name}' (priority {workflow.priority}) matched interaction {interaction.id}")
            
            result = await self._execute_action(interaction, workflow, user_id)
            
            # Mark as processed
            interaction.processed_by_workflow_id = workflow.id
            interaction.processed_at = datetime.utcnow()
            interaction.workflow_id = workflow.id
            interaction.workflow_action = workflow.action_type
            
            return {
                "workflow_id": str(workflow.id),
                "workflow_name": workflow.name,
                "action_type": workflow.action_type,
                "result": result,
            }
        
        logger.debug(f"No workflows matched interaction {interaction.id}")
        return None
    
    async def _evaluate_conditions(
        self,
        interaction: Interaction,
        workflow: Workflow
    ) -> bool:
        """Use AI to evaluate if interaction matches workflow conditions.
        
        Args:
            interaction: The interaction to evaluate
            workflow: The workflow with conditions to check
            
        Returns:
            True if ALL conditions match, False otherwise
        """
        if not workflow.natural_language_conditions:
            return True
        
        # Build context for AI
        conditions_text = "\n".join(f"- {c}" for c in workflow.natural_language_conditions)
        
        prompt = f"""Evaluate if this social media message matches ALL of the following conditions.

MESSAGE DETAILS:
- Platform: {interaction.platform}
- Type: {interaction.type}
- Author: @{interaction.author_username or 'unknown'}
- Content: "{interaction.content}"

CONDITIONS TO CHECK (message must match ALL):
{conditions_text}

Respond with JSON only: {{"matches": true/false, "reason": "brief explanation"}}"""

        try:
            response = await self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-latest",
                max_tokens=200,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result_text = response.content[0].text.strip()
            
            # Parse JSON response
            if result_text.startswith("{"):
                result = json.loads(result_text)
                matches = result.get("matches", False)
                reason = result.get("reason", "")
                
                logger.debug(f"Condition evaluation for workflow '{workflow.name}': matches={matches}, reason={reason}")
                return matches
            
            return False
            
        except Exception as e:
            logger.error(f"Error evaluating conditions for workflow {workflow.id}: {e}")
            return False
    
    async def _execute_action(
        self,
        interaction: Interaction,
        workflow: Workflow,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Execute the workflow action.
        
        Args:
            interaction: The interaction to act on
            workflow: The workflow with action config
            user_id: The user who owns this interaction
            
        Returns:
            Result dict with action details
        """
        action_type = workflow.action_type
        action_config = workflow.action_config or {}
        
        if action_type == 'auto_moderate':
            return await self._execute_moderation(interaction, workflow, user_id)
        
        elif action_type == 'auto_archive':
            return await self._execute_archive(interaction, workflow)
        
        elif action_type == 'auto_respond':
            return await self._execute_auto_respond(interaction, workflow, user_id)
        
        elif action_type == 'generate_response':
            return await self._execute_generate_response(interaction, workflow, user_id)
        
        else:
            logger.warning(f"Unknown action type: {action_type}")
            return {"action": "unknown", "error": f"Unknown action type: {action_type}"}
    
    async def _execute_moderation(
        self,
        interaction: Interaction,
        workflow: Workflow,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Execute auto-moderation action.
        
        Gets the user's platform-specific settings and performs the appropriate action.
        """
        # Get user's moderation settings
        result = await self.session.execute(
            select(AutoModeratorSettings).where(AutoModeratorSettings.user_id == user_id)
        )
        settings = result.scalar_one_or_none()
        
        if not settings:
            # Create default settings
            settings = AutoModeratorSettings(user_id=user_id)
            self.session.add(settings)
            await self.session.flush()
        
        # Get action for this platform and type
        action = settings.get_action(interaction.platform, interaction.type)
        
        if action == 'none':
            return {"action": "none", "reason": "Moderation disabled for this platform/type"}
        
        # Execute platform action
        from app.services.platform_actions import get_platform_action_service
        platform_service = get_platform_action_service()
        
        if action == 'delete':
            result = await platform_service.delete_interaction(interaction, self.session)
            if result["success"]:
                # Also delete from our database
                await self.session.delete(interaction)
            return {"action": "delete", "platform_result": result}
        
        elif action == 'hide':
            result = await platform_service.hide_interaction(interaction, self.session)
            return {"action": "hide", "platform_result": result}
        
        elif action == 'block':
            result = await platform_service.block_user(interaction, self.session)
            return {"action": "block", "platform_result": result}
        
        elif action == 'mute':
            result = await platform_service.mute_user(interaction, self.session)
            return {"action": "mute", "platform_result": result}
        
        elif action == 'report':
            result = await platform_service.report_interaction(interaction, self.session)
            return {"action": "report", "platform_result": result}
        
        return {"action": action, "error": "Action not implemented"}
    
    async def _execute_archive(
        self,
        interaction: Interaction,
        workflow: Workflow
    ) -> Dict[str, Any]:
        """Execute auto-archive action."""
        archive_service = get_archive_service(self.session)
        success = await archive_service.archive_by_workflow(interaction.id, workflow.id)
        
        return {
            "action": "archive",
            "success": success,
        }
    
    async def _execute_auto_respond(
        self,
        interaction: Interaction,
        workflow: Workflow,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Execute auto-respond with template text."""
        action_config = workflow.action_config or {}
        template = action_config.get("template", "")
        
        if not template:
            return {"action": "auto_respond", "error": "No template configured"}
        
        # Send the response
        from app.services.platform_actions import get_platform_action_service
        platform_service = get_platform_action_service()
        
        result = await platform_service.send_reply(interaction, template, self.session)
        
        if result["success"]:
            # Record the sent response
            from app.services.sent_response_service import get_sent_response_service
            sent_service = get_sent_response_service(self.session)
            
            await sent_service.record_sent_response(
                interaction_id=interaction.id,
                response_text=template,
                user_id=user_id,
                response_type='automated',
                workflow_id=workflow.id,
                platform_response_id=result.get("reply_id"),
                is_demo=interaction.is_demo,
            )
            
            interaction.status = 'answered'
            interaction.responded_at = datetime.utcnow()
        
        return {
            "action": "auto_respond",
            "success": result["success"],
            "platform_result": result,
        }
    
    async def _execute_generate_response(
        self,
        interaction: Interaction,
        workflow: Workflow,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Generate AI response and put in awaiting_approval status."""
        action_config = workflow.action_config or {}
        tone = action_config.get("tone", "friendly")
        
        # Generate response using the response generator
        from app.services.response_generator import get_response_generator
        generator = get_response_generator(self.session)
        
        response_text = await generator.generate_response(
            interaction=interaction,
            user_id=user_id,
            tone=tone,
        )
        
        # Store as pending response
        interaction.pending_response = {
            "text": response_text,
            "generated_at": datetime.utcnow().isoformat(),
            "model": "claude-3-5-sonnet-latest",
            "workflow_id": str(workflow.id),
        }
        interaction.status = 'awaiting_approval'
        
        return {
            "action": "generate_response",
            "success": True,
            "response_preview": response_text[:100] + "..." if len(response_text) > 100 else response_text,
        }


def get_workflow_engine(session: AsyncSession) -> WorkflowEngineV2:
    """Factory function to get a WorkflowEngineV2 instance."""
    return WorkflowEngineV2(session)
