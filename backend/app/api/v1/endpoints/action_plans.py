"""Action Plans endpoints for tracking creator goals and tasks."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.content import ActionPlan, ActionItem, ContentPiece

router = APIRouter()


# Request/Response models
class ActionItemRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[int] = None
    projected_outcome: Optional[str] = None


class ActionItemResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    order_index: int
    due_date: Optional[datetime]
    estimated_hours: Optional[int]
    is_completed: bool
    completed_at: Optional[datetime]
    projected_outcome: Optional[str]
    actual_outcome: Optional[str]
    linked_content_id: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreateActionPlanRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    goal: str = Field(..., min_length=1)
    source_type: Optional[str] = Field("manual", pattern="^(content_insight|ai_chat|manual)$")
    source_content_id: Optional[UUID] = None
    source_chat_session_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    estimated_duration_days: Optional[int] = None
    projected_outcomes: Optional[dict] = None
    action_items: List[ActionItemRequest] = []


class UpdateActionPlanRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    goal: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|completed|paused|cancelled)$")
    end_date: Optional[datetime] = None
    actual_outcomes: Optional[dict] = None
    completion_notes: Optional[str] = None


class ActionPlanResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    goal: str
    source_type: Optional[str]
    source_content_id: Optional[str]
    source_chat_session_id: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    estimated_duration_days: Optional[int]
    status: str
    progress_percentage: int
    projected_outcomes: Optional[dict]
    actual_outcomes: Optional[dict]
    completion_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    action_items: List[ActionItemResponse] = []
    
    class Config:
        from_attributes = True


class ActionPlanSummaryResponse(BaseModel):
    id: str
    name: str
    goal: str
    status: str
    progress_percentage: int
    total_items: int
    completed_items: int
    upcoming_items: int
    next_action_due: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/action-plans", response_model=ActionPlanResponse)
async def create_action_plan(
    request: CreateActionPlanRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new action plan."""
    
    # Validate source content/chat if provided
    if request.source_content_id:
        content_stmt = select(ContentPiece).where(
            ContentPiece.id == request.source_content_id,
            ContentPiece.user_id == current_user.id,
        )
        content_result = await session.execute(content_stmt)
        if not content_result.scalar_one_or_none():
            raise HTTPException(404, "Source content not found")
    
    # Create action plan
    plan = ActionPlan(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        goal=request.goal,
        source_type=request.source_type,
        source_content_id=request.source_content_id,
        source_chat_session_id=request.source_chat_session_id,
        start_date=request.start_date or datetime.utcnow(),
        end_date=request.end_date,
        estimated_duration_days=request.estimated_duration_days,
        projected_outcomes=request.projected_outcomes,
        status='active',
        progress_percentage=0,
    )
    session.add(plan)
    await session.flush()  # Get plan ID
    
    # Create action items
    for idx, item_req in enumerate(request.action_items):
        item = ActionItem(
            plan_id=plan.id,
            title=item_req.title,
            description=item_req.description,
            order_index=idx,
            due_date=item_req.due_date,
            estimated_hours=item_req.estimated_hours,
            projected_outcome=item_req.projected_outcome,
            is_completed=False,
        )
        session.add(item)
    
    await session.commit()
    await session.refresh(plan)
    
    # Load action items
    items_stmt = (
        select(ActionItem)
        .where(ActionItem.plan_id == plan.id)
        .order_by(ActionItem.order_index)
    )
    items_result = await session.execute(items_stmt)
    action_items = items_result.scalars().all()
    
    return ActionPlanResponse(
        id=str(plan.id),
        name=plan.name,
        description=plan.description,
        goal=plan.goal,
        source_type=plan.source_type,
        source_content_id=str(plan.source_content_id) if plan.source_content_id else None,
        source_chat_session_id=str(plan.source_chat_session_id) if plan.source_chat_session_id else None,
        start_date=plan.start_date,
        end_date=plan.end_date,
        estimated_duration_days=plan.estimated_duration_days,
        status=plan.status,
        progress_percentage=plan.progress_percentage,
        projected_outcomes=plan.projected_outcomes,
        actual_outcomes=plan.actual_outcomes,
        completion_notes=plan.completion_notes,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        completed_at=plan.completed_at,
        action_items=[ActionItemResponse.from_orm(item) for item in action_items],
    )


