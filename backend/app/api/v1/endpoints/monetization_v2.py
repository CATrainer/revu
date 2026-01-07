"""Monetization Engine V2 API endpoints.

This module provides the API for the revamped monetization engine:
- Template browsing and filtering
- Project creation and management
- Task management with Kanban support
- AI recommendations
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.monetization import CreatorProfile
from app.models.monetization_v2 import MonetizationTemplate, MonetizationProject, MonetizationTask
from app.services.monetization_template_service import MonetizationTemplateService
from app.services.monetization_project_service import MonetizationProjectService, MonetizationTaskService
from app.schemas.monetization_v2 import (
    TemplateListItem, TemplateDetail, TemplateListResponse,
    ProjectCreate, ProjectUpdate, ProjectListItem, ProjectDetail, ProjectListResponse,
    TaskBase, TaskUpdate, TaskReorder, TasksByStatus, TaskStatus,
    AIRecommendation, AIRecommendationsResponse,
    SuitableFor, RevenueRange
)
from sqlalchemy import select


router = APIRouter(prefix="/v2", tags=["monetization-v2"])


# ==================== Template Endpoints ====================

@router.get("/templates", response_model=TemplateListResponse)
async def list_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    subcategory: Optional[str] = Query(None, description="Filter by subcategory"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all monetization templates.
    
    Optionally filter by category or subcategory.
    Returns templates with category counts for filtering UI.
    """
    service = MonetizationTemplateService(db)
    
    templates = await service.get_all_templates(
        category=category,
        subcategory=subcategory,
        active_only=True
    )
    
    category_counts = await service.get_category_counts(active_only=True)
    
    template_items = []
    for t in templates:
        template_items.append(TemplateListItem(
            id=t.id,
            category=t.category,
            subcategory=t.subcategory,
            title=t.title,
            description=t.description,
            revenue_model=t.revenue_model,
            expected_timeline=t.expected_timeline,
            expected_revenue_range=RevenueRange(**t.expected_revenue_range) if t.expected_revenue_range else RevenueRange(low=0, high=0, unit="per_month"),
            suitable_for=SuitableFor(**t.suitable_for) if t.suitable_for else SuitableFor(min_followers=0, niches=[], platforms=[])
        ))
    
    return TemplateListResponse(
        templates=template_items,
        total=len(template_items),
        categories=category_counts
    )


@router.get("/templates/{template_id}", response_model=TemplateDetail)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get full details of a specific template including decision points and action plan."""
    service = MonetizationTemplateService(db)
    
    template = await service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return TemplateDetail(
        id=template.id,
        category=template.category,
        subcategory=template.subcategory,
        title=template.title,
        description=template.description,
        prerequisites=template.prerequisites or [],
        suitable_for=SuitableFor(**template.suitable_for) if template.suitable_for else SuitableFor(min_followers=0, niches=[], platforms=[]),
        revenue_model=template.revenue_model,
        expected_timeline=template.expected_timeline,
        expected_revenue_range=RevenueRange(**template.expected_revenue_range) if template.expected_revenue_range else RevenueRange(low=0, high=0, unit="per_month"),
        decision_points=template.decision_points or [],
        action_plan=template.action_plan or [],
        is_active=template.is_active,
        display_order=template.display_order,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.get("/templates/recommendations", response_model=AIRecommendationsResponse)
async def get_ai_recommendations(
    limit: int = Query(5, ge=1, le=10, description="Number of recommendations"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get AI-powered template recommendations based on creator profile.
    
    Analyzes the creator's profile (followers, niche, platform, engagement)
    and returns the top matching templates with fit scores and personalized tips.
    """
    # Get creator profile
    profile_result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=400,
            detail="Creator profile required. Please set up your profile first."
        )
    
    service = MonetizationTemplateService(db)
    
    # Get templates with fit scores
    scored_templates = await service.get_templates_for_creator(
        follower_count=profile.follower_count,
        niche=profile.niche,
        platform=profile.primary_platform,
        limit=limit
    )
    
    recommendations = []
    for item in scored_templates:
        template = item["template"]
        fit_score = item["fit_score"]
        
        # Generate fit reasons based on score components
        fit_reasons = []
        suitable_for = template.suitable_for or {}
        
        if profile.follower_count >= suitable_for.get("min_followers", 0):
            fit_reasons.append(f"Your {profile.follower_count:,} followers exceed the minimum requirement")
        
        template_niches = suitable_for.get("niches", [])
        if not template_niches or profile.niche.lower() in [n.lower() for n in template_niches]:
            fit_reasons.append(f"Perfect match for {profile.niche} creators")
        
        template_platforms = suitable_for.get("platforms", [])
        if not template_platforms or profile.primary_platform.lower() in [p.lower() for p in template_platforms]:
            fit_reasons.append(f"Optimized for {profile.primary_platform.title()} creators")
        
        # Estimate revenue based on profile
        revenue_range = template.expected_revenue_range or {}
        base_revenue = (revenue_range.get("low", 0) + revenue_range.get("high", 0)) / 2
        follower_multiplier = min(profile.follower_count / 10000, 5)  # Cap at 5x
        estimated_revenue = int(base_revenue * (0.5 + follower_multiplier * 0.1))
        
        recommendations.append(AIRecommendation(
            template=TemplateListItem(
                id=template.id,
                category=template.category,
                subcategory=template.subcategory,
                title=template.title,
                description=template.description,
                revenue_model=template.revenue_model,
                expected_timeline=template.expected_timeline,
                expected_revenue_range=RevenueRange(**revenue_range) if revenue_range else RevenueRange(low=0, high=0, unit="per_month"),
                suitable_for=SuitableFor(**suitable_for) if suitable_for else SuitableFor(min_followers=0, niches=[], platforms=[])
            ),
            fit_score=fit_score,
            fit_reasons=fit_reasons,
            potential_challenges=[],  # TODO: Add AI-generated challenges
            estimated_monthly_revenue=estimated_revenue,
            personalized_tips=[]  # TODO: Add AI-generated tips
        ))
    
    from datetime import datetime
    return AIRecommendationsResponse(
        recommendations=recommendations,
        creator_summary=f"{profile.niche} creator on {profile.primary_platform.title()} with {profile.follower_count:,} followers",
        generated_at=datetime.utcnow()
    )


