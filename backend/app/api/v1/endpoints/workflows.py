"""Endpoints for Workflows V2.

Workflow System V2:
- Only ONE workflow runs per interaction (highest priority wins)
- Workflows only apply to new incoming messages
- Two actions only: auto_respond, generate_response
- Natural language conditions evaluated by LLM
- View scope: multi-select views or "all"
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_async_session
from app.models.workflow import Workflow, WorkflowApproval, WorkflowExecution
from app.models.user import User
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowOut,
    WorkflowUpdate,
    WorkflowReorder,
    WorkflowListOut,
    ApprovalCreate,
    ApprovalOut,
    ApprovalUpdate,
    WorkflowExecutionCreate,
    WorkflowExecutionOut,
    SystemWorkflowUpdate,
)
from app.core.security import get_current_active_user
from app.models.workflow import (
    SYSTEM_WORKFLOW_AUTO_MODERATOR,
    SYSTEM_WORKFLOW_AUTO_ARCHIVE,
    MIN_USER_WORKFLOW_PRIORITY,
)
from app.services.system_workflows import (
    ensure_system_workflows_exist,
    is_system_workflow,
    validate_system_workflow_update,
    get_system_workflow_info,
    SYSTEM_WORKFLOWS,
)

router = APIRouter()


# ------------------------------ Workflows ------------------------------------

@router.post("", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    payload: WorkflowCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new workflow.
    
    New workflows are added at the lowest priority (highest number).
    User workflows start at priority 3+ (1 and 2 are reserved for system workflows).
    """
    # Validate action config
    if payload.action_type == 'auto_respond':
        if not payload.action_config or not payload.action_config.get('response_text'):
            raise HTTPException(
                status_code=400, 
                detail="auto_respond action requires response_text in action_config"
            )
    
    # Get the next priority number (lowest priority = highest number)
    # User workflows start at MIN_USER_WORKFLOW_PRIORITY (3)
    result = await session.execute(
        select(func.coalesce(func.max(Workflow.priority), MIN_USER_WORKFLOW_PRIORITY - 1))
        .where(Workflow.user_id == current_user.id)
    )
    max_priority = result.scalar() or (MIN_USER_WORKFLOW_PRIORITY - 1)
    new_priority = max(max_priority + 1, MIN_USER_WORKFLOW_PRIORITY)
    
    obj = Workflow(
        name=payload.name,
        status=payload.status,
        priority=new_priority,
        platforms=payload.platforms,
        interaction_types=payload.interaction_types,
        view_ids=payload.view_ids,
        ai_conditions=payload.ai_conditions,
        action_type=payload.action_type,
        action_config=payload.action_config,
        user_id=current_user.id,
        organization_id=getattr(current_user, "organization_id", None),
        system_workflow_type=None,  # Regular workflow
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.get("", response_model=List[WorkflowOut])
async def list_workflows(
    status_filter: Optional[str] = None,
    include_system: bool = True,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List all workflows for the current user, ordered by priority.
    
    System workflows (Auto Moderator, Auto Archive) are automatically created
    if they don't exist.
    """
    # Ensure system workflows exist
    await ensure_system_workflows_exist(
        session, 
        current_user.id, 
        getattr(current_user, "organization_id", None)
    )
    await session.commit()
    
    stmt = select(Workflow).where(Workflow.user_id == current_user.id)
    
    if status_filter:
        stmt = stmt.where(Workflow.status == status_filter)
    
    if not include_system:
        stmt = stmt.where(Workflow.system_workflow_type.is_(None))
    
    # Order by priority (lower = higher priority)
    stmt = stmt.order_by(Workflow.priority.asc())
    
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific workflow."""
    obj = await session.get(Workflow, workflow_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return obj


@router.patch("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: UUID,
    payload: WorkflowUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update a workflow.
    
    For system workflows, only ai_conditions and status can be updated.
    """
    obj = await session.get(Workflow, workflow_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Check if this is a system workflow with restricted updates
    if is_system_workflow(obj):
        update_dict = payload.model_dump(exclude_unset=True)
        is_valid, error_msg = validate_system_workflow_update(obj, update_dict)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Only update allowed fields for system workflows
        if payload.ai_conditions is not None:
            obj.ai_conditions = payload.ai_conditions
        if payload.status is not None:
            obj.status = payload.status
    else:
        # Regular workflow - update all fields
        if payload.name is not None:
            obj.name = payload.name
        if payload.status is not None:
            obj.status = payload.status
        if payload.platforms is not None:
            obj.platforms = payload.platforms
        if payload.interaction_types is not None:
            obj.interaction_types = payload.interaction_types
        if payload.view_ids is not None:
            obj.view_ids = payload.view_ids
        if payload.ai_conditions is not None:
            obj.ai_conditions = payload.ai_conditions
        if payload.action_type is not None:
            obj.action_type = payload.action_type
        if payload.action_config is not None:
            obj.action_config = payload.action_config
        if payload.priority is not None:
            # Ensure user workflows can't take system workflow priorities
            if payload.priority < MIN_USER_WORKFLOW_PRIORITY:
                raise HTTPException(
                    status_code=400,
                    detail=f"User workflows must have priority >= {MIN_USER_WORKFLOW_PRIORITY}"
                )
            obj.priority = payload.priority
        
        # Validate action config if action_type is auto_respond
        if obj.action_type == 'auto_respond':
            if not obj.action_config or not obj.action_config.get('response_text'):
                raise HTTPException(
                    status_code=400, 
                    detail="auto_respond action requires response_text in action_config"
                )
    
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a workflow.
    
    System workflows cannot be deleted.
    """
    obj = await session.get(Workflow, workflow_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if is_system_workflow(obj):
        raise HTTPException(
            status_code=400,
            detail="System workflows cannot be deleted. You can pause them instead."
        )
    
    await session.delete(obj)
    await session.commit()
    return None


# ------------------------- Priority Reordering ----------------------------

@router.post("/reorder", response_model=List[WorkflowOut])
async def reorder_workflows(
    payload: WorkflowReorder,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Reorder workflows by priority.
    
    System workflows (Auto Moderator, Auto Archive) have fixed priorities (1, 2)
    and cannot be reordered. Only user workflows can be reordered.
    
    User workflows start at priority 3.
    """
    # Verify all workflows belong to user and filter out system workflows
    user_workflows = []
    for workflow_id in payload.workflow_ids:
        obj = await session.get(Workflow, workflow_id)
        if not obj or obj.user_id != current_user.id:
            raise HTTPException(
                status_code=404, 
                detail=f"Workflow {workflow_id} not found"
            )
        if is_system_workflow(obj):
            # Skip system workflows - they keep their fixed priority
            continue
        user_workflows.append(obj)
    
    # Reorder user workflows starting at MIN_USER_WORKFLOW_PRIORITY
    for idx, obj in enumerate(user_workflows):
        obj.priority = MIN_USER_WORKFLOW_PRIORITY + idx
    
    await session.commit()
    
    # Return updated list (including system workflows)
    result = await session.execute(
        select(Workflow)
        .where(Workflow.user_id == current_user.id)
        .order_by(Workflow.priority.asc())
    )
    return list(result.scalars().all())


# ------------------------- Workflow state actions ----------------------------

@router.post("/{workflow_id}/activate", response_model=WorkflowOut)
async def activate_workflow(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Activate a paused workflow."""
    obj = await session.get(Workflow, workflow_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    obj.status = "active"
    await session.commit()
    await session.refresh(obj)
    return obj


@router.post("/{workflow_id}/pause", response_model=WorkflowOut)
async def pause_workflow(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Pause an active workflow."""
    obj = await session.get(Workflow, workflow_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    obj.status = "paused"
    await session.commit()
    await session.refresh(obj)
    return obj


# ----------------------------- Approvals -------------------------------------
@router.post("/approvals", response_model=ApprovalOut, status_code=status.HTTP_201_CREATED)
async def create_approval(
    payload: ApprovalCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = WorkflowApproval(
        workflow_id=payload.workflow_id,
        platform=payload.platform,
        interaction_type=payload.interaction_type,
        author=payload.author,
        link_url=payload.link_url,
        user_message=payload.user_message,
        proposed_response=payload.proposed_response,
        edited_response=payload.edited_response,
        status=payload.status,
        rejected_reason=payload.rejected_reason,
        organization_id=current_user.organization_id if hasattr(current_user, "organization_id") else None,
        created_by_id=current_user.id,
    )
    session.add(obj)
    await session.flush()
    await session.refresh(obj)
    return obj


@router.get("/approvals", response_model=List[ApprovalOut])
async def list_approvals(
    status_eq: Optional[str] = "pending",
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(WorkflowApproval).where(
        (WorkflowApproval.organization_id == current_user.organization_id)
        if getattr(current_user, "organization_id", None) is not None
        else True
    )
    if status_eq:
        stmt = stmt.where(WorkflowApproval.status == status_eq)
    res = await session.execute(stmt.order_by(WorkflowApproval.created_at.desc()))
    return list(res.scalars().all())


@router.get("/approvals/{approval_id}", response_model=ApprovalOut)
async def get_approval(
    approval_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(WorkflowApproval, approval_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Approval not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Approval not found")
    return obj


@router.patch("/approvals/{approval_id}", response_model=ApprovalOut)
async def update_approval(
    approval_id: UUID,
    payload: ApprovalUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(WorkflowApproval, approval_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Approval not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Approval not found")
    if payload.edited_response is not None:
        obj.edited_response = payload.edited_response
    if payload.status is not None:
        obj.status = payload.status
    if payload.rejected_reason is not None:
        obj.rejected_reason = payload.rejected_reason
    await session.flush()
    await session.refresh(obj)
    return obj


@router.post("/approvals/{approval_id}/send", response_model=ApprovalOut)
async def send_approval(
    approval_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(WorkflowApproval, approval_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Approval not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Approval not found")
    obj.status = "sent"
    await session.flush()
    await session.refresh(obj)
    return obj


@router.post("/approvals/{approval_id}/reject", response_model=ApprovalOut)
async def reject_approval(
    approval_id: UUID,
    reason: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(WorkflowApproval, approval_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Approval not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Approval not found")
    obj.status = "rejected"
    obj.rejected_reason = reason
    await session.flush()
    await session.refresh(obj)
    return obj


# ----------------------------- Executions ------------------------------------
@router.post(
    "/{workflow_id}/executions",
    response_model=WorkflowExecutionOut,
    status_code=status.HTTP_201_CREATED,
)
async def log_execution(
    workflow_id: UUID,
    payload: WorkflowExecutionCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(Workflow, workflow_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Workflow not found")
    exec_obj = WorkflowExecution(
        workflow_id=workflow_id,
        status=payload.status,
        context=payload.context,
        result=payload.result,
        error=payload.error,
        organization_id=current_user.organization_id if hasattr(current_user, "organization_id") else None,
        created_by_id=current_user.id,
    )
    session.add(exec_obj)
    await session.flush()
    await session.refresh(exec_obj)
    return exec_obj


@router.get(
    "/{workflow_id}/executions",
    response_model=List[WorkflowExecutionOut],
)
async def list_executions(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(WorkflowExecution).where(WorkflowExecution.workflow_id == workflow_id)
    if getattr(current_user, "organization_id", None) is not None:
        stmt = stmt.where(WorkflowExecution.organization_id == current_user.organization_id)
    stmt = stmt.order_by(WorkflowExecution.created_at.desc())
    res = await session.execute(stmt)
    return list(res.scalars().all())


# ----------------------------- Testing & Analytics ---------------------------
@router.post("/{workflow_id}/test")
async def test_workflow(
    workflow_id: UUID,
    limit: int = 10,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Test a workflow against recent interactions without executing actions."""
    from app.services.workflow_engine import WorkflowEngine
    from app.models.interaction import Interaction

    workflow = await session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if getattr(current_user, "organization_id", None) is not None and workflow.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Fetch recent interactions for testing
    stmt = select(Interaction).where(
        Interaction.user_id == current_user.id
    ).order_by(Interaction.created_at.desc()).limit(limit)
    result = await session.execute(stmt)
    test_interactions = list(result.scalars().all())

    # Test workflow
    engine = WorkflowEngine()
    test_results = await engine.test_workflow(
        db=session,
        workflow=workflow,
        test_interactions=test_interactions,
        user_id=current_user.id,
    )

    return {
        "workflow_id": str(workflow_id),
        "workflow_name": workflow.name,
        "test_count": len(test_interactions),
        "results": test_results,
    }


@router.get("/{workflow_id}/analytics")
async def get_workflow_analytics(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get analytics for a specific workflow."""
    from sqlalchemy import func

    workflow = await session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if getattr(current_user, "organization_id", None) is not None and workflow.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Get execution stats
    stmt = select(
        func.count(WorkflowExecution.id).label("total"),
        func.count().filter(WorkflowExecution.status == "completed").label("completed"),
        func.count().filter(WorkflowExecution.status == "failed").label("failed"),
        func.count().filter(WorkflowExecution.status == "skipped").label("skipped"),
    ).where(WorkflowExecution.workflow_id == workflow_id)

    result = await session.execute(stmt)
    row = result.one()

    # Get recent executions
    recent_stmt = select(WorkflowExecution).where(
        WorkflowExecution.workflow_id == workflow_id
    ).order_by(WorkflowExecution.created_at.desc()).limit(10)
    recent_result = await session.execute(recent_stmt)
    recent_executions = list(recent_result.scalars().all())

    return {
        "workflow_id": str(workflow_id),
        "workflow_name": workflow.name,
        "status": workflow.status,
        "stats": {
            "total_executions": row.total,
            "completed": row.completed,
            "failed": row.failed,
            "skipped": row.skipped,
            "success_rate": round(row.completed / row.total * 100, 2) if row.total > 0 else 0,
        },
        "recent_executions": [
            {
                "id": str(e.id),
                "status": e.status,
                "created_at": e.created_at.isoformat(),
                "context": e.context,
                "result": e.result,
                "error": e.error,
            }
            for e in recent_executions
        ],
    }


@router.get("/analytics/overview")
async def get_workflows_overview(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get overview analytics for all workflows."""
    from sqlalchemy import func

    # Get workflow counts by status
    stmt = select(
        Workflow.status,
        func.count(Workflow.id).label("count"),
    ).where(
        Workflow.created_by_id == current_user.id
    ).group_by(Workflow.status)

    result = await session.execute(stmt)
    status_counts = {row.status: row.count for row in result}

    # Get total execution stats
    exec_stmt = select(
        func.count(WorkflowExecution.id).label("total"),
        func.count().filter(WorkflowExecution.status == "completed").label("completed"),
        func.count().filter(WorkflowExecution.status == "failed").label("failed"),
    ).select_from(Workflow).join(
        WorkflowExecution, Workflow.id == WorkflowExecution.workflow_id
    ).where(
        Workflow.created_by_id == current_user.id
    )

    exec_result = await session.execute(exec_stmt)
    exec_row = exec_result.one_or_none()

    total_execs = exec_row.total if exec_row else 0
    completed_execs = exec_row.completed if exec_row else 0
    failed_execs = exec_row.failed if exec_row else 0

    return {
        "workflows": {
            "active": status_counts.get("active", 0),
            "paused": status_counts.get("paused", 0),
            "draft": status_counts.get("draft", 0),
            "total": sum(status_counts.values()),
        },
        "executions": {
            "total": total_execs,
            "completed": completed_execs,
            "failed": failed_execs,
            "success_rate": round(completed_execs / total_execs * 100, 2) if total_execs > 0 else 0,
        },
    }
