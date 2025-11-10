"""Workflow execution engine for interaction workflows.

This service evaluates workflows against interactions and executes configured actions.
Supports both rigid field-based conditions and natural language AI conditions.
"""
from __future__ import annotations

import re
import json
import time
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.workflow import Workflow, WorkflowExecution, WorkflowApproval
from app.models.interaction import Interaction
from app.services.claude_service import ClaudeService
from app.services.workflow_service import WorkflowService


class WorkflowEngine:
    """
    Evaluates and executes workflows against interactions.

    Features:
    - Rigid field-based conditions (sentiment, priority_score, content, etc.)
    - Natural language AI conditions (e.g., "interactions asking about pricing")
    - Multiple action types (auto_respond, generate_response, flag_for_review, add_tag)
    - Execution logging and audit trail
    - Caching for AI evaluations to reduce API calls
    """

    def __init__(self, *, ai_cache_ttl_seconds: float = 600.0):
        """Initialize workflow engine.

        Args:
            ai_cache_ttl_seconds: TTL for AI condition evaluation cache (default: 10 minutes)
        """
        self._claude = ClaudeService()
        self._workflow_service = WorkflowService()
        self._ai_cache_ttl = ai_cache_ttl_seconds
        self._ai_cache: Dict[str, Tuple[float, Tuple[bool, float]]] = {}
        self._metrics = {
            "ai_eval_hits": 0,
            "ai_eval_misses": 0,
            "workflows_evaluated": 0,
            "workflows_matched": 0,
            "actions_executed": 0,
        }

    # ---------- Main Entry Point ----------

    async def process_interaction(
        self,
        db: AsyncSession,
        interaction: Interaction,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """Process an interaction through all applicable workflows.

        Args:
            db: Database session
            interaction: The interaction to process
            user_id: ID of the user who owns the interaction
            organization_id: Optional organization ID for scoping

        Returns:
            List of execution results with workflow_id, action, and status
        """
        # Fetch active workflows for this user/org
        workflows = await self._fetch_active_workflows(
            db, user_id, organization_id, interaction.view_id
        )

        results = []
        for workflow in workflows:
            try:
                self._metrics["workflows_evaluated"] += 1

                # Check if workflow applies to this interaction
                if not await self._check_trigger(workflow, interaction):
                    continue

                # Evaluate conditions
                matches, confidence = await self._evaluate_conditions(
                    db, workflow, interaction, user_id
                )

                if not matches:
                    await self._log_execution(
                        db, workflow.id, interaction.id, "skipped",
                        context={"reason": "conditions_not_met", "confidence": confidence},
                        organization_id=organization_id, user_id=user_id
                    )
                    continue

                self._metrics["workflows_matched"] += 1

                # Execute actions
                action_results = await self._execute_actions(
                    db, workflow, interaction, user_id, organization_id
                )

                # Log successful execution
                await self._log_execution(
                    db, workflow.id, interaction.id, "completed",
                    result={"actions": action_results, "confidence": confidence},
                    context={"interaction_id": str(interaction.id)},
                    organization_id=organization_id, user_id=user_id
                )

                results.append({
                    "workflow_id": str(workflow.id),
                    "workflow_name": workflow.name,
                    "actions": action_results,
                    "confidence": confidence,
                })

            except Exception as e:
                # Log failed execution
                await self._log_execution(
                    db, workflow.id, interaction.id, "failed",
                    error=str(e),
                    context={"interaction_id": str(interaction.id)},
                    organization_id=organization_id, user_id=user_id
                )
                results.append({
                    "workflow_id": str(workflow.id),
                    "workflow_name": workflow.name,
                    "error": str(e),
                })

        await db.commit()
        return results

    # ---------- Trigger Evaluation ----------

    async def _check_trigger(
        self,
        workflow: Workflow,
        interaction: Interaction
    ) -> bool:
        """Check if workflow trigger matches the interaction.

        Args:
            workflow: The workflow to check
            interaction: The interaction to evaluate

        Returns:
            True if trigger matches, False otherwise
        """
        if not workflow.trigger:
            return True  # No trigger means match all

        trigger = workflow.trigger

        # Check platform filter
        if trigger.get("platforms"):
            if interaction.platform not in trigger["platforms"]:
                return False

        # Check interaction type filter
        if trigger.get("interaction_types"):
            if interaction.type not in trigger["interaction_types"]:
                return False

        # Check trigger type (for future expansion)
        trigger_type = trigger.get("type", "new_interaction")
        if trigger_type == "new_interaction":
            # Always match for new interactions (this is the default)
            return True

        return True

    # ---------- Condition Evaluation ----------

    async def _evaluate_conditions(
        self,
        db: AsyncSession,
        workflow: Workflow,
        interaction: Interaction,
        user_id: UUID,
    ) -> Tuple[bool, float]:
        """Evaluate all conditions for a workflow.

        Supports both rigid field-based conditions and natural language AI conditions.

        Args:
            db: Database session
            workflow: The workflow with conditions
            interaction: The interaction to evaluate
            user_id: ID of the user (for context)

        Returns:
            Tuple of (matches: bool, confidence: float)
        """
        if not workflow.conditions:
            return True, 1.0  # No conditions means always match

        conditions = workflow.conditions
        all_match = True
        confidences = []

        for condition in conditions:
            # Check if this is a natural language condition
            if condition.get("type") == "natural_language":
                matches, conf = await self._evaluate_nl_condition(
                    db, condition, interaction, user_id
                )
                confidences.append(conf)
                if not matches:
                    all_match = False
            else:
                # Rigid field-based condition
                matches, conf = self._evaluate_field_condition(condition, interaction)
                confidences.append(conf)
                if not matches:
                    all_match = False

        # Calculate average confidence
        avg_confidence = sum(confidences) / len(confidences) if confidences else 1.0

        return all_match, round(avg_confidence, 3)

    def _evaluate_field_condition(
        self,
        condition: Dict[str, Any],
        interaction: Interaction
    ) -> Tuple[bool, float]:
        """Evaluate a rigid field-based condition.

        Args:
            condition: Condition dict with field, operator, value
            interaction: The interaction to evaluate

        Returns:
            Tuple of (matches: bool, confidence: float)
        """
        field = condition.get("field")
        operator = condition.get("operator") or condition.get("op")
        value = condition.get("value")

        # Get field value from interaction
        if field == "sentiment":
            field_value = interaction.sentiment
        elif field == "priority_score":
            field_value = interaction.priority_score or 0
        elif field == "content":
            field_value = interaction.content
        elif field == "author_username":
            field_value = interaction.author_username
        elif field == "author_is_verified":
            field_value = interaction.author_is_verified
        elif field == "like_count":
            field_value = interaction.like_count or 0
        elif field == "reply_count":
            field_value = interaction.reply_count or 0
        elif field == "categories":
            field_value = ",".join(interaction.categories) if interaction.categories else ""
        else:
            return False, 0.3  # Unknown field

        # Evaluate operator
        try:
            if operator in ["equals", "is"]:
                matches = field_value == value
            elif operator in ["not_equals", "is_not"]:
                matches = field_value != value
            elif operator == "contains":
                matches = value.lower() in str(field_value).lower()
            elif operator == "not_contains":
                matches = value.lower() not in str(field_value).lower()
            elif operator in ["greater_than", "gt"]:
                matches = float(field_value) > float(value)
            elif operator in ["less_than", "lt"]:
                matches = float(field_value) < float(value)
            elif operator in ["greater_or_equal", "gte"]:
                matches = float(field_value) >= float(value)
            elif operator in ["less_or_equal", "lte"]:
                matches = float(field_value) <= float(value)
            else:
                return False, 0.3  # Unknown operator

            return matches, 0.95 if matches else 0.05

        except (ValueError, TypeError, AttributeError):
            return False, 0.2

    async def _evaluate_nl_condition(
        self,
        db: AsyncSession,
        condition: Dict[str, Any],
        interaction: Interaction,
        user_id: UUID,
    ) -> Tuple[bool, float]:
        """Evaluate a natural language AI condition.

        Uses Claude to determine if the interaction matches the natural language criteria.
        Results are cached to reduce API calls.

        Args:
            db: Database session
            condition: Condition dict with 'prompt' containing the natural language criteria
            interaction: The interaction to evaluate
            user_id: ID of the user (for context)

        Returns:
            Tuple of (matches: bool, confidence: float)
        """
        prompt = condition.get("prompt", "")
        if not prompt:
            return True, 0.5

        # Check cache first
        cache_key = self._build_cache_key(interaction.content, prompt, str(user_id))
        now = time.time()

        cached = self._ai_cache.get(cache_key)
        if cached and cached[0] > now:
            self._metrics["ai_eval_hits"] += 1
            return cached[1]

        self._metrics["ai_eval_misses"] += 1

        # Build evaluation prompt
        eval_prompt = f"""You are a classifier evaluating whether an interaction matches specific criteria.

Criteria: {prompt}

Interaction Details:
- Platform: {interaction.platform}
- Type: {interaction.type}
- Author: {interaction.author_username or 'Unknown'}
- Content: {interaction.content}
- Sentiment: {interaction.sentiment or 'Unknown'}
- Priority Score: {interaction.priority_score or 'N/A'}

Respond ONLY with valid JSON in this exact format:
{{"match": true/false, "confidence": 0.0-1.0}}

The 'match' field indicates whether the interaction matches the criteria.
The 'confidence' field indicates your confidence level (0.0 = no confidence, 1.0 = absolute confidence).
"""

        # Call Claude API
        try:
            response_text = await self._claude.generate_response(
                db=db,
                channel_id=str(user_id),  # Use user_id as context
                comment_text=eval_prompt,
                channel_name="Workflow Evaluation",
                video_title="Condition Matching",
                from_cache=False,
            )

            # Parse response
            matches, confidence = self._parse_ai_response(response_text)
            result = (matches, confidence)

            # Cache the result
            self._ai_cache[cache_key] = (now + self._ai_cache_ttl, result)

            return result

        except Exception as e:
            # On error, return conservative result
            return False, 0.4

    def _parse_ai_response(self, response_text: str) -> Tuple[bool, float]:
        """Parse AI response for match and confidence.

        Args:
            response_text: Raw response from Claude

        Returns:
            Tuple of (matches: bool, confidence: float)
        """
        try:
            # Try to find JSON in response
            json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                matches = bool(data.get("match", False))
                confidence = float(data.get("confidence", 0.5))
                confidence = max(0.0, min(1.0, confidence))  # Clamp to [0, 1]
                return matches, confidence
            else:
                # Fallback: keyword scan
                lower = response_text.lower()
                matches = "true" in lower or '"match": true' in lower or '"match":true' in lower
                confidence = 0.6 if matches else 0.4
                return matches, confidence
        except Exception:
            # Fallback on parsing error
            lower = response_text.lower()
            matches = "true" in lower
            return matches, 0.5

    def _build_cache_key(self, content: str, prompt: str, user_id: str) -> str:
        """Build cache key for AI evaluations.

        Args:
            content: Interaction content
            prompt: Natural language condition prompt
            user_id: User ID for scoping

        Returns:
            Cache key string
        """
        # Normalize content (similar to rule_evaluator.py)
        normalized = self._normalize_text(content)
        tokens = normalized.split()[:12]  # First 12 tokens
        sig = " ".join(tokens)
        return f"wf_ai:{user_id}:{hash((sig, prompt[:120]))}"

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalize text for cache key generation."""
        t = text.lower()
        # Remove URLs, mentions, digits
        t = re.sub(r"https?://\S+|www\.\S+", " ", t)
        t = re.sub(r"[@#]\w+", " ", t)
        t = re.sub(r"\d+", " ", t)
        # Remove punctuation and collapse whitespace
        t = re.sub(r"[^a-z\s]", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    # ---------- Action Execution ----------

    async def _execute_actions(
        self,
        db: AsyncSession,
        workflow: Workflow,
        interaction: Interaction,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """Execute all actions configured for a workflow.

        Args:
            db: Database session
            workflow: The workflow with actions
            interaction: The interaction to act on
            user_id: ID of the user
            organization_id: Optional organization ID

        Returns:
            List of action execution results
        """
        if not workflow.actions:
            return []

        results = []
        for action in workflow.actions:
            try:
                action_type = action.get("type")
                config = action.get("config", {})

                if action_type == "auto_respond":
                    result = await self._action_auto_respond(
                        db, interaction, config, user_id, organization_id
                    )
                elif action_type == "generate_response":
                    result = await self._action_generate_response(
                        db, workflow, interaction, config, user_id, organization_id
                    )
                elif action_type == "flag_for_review":
                    result = await self._action_flag_for_review(
                        db, interaction, config
                    )
                elif action_type == "add_tag":
                    result = await self._action_add_tag(
                        db, interaction, config
                    )
                elif action_type == "route_to_view":
                    result = await self._action_route_to_view(
                        db, interaction, config
                    )
                elif action_type == "update_status":
                    result = await self._action_update_status(
                        db, interaction, config
                    )
                else:
                    result = {"type": action_type, "status": "unsupported"}

                self._metrics["actions_executed"] += 1
                results.append(result)

            except Exception as e:
                results.append({
                    "type": action.get("type"),
                    "status": "failed",
                    "error": str(e)
                })

        return results

    async def _action_auto_respond(
        self,
        db: AsyncSession,
        interaction: Interaction,
        config: Dict[str, Any],
        user_id: UUID,
        organization_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Execute auto-respond action - send response immediately."""
        response_text = config.get("response", "")
        if not response_text:
            return {"type": "auto_respond", "status": "failed", "error": "No response text"}

        # Update interaction with pending response
        interaction.pending_response = {
            "text": response_text,
            "workflow_id": None,  # Will be set by caller
            "generated_at": datetime.utcnow().isoformat(),
            "auto_send": True,
        }
        interaction.status = "awaiting_approval"

        await db.flush()

        return {
            "type": "auto_respond",
            "status": "success",
            "response": response_text
        }

    async def _action_generate_response(
        self,
        db: AsyncSession,
        workflow: Workflow,
        interaction: Interaction,
        config: Dict[str, Any],
        user_id: UUID,
        organization_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Execute generate-response action - AI generates response for approval."""
        try:
            # Generate response using Claude
            response_text = await self._claude.generate_response(
                db=db,
                channel_id=str(user_id),
                comment_text=interaction.content,
                channel_name=interaction.author_username or "User",
                video_title=f"{interaction.platform} {interaction.type}",
                from_cache=False,
            )

            # Create approval entry
            approval = WorkflowApproval(
                workflow_id=workflow.id,
                platform=interaction.platform,
                interaction_type=interaction.type,
                author=interaction.author_username,
                link_url=interaction.link_url,
                user_message=interaction.content,
                proposed_response=response_text,
                status="pending",
                organization_id=organization_id,
                created_by_id=user_id,
            )
            db.add(approval)

            # Also add to interaction pending_response
            interaction.pending_response = {
                "text": response_text,
                "workflow_id": str(workflow.id),
                "generated_at": datetime.utcnow().isoformat(),
                "model": "claude",
            }
            interaction.status = "awaiting_approval"

            await db.flush()

            return {
                "type": "generate_response",
                "status": "success",
                "approval_id": str(approval.id),
                "response_preview": response_text[:100] + "..." if len(response_text) > 100 else response_text
            }

        except Exception as e:
            return {
                "type": "generate_response",
                "status": "failed",
                "error": str(e)
            }

    async def _action_flag_for_review(
        self,
        db: AsyncSession,
        interaction: Interaction,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute flag-for-review action."""
        priority_level = config.get("priority_level", "medium")

        # Update interaction status and priority
        interaction.status = "flagged"

        # Map priority level to score (if not already set higher)
        priority_scores = {"low": 30, "medium": 60, "high": 90}
        new_priority = priority_scores.get(priority_level, 60)
        if not interaction.priority_score or interaction.priority_score < new_priority:
            interaction.priority_score = new_priority

        await db.flush()

        return {
            "type": "flag_for_review",
            "status": "success",
            "priority_level": priority_level
        }

    async def _action_add_tag(
        self,
        db: AsyncSession,
        interaction: Interaction,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute add-tag action."""
        tag = config.get("tag", "")
        if not tag:
            return {"type": "add_tag", "status": "failed", "error": "No tag specified"}

        # Add tag to interaction
        current_tags = interaction.tags or []
        if tag not in current_tags:
            current_tags.append(tag)
            interaction.tags = current_tags
            await db.flush()

        return {
            "type": "add_tag",
            "status": "success",
            "tag": tag
        }

    async def _action_route_to_view(
        self,
        db: AsyncSession,
        interaction: Interaction,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute route-to-view action."""
        view_id = config.get("view_id")
        if not view_id:
            return {"type": "route_to_view", "status": "failed", "error": "No view_id specified"}

        try:
            interaction.view_id = UUID(view_id)
            await db.flush()

            return {
                "type": "route_to_view",
                "status": "success",
                "view_id": view_id
            }
        except Exception as e:
            return {
                "type": "route_to_view",
                "status": "failed",
                "error": str(e)
            }

    async def _action_update_status(
        self,
        db: AsyncSession,
        interaction: Interaction,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute update-status action."""
        new_status = config.get("status")
        if not new_status:
            return {"type": "update_status", "status": "failed", "error": "No status specified"}

        interaction.status = new_status
        await db.flush()

        return {
            "type": "update_status",
            "status": "success",
            "new_status": new_status
        }

    # ---------- Helper Methods ----------

    async def _fetch_active_workflows(
        self,
        db: AsyncSession,
        user_id: UUID,
        organization_id: Optional[UUID],
        view_id: Optional[UUID],
    ) -> List[Workflow]:
        """Fetch all active workflows for a user/org/view.

        Args:
            db: Database session
            user_id: User ID
            organization_id: Optional organization ID
            view_id: Optional view ID to filter workflows

        Returns:
            List of active workflows
        """
        # Build query
        query = select(Workflow).where(
            Workflow.status == "active",
            Workflow.created_by_id == user_id,
        )

        # Add org filter if provided
        if organization_id:
            query = query.where(
                or_(
                    Workflow.organization_id == organization_id,
                    Workflow.organization_id.is_(None)
                )
            )

        # Filter by view: either global workflows or view-specific
        if view_id:
            query = query.where(
                or_(
                    Workflow.is_global == True,
                    Workflow.view_id == view_id,
                )
            )
        else:
            # No view specified, only global workflows
            query = query.where(Workflow.is_global == True)

        # Order by priority (if we add it later), for now by created_at
        query = query.order_by(Workflow.created_at.desc())

        result = await db.execute(query)
        return list(result.scalars().all())

    async def _log_execution(
        self,
        db: AsyncSession,
        workflow_id: UUID,
        interaction_id: UUID,
        status: str,
        context: Optional[Dict[str, Any]] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        organization_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
    ) -> WorkflowExecution:
        """Log workflow execution for audit trail.

        Args:
            db: Database session
            workflow_id: ID of the workflow
            interaction_id: ID of the interaction
            status: Execution status (completed/failed/skipped)
            context: Optional execution context
            result: Optional execution result
            error: Optional error message
            organization_id: Optional organization ID
            user_id: Optional user ID

        Returns:
            Created WorkflowExecution record
        """
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            status=status,
            context=context or {"interaction_id": str(interaction_id)},
            result=result,
            error=error,
            organization_id=organization_id,
            created_by_id=user_id,
        )
        db.add(execution)
        await db.flush()
        return execution

    def get_metrics(self) -> Dict[str, Any]:
        """Get execution metrics for monitoring."""
        return {
            "ai_evaluations": {
                "hits": self._metrics["ai_eval_hits"],
                "misses": self._metrics["ai_eval_misses"],
                "hit_rate": (
                    self._metrics["ai_eval_hits"] /
                    (self._metrics["ai_eval_hits"] + self._metrics["ai_eval_misses"])
                    if self._metrics["ai_eval_hits"] + self._metrics["ai_eval_misses"] > 0
                    else 0.0
                ),
            },
            "workflows": {
                "evaluated": self._metrics["workflows_evaluated"],
                "matched": self._metrics["workflows_matched"],
                "match_rate": (
                    self._metrics["workflows_matched"] / self._metrics["workflows_evaluated"]
                    if self._metrics["workflows_evaluated"] > 0
                    else 0.0
                ),
            },
            "actions_executed": self._metrics["actions_executed"],
        }

    # ---------- Testing & Preview ----------

    async def test_workflow(
        self,
        db: AsyncSession,
        workflow: Workflow,
        test_interactions: List[Interaction],
        user_id: UUID,
    ) -> List[Dict[str, Any]]:
        """Test a workflow against sample interactions without executing actions.

        Args:
            db: Database session
            workflow: The workflow to test
            test_interactions: List of interactions to test against
            user_id: User ID for context

        Returns:
            List of test results
        """
        results = []
        for interaction in test_interactions:
            # Check trigger
            trigger_match = await self._check_trigger(workflow, interaction)

            # Evaluate conditions
            conditions_match, confidence = await self._evaluate_conditions(
                db, workflow, interaction, user_id
            )

            # Determine what actions would run
            would_execute = trigger_match and conditions_match

            results.append({
                "interaction_id": str(interaction.id),
                "interaction_content": interaction.content[:100],
                "trigger_match": trigger_match,
                "conditions_match": conditions_match,
                "confidence": confidence,
                "would_execute": would_execute,
                "actions": workflow.actions if would_execute else [],
            })

        return results


# Import fix
from sqlalchemy import or_
