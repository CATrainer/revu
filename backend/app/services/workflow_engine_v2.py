"""Workflow Engine V2 - Priority-based workflow execution with AI condition evaluation.

This engine processes new incoming interactions through user-defined workflows.

Key principles:
1. Only ONE workflow runs per interaction (highest priority wins)
2. Workflows only apply to new incoming messages
3. View labeling happens BEFORE workflow evaluation
4. Natural language conditions are evaluated by LLM
5. Two actions: auto_respond, generate_response
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Set
from uuid import UUID
import json

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.interaction import Interaction
from app.models.workflow import (
    Workflow, 
    WorkflowExecution,
    SYSTEM_WORKFLOW_AUTO_MODERATOR,
    SYSTEM_WORKFLOW_AUTO_ARCHIVE,
)
from app.models.view_tag import InteractionViewTag
from app.core.config import settings


class WorkflowEngineV2:
    """Priority-based workflow engine.
    
    Flow:
    1. New interaction arrives
    2. View labeling happens first (done elsewhere)
    3. Check which workflows match (filters + view scope)
    4. Evaluate natural language conditions via LLM
    5. Highest priority matching workflow executes
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self._anthropic_client = None
    
    @property
    def anthropic_client(self):
        """Lazy-load Anthropic client."""
        if self._anthropic_client is None:
            from anthropic import AsyncAnthropic
            self._anthropic_client = AsyncAnthropic(
                api_key=settings.EFFECTIVE_ANTHROPIC_KEY
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
        # Skip if already processed by a workflow
        if interaction.workflow_id:
            logger.debug(f"Interaction {interaction.id} already processed by workflow {interaction.workflow_id}")
            return None
        
        # Skip replies - workflows only apply to incoming messages
        if interaction.is_reply or interaction.type == 'reply':
            logger.debug(f"Skipping reply interaction {interaction.id}")
            return None
        
        # Get all active workflows in priority order (lower number = higher priority)
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
        
        # Get view tags for this interaction (for view scope checking)
        interaction_view_ids = await self._get_interaction_view_ids(interaction.id)
        
        # Find the first (highest priority) matching workflow
        for workflow in workflows:
            match_result = await self._check_workflow_match(
                interaction, workflow, interaction_view_ids
            )
            
            if not match_result["matches"]:
                continue
            
            # All conditions matched - execute action
            logger.info(
                f"Workflow '{workflow.name}' (priority {workflow.priority}) "
                f"matched interaction {interaction.id}"
            )
            
            action_result = await self._execute_action(interaction, workflow, user_id)
            
            # Mark interaction as processed by this workflow
            interaction.workflow_id = workflow.id
            interaction.workflow_action = workflow.action_type
            
            # Log execution
            await self._log_execution(
                workflow_id=workflow.id,
                interaction_id=interaction.id,
                status="completed",
                result=action_result,
                user_id=user_id,
            )
            
            return {
                "workflow_id": str(workflow.id),
                "workflow_name": workflow.name,
                "action_type": workflow.action_type,
                "result": action_result,
            }
        
        logger.debug(f"No workflows matched interaction {interaction.id}")
        return None
    
    async def _get_interaction_view_ids(self, interaction_id: UUID) -> Set[UUID]:
        """Get all view IDs that this interaction is tagged with."""
        result = await self.session.execute(
            select(InteractionViewTag.view_id)
            .where(InteractionViewTag.interaction_id == interaction_id)
        )
        return set(row[0] for row in result.fetchall())
    
    async def _check_workflow_match(
        self,
        interaction: Interaction,
        workflow: Workflow,
        interaction_view_ids: Set[UUID],
    ) -> Dict[str, Any]:
        """Check if a workflow matches an interaction.
        
        Checks in order:
        1. Platform filter
        2. Interaction type filter
        3. View scope
        4. AI condition (if any)
        
        Returns:
            Dict with 'matches' bool and 'reason' string
        """
        # Check platform filter
        if workflow.platforms and len(workflow.platforms) > 0:
            if interaction.platform not in workflow.platforms:
                return {"matches": False, "reason": "Platform not in filter"}
        
        # Check interaction type filter
        if workflow.interaction_types and len(workflow.interaction_types) > 0:
            if interaction.type not in workflow.interaction_types:
                return {"matches": False, "reason": "Interaction type not in filter"}
        
        # Check view scope
        if workflow.view_ids and len(workflow.view_ids) > 0:
            # Workflow is scoped to specific views
            # Check if interaction is tagged with any of those views
            if not interaction_view_ids.intersection(set(workflow.view_ids)):
                return {"matches": False, "reason": "Interaction not in workflow's view scope"}
        
        # Check AI conditions (if any) - OR logic between multiple conditions
        if workflow.ai_conditions and len(workflow.ai_conditions) > 0:
            ai_match = await self._evaluate_ai_conditions(interaction, workflow.ai_conditions)
            if not ai_match["matches"]:
                return {"matches": False, "reason": f"AI conditions not met: {ai_match.get('reason', 'unknown')}"}
        
        return {"matches": True, "reason": "All conditions met"}
    
    async def _evaluate_ai_conditions(
        self,
        interaction: Interaction,
        conditions: List[str]
    ) -> Dict[str, Any]:
        """Evaluate multiple AI conditions with OR logic.
        
        Args:
            interaction: The interaction to evaluate
            conditions: List of natural language condition strings
            
        Returns:
            Dict with 'matches' bool and 'reason' string
            Matches if ANY condition is satisfied (OR logic)
        """
        # Filter out empty conditions
        valid_conditions = [c.strip() for c in conditions if c and c.strip()]
        
        if not valid_conditions:
            return {"matches": True, "reason": "No conditions to check"}
        
        # Evaluate each condition - return True on first match (OR logic)
        for condition in valid_conditions:
            result = await self._evaluate_single_condition(interaction, condition)
            if result["matches"]:
                return {"matches": True, "reason": f"Matched: {condition}"}
        
        # None matched
        return {"matches": False, "reason": "No conditions matched"}
    
    async def _evaluate_single_condition(
        self,
        interaction: Interaction,
        condition: str
    ) -> Dict[str, Any]:
        """Use AI to evaluate if interaction matches a single natural language condition.
        
        Args:
            interaction: The interaction to evaluate
            condition: Natural language condition string
            
        Returns:
            Dict with 'matches' bool and 'reason' string
        """
        prompt = f"""Evaluate if this social media message matches the following condition.

MESSAGE DETAILS:
- Platform: {interaction.platform}
- Type: {interaction.type}
- Author: @{interaction.author_username or 'unknown'}
- Content: "{interaction.content}"

CONDITION:
{condition}

Does this message match the condition? Respond with JSON only:
{{"matches": true/false, "reason": "brief explanation"}}"""

        try:
            response = await self.anthropic_client.messages.create(
                model="claude-3-haiku-20240307",  # Fast model for classification
                max_tokens=150,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result_text = response.content[0].text.strip()
            
            # Parse JSON response
            # Handle potential markdown code blocks
            if "```" in result_text:
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()
            
            if result_text.startswith("{"):
                result = json.loads(result_text)
                matches = result.get("matches", False)
                reason = result.get("reason", "")
                
                logger.debug(f"AI condition evaluation: matches={matches}, reason={reason}")
                return {"matches": matches, "reason": reason}
            
            logger.warning(f"Unexpected AI response format: {result_text}")
            return {"matches": False, "reason": "Could not parse AI response"}
            
        except Exception as e:
            logger.error(f"Error evaluating AI condition: {e}")
            # On error, don't match (fail safe)
            return {"matches": False, "reason": f"Error: {str(e)}"}
    
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
        
        # Handle system workflow actions
        if workflow.system_workflow_type == SYSTEM_WORKFLOW_AUTO_MODERATOR:
            return await self._execute_moderate(interaction, workflow, user_id)
        
        elif workflow.system_workflow_type == SYSTEM_WORKFLOW_AUTO_ARCHIVE:
            return await self._execute_archive(interaction, workflow, user_id)
        
        # Handle regular workflow actions
        elif action_type == 'auto_respond':
            return await self._execute_auto_respond(interaction, workflow, user_id)
        
        elif action_type == 'generate_response':
            return await self._execute_generate_response(interaction, workflow, user_id)
        
        else:
            logger.warning(f"Unknown action type: {action_type}")
            return {"action": "unknown", "error": f"Unknown action type: {action_type}"}
    
    async def _execute_moderate(
        self,
        interaction: Interaction,
        workflow: Workflow,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Execute Auto Moderator action based on interaction type.
        
        Actions by interaction type:
        - DM: Block the user on the platform
        - Comment: Delete the comment
        - Mention: Block the user
        """
        action_config = workflow.action_config or {}
        interaction_type = interaction.type
        
        # Determine action based on interaction type
        if interaction_type == 'dm':
            action = action_config.get("dm_action", "block_user")
        elif interaction_type == 'comment':
            action = action_config.get("comment_action", "delete_comment")
        elif interaction_type == 'mention':
            action = action_config.get("mention_action", "block_user")
        else:
            action = "delete_comment"  # Default fallback
        
        from app.services.platform_actions import get_platform_action_service
        platform_service = get_platform_action_service()
        
        result = {"action": "moderate", "sub_action": action, "success": False}
        
        try:
            if action == "block_user":
                # Block the user on the platform
                block_result = await platform_service.block_user(
                    interaction, 
                    self.session
                )
                result["success"] = block_result.get("success", False)
                result["platform_result"] = block_result
                
                if result["success"]:
                    interaction.status = "moderated"
                    interaction.moderation_action = "blocked"
                    logger.info(f"Blocked user {interaction.author_username} for interaction {interaction.id}")
                    
            elif action == "delete_comment":
                # Delete the comment from the platform
                delete_result = await platform_service.delete_interaction(
                    interaction, 
                    self.session
                )
                result["success"] = delete_result.get("success", False)
                result["platform_result"] = delete_result
                
                if result["success"]:
                    interaction.status = "moderated"
                    interaction.moderation_action = "deleted"
                    logger.info(f"Deleted comment {interaction.id}")
            
            # Archive locally after moderation
            interaction.archived_at = datetime.utcnow()
            interaction.archive_source = "auto_moderator"
                    
        except Exception as e:
            logger.error(f"Error executing moderate action: {e}")
            result["error"] = str(e)
        
        return result
    
    async def _execute_archive(
        self,
        interaction: Interaction,
        workflow: Workflow,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Execute Auto Archive action - archives interaction locally.
        
        Does NOT delete from platform, just archives in our system.
        """
        try:
            interaction.archived_at = datetime.utcnow()
            interaction.archive_source = "auto_archive"
            interaction.status = "archived"
            
            logger.info(f"Auto-archived interaction {interaction.id}")
            
            return {
                "action": "archive",
                "success": True,
                "archived_at": interaction.archived_at.isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Error executing archive action: {e}")
            return {
                "action": "archive",
                "success": False,
                "error": str(e),
            }
    
    async def _execute_auto_respond(
        self,
        interaction: Interaction,
        workflow: Workflow,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Execute auto-respond with template text."""
        action_config = workflow.action_config or {}
        response_text = action_config.get("response_text", "")
        
        if not response_text:
            return {"action": "auto_respond", "error": "No response_text configured"}
        
        # Send the response via platform
        from app.services.platform_actions import get_platform_action_service
        platform_service = get_platform_action_service()
        
        result = await platform_service.send_reply(interaction, response_text, self.session)
        
        if result.get("success"):
            # Record the sent response
            from app.services.sent_response_service import get_sent_response_service
            sent_service = get_sent_response_service(self.session)
            
            await sent_service.record_sent_response(
                interaction_id=interaction.id,
                response_text=response_text,
                user_id=user_id,
                response_type='automated',
                workflow_id=workflow.id,
                platform_response_id=result.get("reply_id"),
                is_demo=interaction.is_demo,
            )
            
            # Update interaction status
            interaction.status = 'answered'
            interaction.responded_at = datetime.utcnow()
        
        return {
            "action": "auto_respond",
            "success": result.get("success", False),
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
        ai_instructions = action_config.get("ai_instructions")
        
        # Generate response using the response generator
        from app.services.response_generator import get_response_generator
        generator = get_response_generator(self.session)
        
        try:
            response_text = await generator.generate_response(
                interaction=interaction,
                user_id=user_id,
                tone=tone,
                ai_instructions=ai_instructions,
            )
            
            # Store as pending response
            interaction.pending_response = {
                "text": response_text,
                "generated_at": datetime.utcnow().isoformat(),
                "model": settings.CLAUDE_MODEL,
                "workflow_id": str(workflow.id),
                "tone": tone,
                "ai_instructions": ai_instructions,
            }
            interaction.status = 'awaiting_approval'
            
            return {
                "action": "generate_response",
                "success": True,
                "response_preview": response_text[:100] + "..." if len(response_text) > 100 else response_text,
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                "action": "generate_response",
                "success": False,
                "error": str(e),
            }
    
    async def _log_execution(
        self,
        workflow_id: UUID,
        interaction_id: UUID,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ):
        """Log workflow execution for audit trail."""
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            status=status,
            context={"interaction_id": str(interaction_id)},
            result=result,
            error=error,
            created_by_id=user_id,
        )
        self.session.add(execution)


def get_workflow_engine(session: AsyncSession) -> WorkflowEngineV2:
    """Factory function to get a WorkflowEngineV2 instance."""
    return WorkflowEngineV2(session)
