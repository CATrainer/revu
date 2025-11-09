"""Monetization engine API endpoints."""

import json
import os
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from loguru import logger

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.monetization import (
    CreatorProfile,
    ActiveProject,
    ProjectChatMessage,
    ProjectTaskCompletion,
    ProjectDecision
)
from app.models.youtube import YouTubeConnection
from app.models.instagram import InstagramConnection
from app.services.monetization_ai import get_ai_service
from app.services.action_detector import get_action_detector
from app.services.rate_limiter import RateLimiter


router = APIRouter()


# ==================== Request/Response Models ====================

class CreateProfileRequest(BaseModel):
    primary_platform: str = Field(..., description="youtube, instagram, tiktok, twitch")
    follower_count: int = Field(..., ge=0)
    engagement_rate: float = Field(..., ge=0, le=100)
    niche: str
    platform_url: Optional[str] = None
    avg_content_views: Optional[int] = None
    content_frequency: Optional[int] = None
    time_available_hours_per_week: Optional[int] = None


class CreateProjectRequest(BaseModel):
    opportunity_id: str = "premium-community"


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ToggleTaskRequest(BaseModel):
    completed: bool
    notes: Optional[str] = None


class UpdateProjectRequest(BaseModel):
    target_launch_date: Optional[date] = None
    status: Optional[str] = None  # 'active', 'completed', 'abandoned'


# ==================== Helper Functions ====================