# ==================== Project Endpoints ====================

@router.post("/projects", response_model=ProjectDetail)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new monetization project from a template.
    
    Optionally provide decision values to customize the project.
    Tasks are automatically created from the template's action plan.
    """
    service = MonetizationProjectService(db)
    
    try:
        project = await service.create_project(
            user_id=current_user.id,
            template_id=data.template_id,
            title=data.title,
            decision_values=data.decision_values
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    progress = await service.get_project_progress(project.id)
    
    return ProjectDetail(
        id=project.id,
        user_id=project.user_id,
        template_id=project.template_id,
        title=project.title,
        status=project.status,
        customized_plan=project.customized_plan,
        decision_values=project.decision_values,
        ai_customization_notes=project.ai_customization_notes,
        started_at=project.started_at,
        completed_at=project.completed_at,
        created_at=project.created_at,
        updated_at=project.updated_at,
        progress=TaskStatus(**progress)
    )


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get all projects for the current user."""
    service = MonetizationProjectService(db)
    
    projects = await service.get_user_projects(
        user_id=current_user.id,
        status=status
    )
    
    project_items = []
    for p in projects:
        progress = await service.get_project_progress(p.id)
        project_items.append(ProjectListItem(
            id=p.id,
            template_id=p.template_id,
            title=p.title,
            status=p.status,
            progress=TaskStatus(**progress),
            started_at=p.started_at,
            updated_at=p.updated_at
        ))
    
    return ProjectListResponse(
        projects=project_items,
        total=len(project_items)
    )


