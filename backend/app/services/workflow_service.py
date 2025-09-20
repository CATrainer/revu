"""Workflow service layer.

Encapsulates common operations for workflows: activation, pause, and execution logging.
"""
from __future__ import annotations

from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow, WorkflowExecution


class WorkflowService:
    def validate_actions_config(self, actions: Optional[list[dict]]):
        """Validate minimal structure for actions.

        - notify: requires channel in {email, slack} and non-empty target
        - template_reply: requires non-empty template
        Other types (tag, assign) remain flexible for now.
        """
        if not actions:
            return
        for idx, a in enumerate(actions):
            if not isinstance(a, dict) or 'type' not in a:
                raise ValueError(f"actions[{idx}] must be an object with a 'type'")
            atype = a.get('type')
            cfg = a.get('config') or {}
            if atype == 'notify':
                ch = (cfg.get('channel') or '').lower()
                if ch not in {'email', 'slack'}:
                    raise ValueError("notify action requires config.channel in ['email','slack']")
                tgt = (cfg.get('target') or '').strip()
                if not tgt:
                    raise ValueError("notify action requires non-empty config.target")
            elif atype == 'template_reply':
                tpl = (cfg.get('template') or '').strip()
                if not tpl:
                    raise ValueError("template_reply action requires non-empty config.template")
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