def _load_opportunity_template() -> Dict[str, Any]:
    """Load premium community template."""
    template_path = os.path.join(
        os.path.dirname(__file__),
        "../../../data/premium_community_template.json"
    )
    
    try:
        with open(template_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load opportunity template: {e}")
        raise HTTPException(500, "Failed to load opportunity template")


async def _calculate_progress(project: ActiveProject, db: AsyncSession) -> Dict[str, int]:
    """Calculate project progress metrics."""
    
    # Count current decisions (not superseded)
    decisions_result = await db.execute(
        select(func.count(ProjectDecision.id))
        .where(
            ProjectDecision.project_id == project.id,
            ProjectDecision.is_current == True
        )
    )
    decisions_count = decisions_result.scalar() or 0
    
    # Count completed tasks
    tasks_result = await db.execute(
        select(func.count(ProjectTaskCompletion.id))
        .where(ProjectTaskCompletion.project_id == project.id)
    )
    tasks_count = tasks_result.scalar() or 0
    
    # Calculate planning progress (5 key decisions)
    planning_progress = min(100, (decisions_count * 20))
    
    # Calculate execution progress (22 total tasks)
    execution_progress = min(100, int((tasks_count / 22) * 100))
    
    # Calculate timeline progress if target date exists
    timeline_progress = None
    if project.target_launch_date:
        days_since_start = (datetime.utcnow().date() - project.started_at.date()).days
        days_until_launch = (project.target_launch_date - datetime.utcnow().date()).days
        total_days = (project.target_launch_date - project.started_at.date()).days
        
        if total_days > 0:
            timeline_progress = min(100, int((days_since_start / total_days) * 100))
    
    # Calculate overall progress (weighted average)
    overall_progress = int((planning_progress * 0.3) + (execution_progress * 0.7))
    
    return {
        "overall_progress": overall_progress,
        "planning_progress": planning_progress,
        "execution_progress": execution_progress,
        "timeline_progress": timeline_progress
    }


# ==================== Endpoints ====================

@router.get("/profile/auto-detect")
async def auto_detect_profile(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Auto-detect profile data from connected platforms or demo mode.
    Returns pre-filled profile data and list of missing required fields.
    """
    
    # Check if user is in demo mode
    is_demo = current_user.demo_mode if hasattr(current_user, 'demo_mode') else False
    
    profile_data = {
        "primary_platform": None,
        "follower_count": None,
        "engagement_rate": None,
        "niche": None,
        "platform_url": None,
        "avg_content_views": None,
        "content_frequency": None,
        "time_available_hours_per_week": None
    }
    
    data_source = None
    missing_fields = []
    
    if is_demo:
        # Use demo data
        profile_data = {
            "primary_platform": "youtube",
            "follower_count": 100000,
            "engagement_rate": 6.5,
            "niche": "Tech Reviews",
            "platform_url": "https://youtube.com/@democreator",
            "avg_content_views": 50000,
            "content_frequency": 3,
            "time_available_hours_per_week": 10
        }
        data_source = "demo"
    else:
        # Check for real platform connections
        # Try YouTube first
        yt_result = await db.execute(
            select(YouTubeConnection)
            .where(
                YouTubeConnection.user_id == current_user.id,
                YouTubeConnection.connection_status == "active"
            )
            .order_by(YouTubeConnection.last_synced_at.desc())
        )
        yt_connection = yt_result.scalar_one_or_none()
        
        if yt_connection:
            profile_data["primary_platform"] = "youtube"
            profile_data["follower_count"] = yt_connection.subscriber_count
            profile_data["engagement_rate"] = float(yt_connection.engagement_rate) if yt_connection.engagement_rate else None
            profile_data["platform_url"] = f"https://youtube.com/channel/{yt_connection.channel_id}" if yt_connection.channel_id else None
            profile_data["avg_content_views"] = yt_connection.average_views_per_video
            data_source = "youtube"
        else:
            # Try Instagram
            ig_result = await db.execute(
                select(InstagramConnection)
                .where(
                    InstagramConnection.user_id == current_user.id,
                    InstagramConnection.connection_status == "active"
                )
                .order_by(InstagramConnection.last_synced_at.desc())
            )
            ig_connection = ig_result.scalar_one_or_none()
            
            if ig_connection:
                profile_data["primary_platform"] = "instagram"
                profile_data["follower_count"] = ig_connection.follower_count
                profile_data["platform_url"] = f"https://instagram.com/{ig_connection.username}" if ig_connection.username else None
                data_source = "instagram"
    
    # Determine missing required fields
    required_fields = ["primary_platform", "follower_count", "engagement_rate", "niche"]
    for field in required_fields:
        if profile_data.get(field) is None:
            missing_fields.append(field)
    
    return {
        "data_source": data_source,
        "is_demo": is_demo,
        "profile_data": profile_data,
        "missing_fields": missing_fields,
        "can_auto_create": len(missing_fields) == 0
    }


@router.post("/profile")
async def create_or_update_profile(
    data: CreateProfileRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Create or update creator profile."""
    
    # Check if profile exists
    result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if profile:
        # Update existing
        profile.primary_platform = data.primary_platform
        profile.follower_count = data.follower_count
        profile.engagement_rate = data.engagement_rate
        profile.niche = data.niche
        profile.platform_url = data.platform_url
        profile.avg_content_views = data.avg_content_views
        profile.content_frequency = data.content_frequency
        profile.time_available_hours_per_week = data.time_available_hours_per_week
        profile.updated_at = datetime.utcnow()
    else:
        # Create new
        profile = CreatorProfile(
            user_id=current_user.id,
            **data.dict()
        )
        db.add(profile)
    
    await db.commit()
    await db.refresh(profile)
    
    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id),
        **data.dict()
    }