@router.get("/action-plans", response_model=List[ActionPlanSummaryResponse])
async def list_action_plans(
    status: Optional[str] = Query(None, pattern="^(active|completed|paused|cancelled)$"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List action plans for the current user."""
    
    filters = [ActionPlan.user_id == current_user.id]
    if status:
        filters.append(ActionPlan.status == status)
    
    stmt = (
        select(ActionPlan)
        .where(and_(*filters))
        .order_by(desc(ActionPlan.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    plans = result.scalars().all()
    
    # Build summary responses
    responses = []
    for plan in plans:
        # Count items
        items_stmt = select(
            func.count(ActionItem.id).label('total'),
            func.count(ActionItem.id).filter(ActionItem.is_completed == True).label('completed'),
        ).where(ActionItem.plan_id == plan.id)
        items_result = await session.execute(items_stmt)
        items_data = items_result.first()
        
        total_items = items_data.total or 0
        completed_items = items_data.completed or 0
        upcoming_items = total_items - completed_items
        
        # Get next action due date
        next_action_stmt = (
            select(ActionItem.due_date)
            .where(
                ActionItem.plan_id == plan.id,
                ActionItem.is_completed == False,
                ActionItem.due_date.isnot(None),
            )
            .order_by(ActionItem.due_date)
            .limit(1)
        )
        next_action_result = await session.execute(next_action_stmt)
        next_action_due = next_action_result.scalar_one_or_none()
        
        responses.append(ActionPlanSummaryResponse(
            id=str(plan.id),
            name=plan.name,
            goal=plan.goal,
            status=plan.status,
            progress_percentage=plan.progress_percentage,
            total_items=total_items,
            completed_items=completed_items,
            upcoming_items=upcoming_items,
            next_action_due=next_action_due,
            created_at=plan.created_at,
        ))
    
    return responses


@router.get("/action-plans/{plan_id}", response_model=ActionPlanResponse)
async def get_action_plan(
    plan_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get detailed action plan information."""
    
    stmt = select(ActionPlan).where(
        ActionPlan.id == plan_id,
        ActionPlan.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(404, "Action plan not found")
    
    # Load action items
    items_stmt = (
        select(ActionItem)
        .where(ActionItem.plan_id == plan.id)
        .order_by(ActionItem.order_index)
    )
    items_result = await session.execute(items_stmt)
    action_items = items_result.scalars().all()
    
    return ActionPlanResponse(
        id=str(plan.id),
        name=plan.name,
        description=plan.description,
        goal=plan.goal,
        source_type=plan.source_type,
        source_content_id=str(plan.source_content_id) if plan.source_content_id else None,
        source_chat_session_id=str(plan.source_chat_session_id) if plan.source_chat_session_id else None,
        start_date=plan.start_date,
        end_date=plan.end_date,
        estimated_duration_days=plan.estimated_duration_days,
        status=plan.status,
        progress_percentage=plan.progress_percentage,
        projected_outcomes=plan.projected_outcomes,
        actual_outcomes=plan.actual_outcomes,
        completion_notes=plan.completion_notes,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        completed_at=plan.completed_at,
        action_items=[ActionItemResponse.from_orm(item) for item in action_items],
    )


@router.patch("/action-plans/{plan_id}", response_model=ActionPlanResponse)
async def update_action_plan(
    plan_id: UUID,
    request: UpdateActionPlanRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update an action plan."""
    
    stmt = select(ActionPlan).where(
        ActionPlan.id == plan_id,
        ActionPlan.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(404, "Action plan not found")
    
    # Update fields
    if request.name is not None:
        plan.name = request.name
    if request.description is not None:
        plan.description = request.description
    if request.goal is not None:
        plan.goal = request.goal
    if request.status is not None:
        plan.status = request.status
        if request.status == 'completed' and not plan.completed_at:
            plan.completed_at = datetime.utcnow()
            plan.progress_percentage = 100
    if request.end_date is not None:
        plan.end_date = request.end_date
    if request.actual_outcomes is not None:
        plan.actual_outcomes = request.actual_outcomes
    if request.completion_notes is not None:
        plan.completion_notes = request.completion_notes
    
    await session.commit()
    await session.refresh(plan)
    
    # Load action items
    items_stmt = (
        select(ActionItem)
        .where(ActionItem.plan_id == plan.id)
        .order_by(ActionItem.order_index)
    )
    items_result = await session.execute(items_stmt)
    action_items = items_result.scalars().all()
    
    return ActionPlanResponse(
        id=str(plan.id),
        name=plan.name,
        description=plan.description,
        goal=plan.goal,
        source_type=plan.source_type,
        source_content_id=str(plan.source_content_id) if plan.source_content_id else None,
        source_chat_session_id=str(plan.source_chat_session_id) if plan.source_chat_session_id else None,
        start_date=plan.start_date,
        end_date=plan.end_date,
        estimated_duration_days=plan.estimated_duration_days,
        status=plan.status,
        progress_percentage=plan.progress_percentage,
        projected_outcomes=plan.projected_outcomes,
        actual_outcomes=plan.actual_outcomes,
        completion_notes=plan.completion_notes,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        completed_at=plan.completed_at,
        action_items=[ActionItemResponse.from_orm(item) for item in action_items],
    )


@router.delete("/action-plans/{plan_id}")
async def delete_action_plan(
    plan_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an action plan."""
    
    stmt = select(ActionPlan).where(
        ActionPlan.id == plan_id,
        ActionPlan.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(404, "Action plan not found")
    
    await session.delete(plan)
    await session.commit()
    
    return {"status": "deleted"}


# Action Item endpoints
@router.patch("/action-items/{item_id}/complete")
async def complete_action_item(
    item_id: UUID,
    actual_outcome: Optional[str] = None,
    linked_content_id: Optional[UUID] = None,
    notes: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Mark an action item as complete."""
    
    # Get item and verify ownership through plan
    stmt = (
        select(ActionItem)
        .join(ActionPlan, ActionItem.plan_id == ActionPlan.id)
        .where(
            ActionItem.id == item_id,
            ActionPlan.user_id == current_user.id,
        )
    )
    result = await session.execute(stmt)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(404, "Action item not found")
    
    # Verify linked content if provided
    if linked_content_id:
        content_stmt = select(ContentPiece).where(
            ContentPiece.id == linked_content_id,
            ContentPiece.user_id == current_user.id,
        )
        content_result = await session.execute(content_stmt)
        if not content_result.scalar_one_or_none():
            raise HTTPException(404, "Linked content not found")
    
    # Update item
    item.is_completed = True
    item.completed_at = datetime.utcnow()
    if actual_outcome:
        item.actual_outcome = actual_outcome
    if linked_content_id:
        item.linked_content_id = linked_content_id
    if notes:
        item.notes = notes
    
    # Update plan progress
    plan_stmt = select(ActionPlan).where(ActionPlan.id == item.plan_id)
    plan_result = await session.execute(plan_stmt)
    plan = plan_result.scalar_one()
    
    # Count completed items
    count_stmt = select(
        func.count(ActionItem.id).label('total'),
        func.count(ActionItem.id).filter(ActionItem.is_completed == True).label('completed'),
    ).where(ActionItem.plan_id == plan.id)
    count_result = await session.execute(count_stmt)
    count_data = count_result.first()
    
    total = count_data.total or 1
    completed = count_data.completed or 0
    plan.progress_percentage = int((completed / total) * 100)
    
    # If all items completed, mark plan as completed
    if completed == total and plan.status == 'active':
        plan.status = 'completed'
        plan.completed_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(item)
    
    return ActionItemResponse.from_orm(item)


@router.patch("/action-items/{item_id}/uncomplete")
async def uncomplete_action_item(
    item_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Mark an action item as incomplete."""
    
    stmt = (
        select(ActionItem)
        .join(ActionPlan, ActionItem.plan_id == ActionPlan.id)
        .where(
            ActionItem.id == item_id,
            ActionPlan.user_id == current_user.id,
        )
    )
    result = await session.execute(stmt)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(404, "Action item not found")
    
    item.is_completed = False
    item.completed_at = None
    
    # Update plan progress
    plan_stmt = select(ActionPlan).where(ActionPlan.id == item.plan_id)
    plan_result = await session.execute(plan_stmt)
    plan = plan_result.scalar_one()
    
    count_stmt = select(
        func.count(ActionItem.id).label('total'),
        func.count(ActionItem.id).filter(ActionItem.is_completed == True).label('completed'),
    ).where(ActionItem.plan_id == plan.id)
    count_result = await session.execute(count_stmt)
    count_data = count_result.first()
    
    total = count_data.total or 1
    completed = count_data.completed or 0
    plan.progress_percentage = int((completed / total) * 100)
    
    # Reactivate plan if it was completed
    if plan.status == 'completed':
        plan.status = 'active'
        plan.completed_at = None
    
    await session.commit()
    await session.refresh(item)
    
    return ActionItemResponse.from_orm(item)
