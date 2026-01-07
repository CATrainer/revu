"""Service for managing monetization projects and tasks."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from app.models.monetization_v2 import MonetizationProject, MonetizationTask, MonetizationTemplate
from app.models.user import User


class MonetizationProjectService:
    """Service for managing user monetization projects."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_project(
        self,
        user_id: UUID,
        template_id: str,
        title: Optional[str] = None,
        decision_values: Optional[Dict[str, Any]] = None
    ) -> MonetizationProject:
        """Create a new project from a template."""
        # Get the template
        template_result = await self.db.execute(
            select(MonetizationTemplate).where(MonetizationTemplate.id == template_id)
        )
        template = template_result.scalar_one_or_none()
        
        if not template:
            raise ValueError(f"Template not found: {template_id}")
        
        # Create project
        project = MonetizationProject(
            user_id=user_id,
            template_id=template_id,
            title=title or template.title,
            decision_values=decision_values or {},
            customized_plan=template.action_plan,  # Start with template's plan
        )
        
        self.db.add(project)
        await self.db.flush()  # Get the project ID
        
        # Create tasks from the action plan
        await self._create_tasks_from_plan(project.id, template.action_plan)
        
        await self.db.commit()
        await self.db.refresh(project)
        
        return project
    
    async def _create_tasks_from_plan(
        self,
        project_id: UUID,
        action_plan: List[Dict[str, Any]]
    ) -> None:
        """Create task records from an action plan."""
        sort_order = 0
        
        for phase_data in action_plan:
            phase_num = phase_data.get("phase", 1)
            phase_name = phase_data.get("phase_name", f"Phase {phase_num}")
            
            for task_data in phase_data.get("tasks", []):
                task = MonetizationTask(
                    project_id=project_id,
                    phase=phase_num,
                    phase_name=phase_name,
                    task_id=task_data.get("id", f"{phase_num}.{sort_order}"),
                    title=task_data.get("title", "Untitled Task"),
                    description=task_data.get("description", ""),
                    estimated_hours=task_data.get("estimated_hours"),
                    depends_on_decisions=task_data.get("depends_on_decisions", []),
                    sort_order=sort_order,
                    status="todo"
                )
                self.db.add(task)
                sort_order += 1
    
    async def get_project_by_id(
        self,
        project_id: UUID,
        user_id: UUID
    ) -> Optional[MonetizationProject]:
        """Get a project by ID, ensuring user ownership."""
        result = await self.db.execute(
            select(MonetizationProject)
            .options(
                selectinload(MonetizationProject.tasks),
                selectinload(MonetizationProject.template)
            )
            .where(
                MonetizationProject.id == project_id,
                MonetizationProject.user_id == user_id
            )
        )
        return result.scalar_one_or_none()
    
    async def get_user_projects(
        self,
        user_id: UUID,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[MonetizationProject]:
        """Get all projects for a user."""
        query = (
            select(MonetizationProject)
            .options(selectinload(MonetizationProject.tasks))
            .where(MonetizationProject.user_id == user_id)
        )
        
        if status:
            query = query.where(MonetizationProject.status == status)
        
        query = query.order_by(MonetizationProject.updated_at.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def update_project(
        self,
        project_id: UUID,
        user_id: UUID,
        title: Optional[str] = None,
        status: Optional[str] = None,
        decision_values: Optional[Dict[str, Any]] = None
    ) -> Optional[MonetizationProject]:
        """Update a project."""
        project = await self.get_project_by_id(project_id, user_id)
        
        if not project:
            return None
        
        if title is not None:
            project.title = title
        
        if status is not None:
            project.status = status
            if status == "completed":
                project.completed_at = datetime.utcnow()
        
        if decision_values is not None:
            # Merge with existing values
            current = project.decision_values or {}
            current.update(decision_values)
            project.decision_values = current
        
        await self.db.commit()
        await self.db.refresh(project)
        
        return project
    
    async def delete_project(self, project_id: UUID, user_id: UUID) -> bool:
        """Delete a project (cascades to tasks)."""
        project = await self.get_project_by_id(project_id, user_id)
        
        if not project:
            return False
        
        await self.db.delete(project)
        await self.db.commit()
        
        return True
    
    async def get_project_progress(self, project_id: UUID, include_phases: bool = False) -> Dict[str, Any]:
        """Calculate project progress based on task completion."""
        result = await self.db.execute(
            select(
                MonetizationTask.status,
                func.count(MonetizationTask.id).label("count")
            )
            .where(MonetizationTask.project_id == project_id)
            .group_by(MonetizationTask.status)
        )
        
        counts = {row.status: row.count for row in result}
        
        todo = counts.get("todo", 0)
        in_progress = counts.get("in_progress", 0)
        done = counts.get("done", 0)
        total = todo + in_progress + done
        
        progress = {
            "todo": todo,
            "in_progress": in_progress,
            "done": done,
            "total": total,
            "percentage": round((done / total) * 100) if total > 0 else 0
        }
        
        # Calculate phase-by-phase progress if requested
        if include_phases:
            phase_result = await self.db.execute(
                select(
                    MonetizationTask.phase,
                    MonetizationTask.phase_name,
                    MonetizationTask.status,
                    func.count(MonetizationTask.id).label("count")
                )
                .where(MonetizationTask.project_id == project_id)
                .group_by(MonetizationTask.phase, MonetizationTask.phase_name, MonetizationTask.status)
                .order_by(MonetizationTask.phase)
            )
            
            # Aggregate by phase
            phases_data: Dict[int, Dict[str, Any]] = {}
            for row in phase_result:
                if row.phase not in phases_data:
                    phases_data[row.phase] = {
                        "phase": row.phase,
                        "phase_name": row.phase_name,
                        "total": 0,
                        "done": 0
                    }
                phases_data[row.phase]["total"] += row.count
                if row.status == "done":
                    phases_data[row.phase]["done"] += row.count
            
            # Calculate percentages and build list
            by_phase = []
            for phase_num in sorted(phases_data.keys()):
                phase_info = phases_data[phase_num]
                phase_info["percentage"] = round((phase_info["done"] / phase_info["total"]) * 100) if phase_info["total"] > 0 else 0
                by_phase.append(phase_info)
            
            progress["by_phase"] = by_phase
        
        return progress


class MonetizationTaskService:
    """Service for managing monetization tasks."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_tasks_by_project(
        self,
        project_id: UUID,
        user_id: UUID
    ) -> List[MonetizationTask]:
        """Get all tasks for a project, verifying user ownership."""
        # First verify project ownership
        project_result = await self.db.execute(
            select(MonetizationProject.id)
            .where(
                MonetizationProject.id == project_id,
                MonetizationProject.user_id == user_id
            )
        )
        
        if not project_result.scalar_one_or_none():
            return []
        
        result = await self.db.execute(
            select(MonetizationTask)
            .where(MonetizationTask.project_id == project_id)
            .order_by(MonetizationTask.phase, MonetizationTask.sort_order)
        )
        
        return list(result.scalars().all())
    
    async def get_tasks_by_status(
        self,
        project_id: UUID,
        user_id: UUID
    ) -> Dict[str, List[MonetizationTask]]:
        """Get tasks grouped by status for Kanban view."""
        tasks = await self.get_tasks_by_project(project_id, user_id)
        
        return {
            "todo": [t for t in tasks if t.status == "todo"],
            "in_progress": [t for t in tasks if t.status == "in_progress"],
            "done": [t for t in tasks if t.status == "done"]
        }
    
    async def update_task(
        self,
        task_id: UUID,
        user_id: UUID,
        status: Optional[str] = None,
        notes: Optional[str] = None,
        sort_order: Optional[int] = None
    ) -> Optional[MonetizationTask]:
        """Update a task, verifying user ownership through project."""
        # Get task with project for ownership check
        result = await self.db.execute(
            select(MonetizationTask)
            .join(MonetizationProject)
            .where(
                MonetizationTask.id == task_id,
                MonetizationProject.user_id == user_id
            )
        )
        task = result.scalar_one_or_none()
        
        if not task:
            return None
        
        if status is not None:
            task.status = status
            if status == "done":
                task.completed_at = datetime.utcnow()
            elif task.completed_at:
                task.completed_at = None
        
        if notes is not None:
            task.notes = notes
        
        if sort_order is not None:
            task.sort_order = sort_order
        
        await self.db.commit()
        await self.db.refresh(task)
        
        return task
    
    async def reorder_task(
        self,
        task_id: UUID,
        user_id: UUID,
        new_status: str,
        new_sort_order: int
    ) -> Optional[MonetizationTask]:
        """Move a task to a new status and position (for Kanban drag-and-drop)."""
        # Get task with project for ownership check
        result = await self.db.execute(
            select(MonetizationTask)
            .join(MonetizationProject)
            .where(
                MonetizationTask.id == task_id,
                MonetizationProject.user_id == user_id
            )
        )
        task = result.scalar_one_or_none()
        
        if not task:
            return None
        
        old_status = task.status
        old_order = task.sort_order
        
        # Update the moved task
        task.status = new_status
        task.sort_order = new_sort_order
        
        if new_status == "done" and old_status != "done":
            task.completed_at = datetime.utcnow()
        elif new_status != "done" and old_status == "done":
            task.completed_at = None
        
        # Shift other tasks in the target status to make room
        await self.db.execute(
            update(MonetizationTask)
            .where(
                MonetizationTask.project_id == task.project_id,
                MonetizationTask.status == new_status,
                MonetizationTask.id != task_id,
                MonetizationTask.sort_order >= new_sort_order
            )
            .values(sort_order=MonetizationTask.sort_order + 1)
        )
        
        await self.db.commit()
        await self.db.refresh(task)
        
        return task
    
    async def bulk_update_status(
        self,
        project_id: UUID,
        user_id: UUID,
        task_ids: List[UUID],
        new_status: str
    ) -> int:
        """Update status for multiple tasks at once."""
        # Verify project ownership
        project_result = await self.db.execute(
            select(MonetizationProject.id)
            .where(
                MonetizationProject.id == project_id,
                MonetizationProject.user_id == user_id
            )
        )
        
        if not project_result.scalar_one_or_none():
            return 0
        
        # Update tasks
        result = await self.db.execute(
            update(MonetizationTask)
            .where(
                MonetizationTask.project_id == project_id,
                MonetizationTask.id.in_(task_ids)
            )
            .values(
                status=new_status,
                completed_at=datetime.utcnow() if new_status == "done" else None
            )
        )
        
        await self.db.commit()
        
        return result.rowcount


def get_project_service(db: AsyncSession) -> MonetizationProjectService:
    """Dependency injection helper."""
    return MonetizationProjectService(db)


def get_task_service(db: AsyncSession) -> MonetizationTaskService:
    """Dependency injection helper."""
    return MonetizationTaskService(db)
