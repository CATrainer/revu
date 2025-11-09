"""API endpoints for AI-powered monetization discovery system."""

import asyncio
import uuid
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from loguru import logger

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.monetization import (
    CreatorProfile, ActiveProject, ContentAnalysis,
    GeneratedOpportunities, OpportunityTemplate, ProjectChatMessage
)
from app.services.content_analyzer import ContentAnalyzer
from app.services.opportunity_generator import OpportunityGenerator
from app.services.adaptive_planner import AdaptivePlanner
from app.services.monetization_ai import get_ai_service
from sqlalchemy import select, desc

router = APIRouter(prefix="/monetization/discover", tags=["monetization-discovery"])


# ===== REQUEST/RESPONSE MODELS =====

class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: str  # "analyzing", "generating", "complete", "error"
    progress: int  # 0-100
    current_step: Optional[str] = None
    error: Optional[str] = None


class RefineRequest(BaseModel):
    message: str


class SelectRequest(BaseModel):
    opportunity_id: str


class AdaptRequest(BaseModel):
    trigger_type: str
    trigger_content: str


# ===== IN-MEMORY STATE TRACKING =====
# For MVP, use in-memory dict. In production, use Redis
analysis_status_cache: Dict[str, Dict] = {}


# ===== DISCOVERY ENDPOINTS =====

