"""
Creator-side opportunity endpoints.

Handles viewing and responding to sponsorship opportunities from the creator perspective.
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.agency_opportunity import (
    CreatorOpportunityResponse,
    CreatorOpportunityListResponse,
    OpportunityAcceptRequest,
    OpportunityDeclineRequest,
)
from app.services.agency_service import AgencyService
from app.services.agency_opportunity_service import AgencyOpportunityService
from app.tasks.email import send_opportunity_response_notification

router = APIRouter()


# ============================================
# Helper Functions
# ============================================

async def get_agency_service(db: AsyncSession = Depends(get_async_session)) -> AgencyService:
    """Get agency service instance."""
    return AgencyService(db)


async def get_opportunity_service(db: AsyncSession = Depends(get_async_session)) -> AgencyOpportunityService:
    """Get opportunity service instance."""
    return AgencyOpportunityService(db)


async def require_creator_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require that the current user is a creator."""
    if current_user.account_type != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Creator account required",
        )
    return current_user


# ============================================
# Opportunity List Endpoints
# ============================================

@router.get("/", response_model=List[CreatorOpportunityListResponse])
async def list_my_opportunities(
    opportunity_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_creator_user),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    List all opportunities sent to the current creator.
    """
    opportunities = await opportunity_service.get_by_creator(
        creator_id=current_user.id,
        status=opportunity_status,
        limit=limit,
        offset=offset,
    )

    return [
        CreatorOpportunityListResponse(
            id=opp.id,
            agency_name=opp.agency.name if opp.agency else "Unknown",
            title=opp.title,
            brand_name=opp.brand_name,
            status=opp.status,
            deadline=opp.deadline,
            sent_at=opp.sent_at,
        )
        for opp in opportunities
    ]


@router.get("/pending", response_model=List[CreatorOpportunityListResponse])
async def list_pending_opportunities(
    current_user: User = Depends(require_creator_user),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    List pending opportunities (sent or viewed, not yet responded).
    """
    opportunities = await opportunity_service.get_pending_for_creator(current_user.id)

    return [
        CreatorOpportunityListResponse(
            id=opp.id,
            agency_name=opp.agency.name if opp.agency else "Unknown",
            title=opp.title,
            brand_name=opp.brand_name,
            status=opp.status,
            deadline=opp.deadline,
            sent_at=opp.sent_at,
        )
        for opp in opportunities
    ]