@router.get("/projects/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get full details of a specific project."""
    service = MonetizationProjectService(db)
    
    project = await service.get_project_by_id(project_id, current_user.id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    progress = await service.get_project_progress(project.id)
    
    # Get template info
    template_item = None
    if project.template:
        t = project.template
        template_item = TemplateListItem(
            id=t.id,
            category=t.category,
            subcategory=t.subcategory,
            title=t.title,
            description=t.description,
            revenue_model=t.revenue_model,
            expected_timeline=t.expected_timeline,
            expected_revenue_range=RevenueRange(**t.expected_revenue_range) if t.expected_revenue_range else RevenueRange(low=0, high=0, unit="per_month"),
            suitable_for=SuitableFor(**t.suitable_for) if t.suitable_for else SuitableFor(min_followers=0, niches=[], platforms=[])
        )
    
    return ProjectDetail(
        id=project.id,
        user_id=project.user_id,
        template_id=project.template_id,
        title=project.title,
        status=project.status,
        customized_plan=project.customized_plan,
        decision_values=project.decision_values,
        ai_customization_notes=project.ai_customization_notes,
        started_at=project.started_at,
        completed_at=project.completed_at,
        created_at=project.created_at,
        updated_at=project.updated_at,
        progress=TaskStatus(**progress),
        template=template_item
    )


@router.patch("/projects/{project_id}", response_model=ProjectDetail)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Update a project's title, status, or decision values."""
    service = MonetizationProjectService(db)
    
    project = await service.update_project(
        project_id=project_id,
        user_id=current_user.id,
        title=data.title,
        status=data.status,
        decision_values=data.decision_values
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    progress = await service.get_project_progress(project.id)
    
    return ProjectDetail(
        id=project.id,
        user_id=project.user_id,
        template_id=project.template_id,
        title=project.title,
        status=project.status,
        customized_plan=project.customized_plan,
        decision_values=project.decision_values,
        ai_customization_notes=project.ai_customization_notes,
        started_at=project.started_at,
        completed_at=project.completed_at,
        created_at=project.created_at,
        updated_at=project.updated_at,
        progress=TaskStatus(**progress)
    )


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a project and all its tasks."""
    service = MonetizationProjectService(db)
    
    success = await service.delete_project(project_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"success": True, "message": "Project deleted"}


# ==================== Task Endpoints ====================

@router.get("/projects/{project_id}/tasks", response_model=TasksByStatus)
async def get_project_tasks(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all tasks for a project, grouped by status.
    
    Returns tasks organized for Kanban board display:
    - todo: Tasks not yet started
    - in_progress: Tasks currently being worked on
    - done: Completed tasks
    """
    service = MonetizationTaskService(db)
    
    tasks_by_status = await service.get_tasks_by_status(project_id, current_user.id)
    
    def task_to_base(t: MonetizationTask) -> TaskBase:
        return TaskBase(
            id=t.id,
            project_id=t.project_id,
            phase=t.phase,
            phase_name=t.phase_name,
            task_id=t.task_id,
            title=t.title,
            description=t.description,
            status=t.status,
            estimated_hours=float(t.estimated_hours) if t.estimated_hours else None,
            sort_order=t.sort_order,
            depends_on_decisions=t.depends_on_decisions,
            completed_at=t.completed_at,
            notes=t.notes,
            created_at=t.created_at,
            updated_at=t.updated_at
        )
    
    return TasksByStatus(
        todo=[task_to_base(t) for t in tasks_by_status["todo"]],
        in_progress=[task_to_base(t) for t in tasks_by_status["in_progress"]],
        done=[task_to_base(t) for t in tasks_by_status["done"]]
    )


@router.patch("/tasks/{task_id}", response_model=TaskBase)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Update a task's status, notes, or sort order."""
    service = MonetizationTaskService(db)
    
    task = await service.update_task(
        task_id=task_id,
        user_id=current_user.id,
        status=data.status,
        notes=data.notes,
        sort_order=data.sort_order
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskBase(
        id=task.id,
        project_id=task.project_id,
        phase=task.phase,
        phase_name=task.phase_name,
        task_id=task.task_id,
        title=task.title,
        description=task.description,
        status=task.status,
        estimated_hours=float(task.estimated_hours) if task.estimated_hours else None,
        sort_order=task.sort_order,
        depends_on_decisions=task.depends_on_decisions,
        completed_at=task.completed_at,
        notes=task.notes,
        created_at=task.created_at,
        updated_at=task.updated_at
    )


@router.post("/tasks/{task_id}/reorder", response_model=TaskBase)
async def reorder_task(
    task_id: UUID,
    data: TaskReorder,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Move a task to a new status and position.
    
    Used for Kanban drag-and-drop functionality.
    """
    service = MonetizationTaskService(db)
    
    task = await service.reorder_task(
        task_id=task_id,
        user_id=current_user.id,
        new_status=data.new_status,
        new_sort_order=data.new_sort_order
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskBase(
        id=task.id,
        project_id=task.project_id,
        phase=task.phase,
        phase_name=task.phase_name,
        task_id=task.task_id,
        title=task.title,
        description=task.description,
        status=task.status,
        estimated_hours=float(task.estimated_hours) if task.estimated_hours else None,
        sort_order=task.sort_order,
        depends_on_decisions=task.depends_on_decisions,
        completed_at=task.completed_at,
        notes=task.notes,
        created_at=task.created_at,
        updated_at=task.updated_at
    )
