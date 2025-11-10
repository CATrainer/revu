"""Workflow service layer.

Encapsulates common operations for workflows: activation, pause, and execution logging.
"""
from __future__ import annotations

from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow, WorkflowExecution


class WorkflowService:
    def validate_workflow(self, name: str, trigger: Optional[dict], conditions: Optional[list[dict]], actions: Optional[list[dict]]):
        """Comprehensive workflow validation.

        Validates:
        - Name is not empty
        - Trigger configuration is valid
        - Conditions are well-formed
        - Actions have required config
        """
        # Validate name
        if not name or not name.strip():
            raise ValueError("Workflow name is required")

        # Validate trigger
        if trigger:
            self.validate_trigger(trigger)

        # Validate conditions
        if conditions:
            self.validate_conditions(conditions)

        # Validate actions
        if actions:
            self.validate_actions_config(actions)

    def validate_trigger(self, trigger: dict):
        """Validate trigger configuration."""
        trigger_type = trigger.get('type')
        if not trigger_type:
            raise ValueError("Trigger type is required")

        # Validate platforms if specified
        platforms = trigger.get('platforms', [])
        valid_platforms = {'youtube', 'instagram', 'tiktok', 'twitter'}
        if platforms:
            invalid = set(platforms) - valid_platforms
            if invalid:
                raise ValueError(f"Invalid platforms: {invalid}. Must be one of {valid_platforms}")

        # Validate interaction types if specified
        interaction_types = trigger.get('interaction_types', [])
        valid_types = {'comment', 'dm', 'mention'}
        if interaction_types:
            invalid = set(interaction_types) - valid_types
            if invalid:
                raise ValueError(f"Invalid interaction types: {invalid}. Must be one of {valid_types}")

    def validate_conditions(self, conditions: list[dict]):
        """Validate conditions configuration."""
        if not isinstance(conditions, list):
            raise ValueError("Conditions must be a list")

        for idx, condition in enumerate(conditions):
            if not isinstance(condition, dict):
                raise ValueError(f"Condition {idx} must be an object")

            # Check if it's a natural language condition
            if condition.get('type') == 'natural_language':
                prompt = condition.get('prompt', '').strip()
                if not prompt:
                    raise ValueError(f"Natural language condition {idx} requires a non-empty prompt")
                if len(prompt) < 10:
                    raise ValueError(f"Natural language condition {idx} prompt is too short (minimum 10 characters)")
            else:
                # Field-based condition
                field = condition.get('field')
                operator = condition.get('operator')
                value = condition.get('value')

                if not field:
                    raise ValueError(f"Condition {idx} requires a field")
                if not operator:
                    raise ValueError(f"Condition {idx} requires an operator")
                if value is None or value == '':
                    raise ValueError(f"Condition {idx} requires a value")

                # Validate field names
                valid_fields = {
                    'sentiment', 'priority_score', 'content', 'author_username',
                    'author_is_verified', 'like_count', 'reply_count', 'categories'
                }
                if field not in valid_fields:
                    raise ValueError(f"Condition {idx} has invalid field '{field}'. Must be one of {valid_fields}")

                # Validate operators
                valid_operators = {
                    'is', 'is_not', 'contains', 'not_contains', 'equals', 'not_equals',
                    'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal',
                    'gt', 'lt', 'gte', 'lte'
                }
                if operator not in valid_operators:
                    raise ValueError(f"Condition {idx} has invalid operator '{operator}'")

    def validate_actions_config(self, actions: Optional[list[dict]]):
        """Validate minimal structure for actions.

        - auto_respond: requires response text
        - generate_response: optional config
        - flag_for_review: requires priority_level
        - add_tag: requires tag
        - route_to_view: requires view_id
        - update_status: requires status
        """
        if not actions:
            raise ValueError("At least one action is required")

        for idx, a in enumerate(actions):
            if not isinstance(a, dict) or 'type' not in a:
                raise ValueError(f"Action {idx} must be an object with a 'type'")

            atype = a.get('type')
            cfg = a.get('config') or {}

            # Validate each action type
            if atype == 'auto_respond':
                response = (cfg.get('response') or '').strip()
                if not response:
                    raise ValueError(f"Action {idx} (auto_respond) requires non-empty config.response")

            elif atype == 'generate_response':
                # Optional validation for tone, etc.
                pass

            elif atype == 'flag_for_review':
                priority_level = cfg.get('priority_level')
                if priority_level and priority_level not in {'low', 'medium', 'high'}:
                    raise ValueError(f"Action {idx} (flag_for_review) priority_level must be low, medium, or high")

            elif atype == 'add_tag':
                tag = (cfg.get('tag') or '').strip()
                if not tag:
                    raise ValueError(f"Action {idx} (add_tag) requires non-empty config.tag")

            elif atype == 'route_to_view':
                view_id = cfg.get('view_id')
                if not view_id:
                    raise ValueError(f"Action {idx} (route_to_view) requires config.view_id")

            elif atype == 'update_status':
                status = cfg.get('status')
                if not status:
                    raise ValueError(f"Action {idx} (update_status) requires config.status")
                valid_statuses = {'unread', 'read', 'answered', 'archived', 'flagged', 'awaiting_approval'}
                if status not in valid_statuses:
                    raise ValueError(f"Action {idx} (update_status) has invalid status '{status}'")

            elif atype in {'notify', 'template_reply'}:
                # Legacy actions - keep existing validation
                if atype == 'notify':
                    ch = (cfg.get('channel') or '').lower()
                    if ch not in {'email', 'slack'}:
                        raise ValueError(f"Action {idx} (notify) requires config.channel in ['email','slack']")
                    tgt = (cfg.get('target') or '').strip()
                    if not tgt:
                        raise ValueError(f"Action {idx} (notify) requires non-empty config.target")
                elif atype == 'template_reply':
                    tpl = (cfg.get('template') or '').strip()
                    if not tpl:
                        raise ValueError(f"Action {idx} (template_reply) requires non-empty config.template")
            else:
                # Unknown action type - warn but don't fail
                pass
    async def activate(self, session: AsyncSession, workflow_id: UUID) -> Workflow:
        obj = await session.get(Workflow, workflow_id)
        if not obj:
            raise ValueError("Workflow not found")
        obj.status = "active"
        await session.flush()
        await session.refresh(obj)
        return obj

    async def pause(self, session: AsyncSession, workflow_id: UUID) -> Workflow:
        obj = await session.get(Workflow, workflow_id)
        if not obj:
            raise ValueError("Workflow not found")
        obj.status = "paused"
        await session.flush()
        await session.refresh(obj)
        return obj

    async def log_execution(
        self,
        session: AsyncSession,
        workflow_id: UUID,
        status: str = "completed",
        context: Optional[Dict[str, Any]] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ) -> WorkflowExecution:
        exec_obj = WorkflowExecution(
            workflow_id=workflow_id,
            status=status,
            context=context,
            result=result,
            error=error,
        )
        session.add(exec_obj)
        await session.flush()
        await session.refresh(exec_obj)
        return exec_obj