@router.get("/count")
async def count_opportunities(
    current_user: User = Depends(require_creator_user),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    Get counts of opportunities by status.
    """
    pending_sent = await opportunity_service.count_by_creator(current_user.id, status="sent")
    pending_viewed = await opportunity_service.count_by_creator(current_user.id, status="viewed")
    accepted = await opportunity_service.count_by_creator(current_user.id, status="accepted")
    declined = await opportunity_service.count_by_creator(current_user.id, status="declined")
    completed = await opportunity_service.count_by_creator(current_user.id, status="completed")

    return {
        "pending": pending_sent + pending_viewed,
        "accepted": accepted,
        "declined": declined,
        "completed": completed,
        "total": pending_sent + pending_viewed + accepted + declined + completed,
    }


# ============================================
# Opportunity Detail Endpoints
# ============================================

@router.get("/{opportunity_id}", response_model=CreatorOpportunityResponse)
async def get_opportunity(
    opportunity_id: UUID,
    current_user: User = Depends(require_creator_user),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    Get a specific opportunity by ID.
    Automatically marks as viewed when accessed.
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    # Don't show drafts to creators
    if opportunity.status == "draft":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    # Mark as viewed if sent
    if opportunity.status == "sent":
        await opportunity_service.mark_as_viewed(opportunity_id)
        opportunity.status = "viewed"
        opportunity.viewed_at = datetime.utcnow()

    return CreatorOpportunityResponse(
        id=opportunity.id,
        agency_id=opportunity.agency_id,
        agency_name=opportunity.agency.name if opportunity.agency else "Unknown",
        agency_logo_url=opportunity.agency.logo_url if opportunity.agency else None,
        title=opportunity.title,
        brand_name=opportunity.brand_name,
        brand_logo_url=opportunity.brand_logo_url,
        description=opportunity.description,
        requirements=opportunity.requirements,
        compensation=opportunity.compensation,
        deadline=opportunity.deadline,
        content_deadline=opportunity.content_deadline,
        status=opportunity.status,
        sent_at=opportunity.sent_at,
        viewed_at=opportunity.viewed_at,
        project_id=opportunity.project_id,
        created_at=opportunity.created_at,
    )


# ============================================
# Opportunity Response Endpoints
# ============================================

@router.post("/{opportunity_id}/accept")
async def accept_opportunity(
    opportunity_id: UUID,
    accept_data: OpportunityAcceptRequest = None,
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Accept a sponsorship opportunity.
    This will create a monetization project for the opportunity.
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    if opportunity.status not in ["sent", "viewed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept opportunity with status '{opportunity.status}'",
        )

    # Accept the opportunity
    notes = accept_data.notes if accept_data else None
    accepted = await opportunity_service.accept_opportunity(opportunity_id, notes)

    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept opportunity",
        )

    # Create a monetization project
    try:
        from app.models.projects import ActiveProject

        project = ActiveProject(
            user_id=current_user.id,
            title=f"[Sponsored] {opportunity.title}",
            description=f"Sponsored content for {opportunity.brand_name}.\n\n{opportunity.description}",
            status="pending",
            project_type="sponsored_video",
            ai_metadata={
                "opportunity_id": str(opportunity_id),
                "brand_name": opportunity.brand_name,
                "requirements": opportunity.requirements,
                "compensation": opportunity.compensation,
                "content_deadline": opportunity.content_deadline.isoformat() if opportunity.content_deadline else None,
            },
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)

        # Link project to opportunity
        await opportunity_service.link_project(opportunity_id, project.id)

        logger.info(f"Created project {project.id} for opportunity {opportunity_id}")
    except Exception as e:
        logger.error(f"Failed to create project for opportunity: {e}")
        # Don't fail the accept - just log the error

    # Notify agency
    try:
        agency = await agency_service.get_by_id(opportunity.agency_id)
        if agency:
            owner = await db.get(User, agency.owner_id)
            if owner:
                send_opportunity_response_notification.delay(
                    agency_email=owner.email,
                    agency_name=agency.name,
                    creator_name=current_user.full_name or current_user.email,
                    opportunity_title=opportunity.title,
                    brand_name=opportunity.brand_name,
                    response="accepted",
                    notes=notes,
                )
    except Exception as e:
        logger.error(f"Failed to send accept notification: {e}")

    return {
        "message": "Opportunity accepted",
        "project_id": accepted.project_id,
    }


@router.post("/{opportunity_id}/decline")
async def decline_opportunity(
    opportunity_id: UUID,
    decline_data: OpportunityDeclineRequest = None,
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Decline a sponsorship opportunity.
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    if opportunity.status not in ["sent", "viewed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot decline opportunity with status '{opportunity.status}'",
        )

    # Decline the opportunity
    reason = decline_data.reason if decline_data else None
    declined = await opportunity_service.decline_opportunity(opportunity_id, reason)

    if not declined:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decline opportunity",
        )

    # Notify agency
    try:
        agency = await agency_service.get_by_id(opportunity.agency_id)
        if agency:
            owner = await db.get(User, agency.owner_id)
            if owner:
                send_opportunity_response_notification.delay(
                    agency_email=owner.email,
                    agency_name=agency.name,
                    creator_name=current_user.full_name or current_user.email,
                    opportunity_title=opportunity.title,
                    brand_name=opportunity.brand_name,
                    response="declined",
                    notes=reason,
                )
    except Exception as e:
        logger.error(f"Failed to send decline notification: {e}")

    return {"message": "Opportunity declined"}
