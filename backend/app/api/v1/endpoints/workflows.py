"""Endpoints for Workflows and Workflow Approvals."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_async_session
from app.models.workflow import Workflow, WorkflowApproval, WorkflowExecution
from app.models.user import User
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowOut,
    WorkflowUpdate,
    ApprovalCreate,
    ApprovalOut,
    ApprovalUpdate,
    WorkflowExecutionCreate,
    WorkflowExecutionOut,
)
from app.services.workflow_service import WorkflowService
from app.core.security import get_current_active_user

router = APIRouter()


# ------------------------------ Workflows ------------------------------------
@router.post("/workflows", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    payload: WorkflowCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    svc = WorkflowService()
    # Comprehensive validation
    try:
        svc.validate_workflow(
            name=payload.name,
            trigger=payload.trigger.model_dump() if payload.trigger else None,
            conditions=[c.model_dump() for c in (payload.conditions or [])],
            actions=[a.model_dump() for a in (payload.actions or [])]
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    obj = Workflow(
        name=payload.name,
        status=payload.status,
        description=payload.description,
        trigger=payload.trigger.model_dump() if payload.trigger else None,
        conditions=[c.model_dump() for c in (payload.conditions or [])],
        actions=[a.model_dump() for a in (payload.actions or [])],
        organization_id=current_user.organization_id if hasattr(current_user, "organization_id") else None,
        created_by_id=current_user.id,
    )
    session.add(obj)
    await session.flush()
    await session.refresh(obj)
    return obj


@router.get("/workflows", response_model=List[WorkflowOut])
async def list_workflows(
    status_eq: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(Workflow).where(
        (Workflow.organization_id == current_user.organization_id)
        if getattr(current_user, "organization_id", None) is not None
        else True
    )
    if status_eq:
        stmt = stmt.where(Workflow.status == status_eq)
    res = await session.execute(stmt.order_by(Workflow.created_at.desc()))
    return list(res.scalars().all())


@router.get("/workflows/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(Workflow, workflow_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return obj


@router.patch("/workflows/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: UUID,
    payload: WorkflowUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(Workflow, workflow_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if payload.name is not None:
        obj.name = payload.name
    if payload.status is not None:
        obj.status = payload.status
    if payload.description is not None:
        obj.description = payload.description
    if payload.trigger is not None:
        obj.trigger = payload.trigger.model_dump() if payload.trigger else None
    if payload.conditions is not None:
        obj.conditions = [c.model_dump() for c in (payload.conditions or [])]
    # Validate updated workflow
    if any([payload.name, payload.trigger, payload.conditions, payload.actions]):
        svc = WorkflowService()
        try:
            svc.validate_workflow(
                name=payload.name if payload.name is not None else obj.name,
                trigger=(payload.trigger.model_dump() if payload.trigger else None) if payload.trigger is not None else obj.trigger,
                conditions=[c.model_dump() for c in payload.conditions] if payload.conditions is not None else obj.conditions,
                actions=[a.model_dump() for a in payload.actions] if payload.actions is not None else obj.actions
            )
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

    if payload.actions is not None:
        obj.actions = [a.model_dump() for a in (payload.actions or [])]
    await session.flush()
    await session.refresh(obj)
    return obj


@router.delete("/workflows/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(Workflow, workflow_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await session.delete(obj)
    return None


# ------------------------- Workflow state actions ----------------------------
@router.post("/workflows/{workflow_id}/activate", response_model=WorkflowOut)
async def activate_workflow(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(Workflow, workflow_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    obj.status = "active"
    await session.flush()
    await session.refresh(obj)
    return obj


@router.post("/workflows/{workflow_id}/pause", response_model=WorkflowOut)
async def pause_workflow(
    workflow_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    obj = await session.get(Workflow, workflow_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if getattr(current_user, "organization_id", None) is not None and obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    obj.status = "paused"
    await session.flush()
    await session.refresh(obj)
    return obj


# ----------------------------- Approvals -------------------------------------
@router.post("/workflows/approvals", response_model=ApprovalOut, status_code=status.HTTP_201_CREATED)
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


@router.get("/workflows/approvals", response_model=List[ApprovalOut])
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


@router.get("/workflows/approvals/{approval_id}", response_model=ApprovalOut)
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


@router.patch("/workflows/approvals/{approval_id}", response_model=ApprovalOut)
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


@router.post("/workflows/approvals/{approval_id}/send", response_model=ApprovalOut)
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


@router.post("/workflows/approvals/{approval_id}/reject", response_model=ApprovalOut)
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
    "/workflows/{workflow_id}/executions",
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
    "/workflows/{workflow_id}/executions",
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
@router.post("/workflows/{workflow_id}/test")
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


@router.get("/workflows/{workflow_id}/analytics")
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


@router.get("/workflows/analytics/overview")
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