@router.get("/profile")
async def get_profile(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get creator profile."""
    
    result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id),
        "primary_platform": profile.primary_platform,
        "follower_count": profile.follower_count,
        "engagement_rate": float(profile.engagement_rate),
        "niche": profile.niche,
        "platform_url": profile.platform_url,
        "avg_content_views": profile.avg_content_views,
        "content_frequency": profile.content_frequency,
        "time_available_hours_per_week": profile.time_available_hours_per_week,
        "created_at": profile.created_at.isoformat(),
        "updated_at": profile.updated_at.isoformat()
    }


@router.post("/projects")
async def create_project(
    data: CreateProjectRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Create new monetization project (one per user)."""
    
    # Check if user already has an active project
    result = await db.execute(
        select(ActiveProject).where(ActiveProject.user_id == current_user.id)
    )
    existing_project = result.scalar_one_or_none()
    
    if existing_project:
        raise HTTPException(
            400,
            f"You already have an active project. Complete or abandon it before starting a new one."
        )
    
    # Load opportunity template
    template = _load_opportunity_template()
    
    # Create project
    project = ActiveProject(
        user_id=current_user.id,
        opportunity_id=data.opportunity_id,
        opportunity_title=template['title'],
        opportunity_category=template['category'],
        customized_plan=template['implementation_phases']
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Generate welcome message
    profile_result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if profile:
        ai_service = get_ai_service()
        welcome = await ai_service.generate_welcome_message(
            creator_profile={
                "primary_platform": profile.primary_platform,
                "follower_count": profile.follower_count,
                "engagement_rate": float(profile.engagement_rate),
                "niche": profile.niche
            },
            opportunity_data=template
        )
        
        # Save welcome message
        welcome_msg = ProjectChatMessage(
            project_id=project.id,
            role="assistant",
            content=welcome['content'],
            input_tokens=welcome['input_tokens'],
            output_tokens=welcome['output_tokens']
        )
        db.add(welcome_msg)
        
        # Log usage
        await RateLimiter.log_usage(
            user_id=str(current_user.id),
            project_id=str(project.id),
            input_tokens=welcome['input_tokens'],
            output_tokens=welcome['output_tokens'],
            endpoint="welcome",
            db=db
        )
        
        await db.commit()
    
    return {
        "project_id": str(project.id),
        "redirect_url": f"/monetization/project/{project.id}"
    }


@router.get("/projects/active")
async def get_active_project(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's active project with full details."""
    
    result = await db.execute(
        select(ActiveProject)
        .options(
            selectinload(ActiveProject.chat_messages),
            selectinload(ActiveProject.task_completions),
            selectinload(ActiveProject.decisions)
        )
        .where(ActiveProject.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "No active project found")
    
    # Calculate progress
    progress = await _calculate_progress(project, db)
    
    # Update project with calculated progress
    project.overall_progress = progress['overall_progress']
    project.planning_progress = progress['planning_progress']
    project.execution_progress = progress['execution_progress']
    project.timeline_progress = progress['timeline_progress']
    await db.commit()
    
    # Get current decisions
    decisions = [
        {
            "id": str(d.id),
            "category": d.decision_category,
            "value": d.decision_value,
            "rationale": d.rationale,
            "confidence": d.confidence,
            "decided_at": d.decided_at.isoformat()
        }
        for d in project.decisions if d.is_current
    ]
    
    # Get completed tasks
    completed_tasks = [
        {
            "id": str(t.id),
            "task_id": t.task_id,
            "task_title": t.task_title,
            "completed_at": t.completed_at.isoformat(),
            "completed_via": t.completed_via,
            "notes": t.notes
        }
        for t in project.task_completions
    ]
    
    return {
        "id": str(project.id),
        "opportunity_id": project.opportunity_id,
        "opportunity_title": project.opportunity_title,
        "status": project.status,
        "current_phase_index": project.current_phase_index,
        "overall_progress": project.overall_progress,
        "planning_progress": project.planning_progress,
        "execution_progress": project.execution_progress,
        "timeline_progress": project.timeline_progress,
        "started_at": project.started_at.isoformat(),
        "target_launch_date": project.target_launch_date.isoformat() if project.target_launch_date else None,
        "last_activity_at": project.last_activity_at.isoformat(),
        "customized_plan": project.customized_plan,
        "decisions": decisions,
        "completed_tasks": completed_tasks,
        "message_count": len(project.chat_messages)
    }


@router.get("/projects/{project_id}/messages")
async def get_project_messages(
    project_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get chat messages for a project."""
    
    # Verify project ownership
    project_result = await db.execute(
        select(ActiveProject).where(
            ActiveProject.id == project_id,
            ActiveProject.user_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Get messages
    messages_result = await db.execute(
        select(ProjectChatMessage)
        .where(ProjectChatMessage.project_id == project_id)
        .order_by(ProjectChatMessage.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = messages_result.scalars().all()
    
    return {
        "messages": [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "detected_actions": m.detected_actions
            }
            for m in messages
        ],
        "total": len(messages),
        "has_more": len(messages) == limit
    }


@router.post("/projects/{project_id}/messages")
async def send_message(
    project_id: UUID,
    data: SendMessageRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Send message and get streaming AI response."""
    
    # Verify project ownership
    project_result = await db.execute(
        select(ActiveProject)
        .options(
            selectinload(ActiveProject.decisions),
            selectinload(ActiveProject.task_completions)
        )
        .where(
            ActiveProject.id == project_id,
            ActiveProject.user_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Check rate limit
    await RateLimiter.check_rate_limit(str(current_user.id), db)
    
    # Save user message
    user_msg = ProjectChatMessage(
        project_id=project.id,
        role="user",
        content=data.message
    )
    db.add(user_msg)
    await db.commit()
    
    # Get conversation history (last 20 messages)
    history_result = await db.execute(
        select(ProjectChatMessage)
        .where(ProjectChatMessage.project_id == project_id)
        .order_by(ProjectChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed(history_result.scalars().all()))
    
    # Build messages for Claude
    messages = [
        {"role": m.role, "content": m.content}
        for m in history
    ]
    
    # Get creator profile
    profile_result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    
    creator_profile = None
    if profile:
        creator_profile = {
            "primary_platform": profile.primary_platform,
            "follower_count": profile.follower_count,
            "engagement_rate": float(profile.engagement_rate),
            "niche": profile.niche,
            "time_available_hours_per_week": profile.time_available_hours_per_week
        }
    
    # Build project context
    project_context = {
        "decisions": [
            {"category": d.decision_category, "value": d.decision_value}
            for d in project.decisions if d.is_current
        ],
        "completed_tasks": [t.task_id for t in project.task_completions]
    }
    
    # Stream response
    async def event_stream():
        """Generate SSE stream."""
        ai_service = get_ai_service()
        action_detector = get_action_detector()
        
        full_response = ""
        input_tokens = 0
        output_tokens = 0
        
        try:
            async for chunk in ai_service.stream_chat_response(
                messages=messages,
                creator_profile=creator_profile,
                project_context=project_context
            ):
                if chunk["type"] == "content":
                    full_response += chunk["delta"]
                    yield f"data: {json.dumps({'type': 'content', 'delta': chunk['delta']})}\n\n"
                
                elif chunk["type"] == "usage":
                    input_tokens = chunk["input_tokens"]
                    output_tokens = chunk["output_tokens"]
                
                elif chunk["type"] == "error":
                    yield f"data: {json.dumps({'type': 'error', 'message': chunk['message']})}\n\n"
                    return
            
            # Save assistant message
            assistant_msg = ProjectChatMessage(
                project_id=project.id,
                role="assistant",
                content=full_response,
                input_tokens=input_tokens,
                output_tokens=output_tokens
            )
            db.add(assistant_msg)
            
            # Detect actions
            actions = action_detector.detect_actions(
                user_message=data.message,
                ai_response=full_response,
                project_state=project_context
            )
            
            # Process detected actions
            for action in actions:
                if action["type"] == "decision_made":
                    decision_data = action["data"]
                    
                    # Check if decision already exists for this category
                    existing_result = await db.execute(
                        select(ProjectDecision).where(
                            ProjectDecision.project_id == project.id,
                            ProjectDecision.decision_category == decision_data['category'],
                            ProjectDecision.is_current == True
                        )
                    )
                    existing = existing_result.scalar_one_or_none()
                    
                    if existing:
                        # Supersede old decision
                        existing.is_current = False
                    
                    # Create new decision
                    decision = ProjectDecision(
                        project_id=project.id,
                        decision_category=decision_data['category'],
                        decision_value=decision_data['value'],
                        rationale=decision_data.get('rationale'),
                        confidence=decision_data['confidence'],
                        related_message_id=assistant_msg.id,
                        superseded_by=None if not existing else None
                    )
                    db.add(decision)
            
            assistant_msg.detected_actions = actions
            
            # Update project activity
            project.last_activity_at = datetime.utcnow()
            
            # Log usage
            await RateLimiter.log_usage(
                user_id=str(current_user.id),
                project_id=str(project.id),
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                endpoint="chat",
                db=db
            )
            
            await db.commit()
            
            # Calculate updated progress
            progress = await _calculate_progress(project, db)
            
            # Send final event with actions and progress
            yield f"data: {json.dumps({'type': 'done', 'actions': actions, 'progress': progress})}\n\n"
        
        except Exception as e:
            logger.error(f"Error in chat stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/projects/{project_id}/tasks/{task_id}/toggle")
async def toggle_task(
    project_id: UUID,
    task_id: str,
    data: ToggleTaskRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle task completion status."""
    
    # Verify project ownership
    project_result = await db.execute(
        select(ActiveProject).where(
            ActiveProject.id == project_id,
            ActiveProject.user_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Check if task already completed
    existing_result = await db.execute(
        select(ProjectTaskCompletion).where(
            ProjectTaskCompletion.project_id == project_id,
            ProjectTaskCompletion.task_id == task_id
        )
    )
    existing = existing_result.scalar_one_or_none()
    
    if data.completed:
        if not existing:
            # Find task in plan
            task_title = "Unknown Task"
            for phase in project.customized_plan:
                for step in phase.get('steps', []):
                    if step.get('id') == task_id:
                        task_title = step.get('task', 'Unknown Task')
                        break
            
            # Create completion
            completion = ProjectTaskCompletion(
                project_id=project.id,
                task_id=task_id,
                task_title=task_title,
                completed_via="manual",
                notes=data.notes
            )
            db.add(completion)
    else:
        if existing:
            # Remove completion
            await db.delete(existing)
    
    # Update project activity
    project.last_activity_at = datetime.utcnow()
    
    await db.commit()
    
    # Calculate updated progress
    progress = await _calculate_progress(project, db)
    
    return {
        "success": True,
        "task_id": task_id,
        "completed": data.completed,
        "progress": progress
    }


@router.patch("/projects/{project_id}")
async def update_project(
    project_id: UUID,
    data: UpdateProjectRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Update project details."""
    
    # Verify project ownership
    project_result = await db.execute(
        select(ActiveProject).where(
            ActiveProject.id == project_id,
            ActiveProject.user_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "Project not found")
    
    if data.target_launch_date is not None:
        project.target_launch_date = data.target_launch_date
    
    if data.status is not None:
        if data.status not in ['active', 'completed', 'abandoned']:
            raise HTTPException(400, "Invalid status")
        
        project.status = data.status
        if data.status == 'completed':
            project.completed_at = datetime.utcnow()
    
    project.last_activity_at = datetime.utcnow()
    
    await db.commit()
    
    return {"success": True}


@router.delete("/profile/reset")
async def reset_monetization_profile(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Reset monetization setup - deletes profile and active project.
    Called when user disables demo mode or wants to start fresh.
    """
    
    # Delete creator profile (cascades to nothing)
    profile_result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile:
        await db.delete(profile)
    
    # Delete active project (cascades to messages, tasks, decisions)
    project_result = await db.execute(
        select(ActiveProject).where(ActiveProject.user_id == current_user.id)
    )
    project = project_result.scalar_one_or_none()
    if project:
        await db.delete(project)
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Monetization setup has been reset"
    }


@router.get("/admin/usage-stats")
async def get_usage_stats(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get AI usage statistics (admin only)."""
    
    if not current_user.is_admin:
        raise HTTPException(403, "Admin access required")
    
    daily_stats = await RateLimiter.check_daily_costs(db)
    
    return daily_stats