@router.post("/analyze")
async def start_analysis(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Trigger background analysis of creator's content.

    Returns immediately with analysis_id.
    Client polls /analyze/status to check progress.
    """

    # Check if analysis already in progress
    user_id_str = str(current_user.id)

    for aid, status in analysis_status_cache.items():
        if status.get('user_id') == user_id_str and status.get('status') in ['analyzing', 'generating']:
            return {"analysis_id": aid, "status": "in_progress"}

    # Start analysis in background
    analysis_id = f"analysis-{uuid.uuid4().hex[:12]}"

    # Initialize status
    analysis_status_cache[analysis_id] = {
        "user_id": user_id_str,
        "status": "analyzing",
        "progress": 0,
        "current_step": "Starting analysis..."
    }

    # Run in background
    background_tasks.add_task(
        run_analysis_pipeline,
        user_id_str,
        analysis_id,
        db
    )

    return {"analysis_id": analysis_id, "status": "started"}


@router.get("/analyze/status/{analysis_id}")
async def check_analysis_status(
    analysis_id: str,
    current_user: User = Depends(get_current_user)
):
    """Check status of ongoing analysis."""

    status = analysis_status_cache.get(analysis_id)

    if not status:
        raise HTTPException(404, "Analysis not found")

    # Verify ownership
    if status.get('user_id') != str(current_user.id):
        raise HTTPException(403, "Not authorized")

    return AnalysisStatusResponse(
        analysis_id=analysis_id,
        status=status.get('status', 'unknown'),
        progress=status.get('progress', 0),
        current_step=status.get('current_step'),
        error=status.get('error')
    )


@router.get("/opportunities")
async def get_opportunities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get generated opportunities for user.

    Returns most recent generation, or triggers new one if stale.
    """

    # Check for creator profile
    result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(400, {
            "error": "profile_required",
            "message": "Please complete your creator profile first"
        })

    # Get most recent generation
    result = await db.execute(
        select(GeneratedOpportunities)
        .where(GeneratedOpportunities.user_id == current_user.id)
        .order_by(desc(GeneratedOpportunities.generated_at))
        .limit(1)
    )
    generation = result.scalar_one_or_none()

    if not generation:
        return {"status": "needs_analysis", "redirect": "/api/v1/monetization/discover/analyze"}

    # Check if stale (more than 30 days old)
    if (datetime.utcnow() - generation.generated_at).days > 30:
        return {"status": "needs_analysis", "redirect": "/api/v1/monetization/discover/analyze"}

    return {
        "opportunities": generation.opportunities,
        "generated_at": generation.generated_at.isoformat()
    }


@router.post("/refine")
async def refine_opportunities(
    request: RefineRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    User provides feedback, AI regenerates opportunities.

    Example: "Can I do community without courses? Seems like too much work"
    """

    # Get current opportunities
    result = await db.execute(
        select(GeneratedOpportunities)
        .where(GeneratedOpportunities.user_id == current_user.id)
        .order_by(desc(GeneratedOpportunities.generated_at))
        .limit(1)
    )
    generation = result.scalar_one_or_none()

    if not generation:
        raise HTTPException(404, "No opportunities found. Please run analysis first.")

    # Get profile
    result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(400, "Creator profile not found")

    # Get content analysis
    result = await db.execute(
        select(ContentAnalysis).where(ContentAnalysis.user_id == current_user.id)
    )
    content_analysis = result.scalar_one_or_none()

    if not content_analysis:
        raise HTTPException(400, "Content analysis not found. Please run analysis first.")

    # Convert to dicts
    profile_dict = {
        "primary_platform": profile.primary_platform,
        "follower_count": profile.follower_count,
        "engagement_rate": float(profile.engagement_rate),
        "niche": profile.niche,
        "time_available_hours_per_week": profile.time_available_hours_per_week
    }

    content_dict = {
        "top_topics": content_analysis.top_topics,
        "content_type_performance": content_analysis.content_type_performance,
        "audience_questions": content_analysis.audience_questions,
        "question_volume_per_week": content_analysis.question_volume_per_week,
        "repeat_engagers_count": content_analysis.repeat_engagers_count,
        "dm_volume_estimate": content_analysis.dm_volume_estimate,
        "growth_trajectory": content_analysis.growth_trajectory,
        "key_strengths": content_analysis.key_strengths
    }

    # Regenerate with user feedback
    generator = OpportunityGenerator(db)

    new_opportunities = await generator.generate_with_feedback(
        profile_dict,
        content_dict,
        generation.opportunities,
        request.message
    )

    return {
        "opportunities": new_opportunities,
        "message": "Updated opportunities based on your feedback"
    }


@router.post("/select")
async def select_opportunity(
    request: SelectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    User selects an opportunity to work on.

    Creates active_project with the custom-generated plan.
    """

    # Get the selected opportunity
    result = await db.execute(
        select(GeneratedOpportunities)
        .where(GeneratedOpportunities.user_id == current_user.id)
        .order_by(desc(GeneratedOpportunities.generated_at))
        .limit(1)
    )
    generation = result.scalar_one_or_none()

    if not generation:
        raise HTTPException(404, "No opportunities found")

    opportunity = next(
        (o for o in generation.opportunities if o.get('id') == request.opportunity_id),
        None
    )

    if not opportunity:
        raise HTTPException(404, "Opportunity not found")

    # Check if user already has active project
    result = await db.execute(
        select(ActiveProject).where(ActiveProject.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(400, {
            "error": "project_exists",
            "message": "You already have an active project"
        })

    # Create active_project
    project = ActiveProject(
        user_id=current_user.id,
        opportunity_id=opportunity.get('id'),
        opportunity_title=opportunity.get('title'),
        opportunity_category=opportunity.get('template_basis', ['unknown'])[0] if opportunity.get('template_basis') else 'unknown',
        customized_plan=opportunity.get('implementation_plan', {"phases": []}),
        opportunity_data=opportunity,
        is_custom_generated=True,
        generation_id=generation.id
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Generate welcome message
    ai_service = get_ai_service()

    profile_result = await db.execute(
        select(CreatorProfile).where(CreatorProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    if profile:
        profile_dict = {
            "primary_platform": profile.primary_platform,
            "follower_count": profile.follower_count,
            "engagement_rate": float(profile.engagement_rate),
            "niche": profile.niche
        }

        welcome_result = await ai_service.generate_welcome_message(
            profile_dict,
            opportunity
        )

        # Store welcome message
        welcome_msg = ProjectChatMessage(
            project_id=project.id,
            role="assistant",
            content=welcome_result["content"],
            input_tokens=welcome_result.get("input_tokens", 0),
            output_tokens=welcome_result.get("output_tokens", 0)
        )

        db.add(welcome_msg)
        await db.commit()

    return {
        "project_id": str(project.id),
        "redirect_url": "/monetization/project"
    }


# ===== ADAPTATION ENDPOINTS =====

@router.post("/projects/{project_id}/adapt")
async def request_adaptation(
    project_id: str,
    request: AdaptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Request plan adaptation based on new signal.

    Called from chat when AI detects user wants to modify plan.
    """

    # Verify ownership
    result = await db.execute(
        select(ActiveProject).where(ActiveProject.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project or project.user_id != current_user.id:
        raise HTTPException(404, "Project not found")

    # Evaluate adaptation
    planner = AdaptivePlanner(db)

    adaptation = await planner.evaluate_adaptation(
        project_id,
        request.trigger_type,
        request.trigger_content
    )

    if not adaptation:
        return {
            "adapted": False,
            "message": "No changes needed based on this signal"
        }

    # Recalculate progress
    from app.models.monetization import ProjectTaskCompletion

    result = await db.execute(
        select(ProjectTaskCompletion).where(ProjectTaskCompletion.project_id == project_id)
    )
    completed_tasks = result.scalars().all()

    total_tasks = sum(
        len(phase.get('steps', []))
        for phase in project.customized_plan.get('phases', [])
    )

    new_progress = int((len(completed_tasks) / total_tasks * 100)) if total_tasks > 0 else 0

    return {
        "adapted": True,
        "modifications": adaptation['modifications'],
        "user_message": adaptation['user_message'],
        "updated_progress": new_progress
    }


# ===== HELPER FUNCTIONS =====

async def run_analysis_pipeline(user_id: str, analysis_id: str, db: AsyncSession):
    """
    Background task that runs the full analysis pipeline.

    1. Analyze content
    2. Generate opportunities
    3. Mark complete
    """

    try:
        # Update status: analyzing
        analysis_status_cache[analysis_id] = {
            "user_id": user_id,
            "status": "analyzing",
            "progress": 25,
            "current_step": "Analyzing your content and audience..."
        }

        # Analyze content
        analyzer = ContentAnalyzer(db)
        content_analysis = await analyzer.analyze_creator(user_id)

        # Update status: generating
        analysis_status_cache[analysis_id] = {
            "user_id": user_id,
            "status": "generating",
            "progress": 60,
            "current_step": "Generating personalized opportunities..."
        }

        # Get profile
        result = await db.execute(
            select(CreatorProfile).where(CreatorProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            raise ValueError("Creator profile not found")

        profile_dict = {
            "primary_platform": profile.primary_platform,
            "follower_count": profile.follower_count,
            "engagement_rate": float(profile.engagement_rate),
            "niche": profile.niche,
            "time_available_hours_per_week": profile.time_available_hours_per_week,
            "content_frequency": profile.content_frequency
        }

        # Generate opportunities
        generator = OpportunityGenerator(db)

        opportunities = await generator.generate_opportunities(
            user_id,
            profile_dict,
            content_analysis
        )

        # Update status: complete
        analysis_status_cache[analysis_id] = {
            "user_id": user_id,
            "status": "complete",
            "progress": 100,
            "current_step": "Analysis complete!"
        }

        logger.info(f"Analysis pipeline completed for user {user_id}")

    except Exception as e:
        logger.error(f"Error in analysis pipeline: {e}")
        analysis_status_cache[analysis_id] = {
            "user_id": user_id,
            "status": "error",
            "progress": 0,
            "error": str(e)
        }
