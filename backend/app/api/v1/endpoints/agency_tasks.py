"""Agency task management endpoints."""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.agency import Agency
from app.models.agency_notification import AgencyTask, AgencyNotification
from pydantic import BaseModel


router = APIRouter()


# Pydantic schemas
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "normal"
    assignee_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    related_type: Optional[str] = None
    related_id: Optional[UUID] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    priority: str
    status: str
    assignee_id: Optional[UUID]
    assignee_name: Optional[str] = None
    created_by: Optional[UUID]
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    related_type: Optional[str]
    related_id: Optional[UUID]
    is_auto_generated: bool
    source: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: str
    description: Optional[str]
    icon: Optional[str]
    link_url: Optional[str]
    entity_type: Optional[str]
    entity_id: Optional[UUID]
    is_read: bool
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True


async def get_user_agency(user: User, db: AsyncSession) -> Agency:
    """Get the user's agency."""
    result = await db.execute(
        select(Agency).where(
            or_(
                Agency.owner_id == user.id,
                Agency.id.in_(
                    select(Agency.id).where(
                        # Check team membership if needed
                        Agency.owner_id == user.id
                    )
                )
            )
        )
    )
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=403, detail="No agency found")
    return agency


@router.get("/tasks")
async def get_tasks(
    status: Optional[str] = Query(None, description="Filter by status"),
    assignee_id: Optional[UUID] = Query(None, description="Filter by assignee"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    include_completed: bool = Query(False, description="Include completed tasks"),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get tasks for the agency."""
    agency = await get_user_agency(current_user, db)

    query = select(AgencyTask).where(AgencyTask.agency_id == agency.id)

    if status:
        query = query.where(AgencyTask.status == status)
    elif not include_completed:
        query = query.where(AgencyTask.status.notin_(['completed', 'cancelled']))

    if assignee_id:
        query = query.where(AgencyTask.assignee_id == assignee_id)

    if priority:
        query = query.where(AgencyTask.priority == priority)

    # Order by due date (nulls last), then by priority
    query = query.order_by(
        AgencyTask.due_date.asc().nullslast(),
        AgencyTask.created_at.desc()
    ).offset(offset).limit(limit)

    result = await db.execute(query)
    tasks = result.scalars().all()

    # Get total count
    count_query = select(func.count()).select_from(AgencyTask).where(AgencyTask.agency_id == agency.id)
    if not include_completed:
        count_query = count_query.where(AgencyTask.status.notin_(['completed', 'cancelled']))
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    return {
        "tasks": [TaskResponse.model_validate(t) for t in tasks],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.post("/tasks")
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    """Create a new task."""
    agency = await get_user_agency(current_user, db)

    task = AgencyTask(
        agency_id=agency.id,
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        status="todo",
        assignee_id=task_data.assignee_id,
        created_by=current_user.id,
        due_date=task_data.due_date,
        related_type=task_data.related_type,
        related_id=task_data.related_id,
        is_auto_generated=False,
    )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return TaskResponse.model_validate(task)


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    """Update a task."""
    agency = await get_user_agency(current_user, db)

    result = await db.execute(
        select(AgencyTask).where(
            and_(AgencyTask.id == task_id, AgencyTask.agency_id == agency.id)
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(task, field, value)

    # If status is being set to completed, set completed_at
    if task_data.status == "completed" and not task.completed_at:
        task.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(task)

    return TaskResponse.model_validate(task)


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a task."""
    agency = await get_user_agency(current_user, db)

    result = await db.execute(
        select(AgencyTask).where(
            and_(AgencyTask.id == task_id, AgencyTask.agency_id == agency.id)
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()

    return {"success": True}


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    """Mark a task as complete."""
    agency = await get_user_agency(current_user, db)

    result = await db.execute(
        select(AgencyTask).where(
            and_(AgencyTask.id == task_id, AgencyTask.agency_id == agency.id)
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "completed"
    task.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(task)

    return TaskResponse.model_validate(task)


@router.get("/notifications")
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(20, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get notifications for the current user."""
    query = select(AgencyNotification).where(
        AgencyNotification.user_id == current_user.id
    )

    if unread_only:
        query = query.where(AgencyNotification.is_read == False)

    query = query.order_by(AgencyNotification.created_at.desc()).limit(limit)

    result = await db.execute(query)
    notifications = result.scalars().all()

    # Get unread count
    unread_count_result = await db.execute(
        select(func.count()).select_from(AgencyNotification).where(
            and_(
                AgencyNotification.user_id == current_user.id,
                AgencyNotification.is_read == False
            )
        )
    )
    unread_count = unread_count_result.scalar()

    return {
        "notifications": [NotificationResponse.model_validate(n) for n in notifications],
        "unread_count": unread_count
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a notification as read."""
    result = await db.execute(
        select(AgencyNotification).where(
            and_(
                AgencyNotification.id == notification_id,
                AgencyNotification.user_id == current_user.id
            )
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.utcnow()

    await db.commit()

    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark all notifications as read."""
    from sqlalchemy import update

    await db.execute(
        update(AgencyNotification)
        .where(
            and_(
                AgencyNotification.user_id == current_user.id,
                AgencyNotification.is_read == False
            )
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )

    await db.commit()

    return {"success": True}
