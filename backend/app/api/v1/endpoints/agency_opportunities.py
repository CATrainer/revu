"""
Agency opportunity management endpoints.

Handles CRUD operations for sponsorship opportunities from the agency perspective.
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
    AgencyOpportunityCreate,
    AgencyOpportunityUpdate,
    AgencyOpportunityResponse,
    AgencyOpportunityListResponse,
    OpportunityFilters,
)
from app.services.agency_service import AgencyService
from app.services.agency_opportunity_service import AgencyOpportunityService
from app.tasks.email import send_opportunity_notification

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


async def require_agency_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require that the current user is an agency user."""
    if current_user.account_type != "agency":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency account required",
        )
    return current_user


async def get_user_agency_id(
    current_user: User = Depends(require_agency_user),
    agency_service: AgencyService = Depends(get_agency_service),
) -> UUID:
    """Get the agency ID for the current agency user."""
    membership = await agency_service.get_user_agency_membership(current_user.id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agency found for user",
        )
    return membership.agency_id


async def require_agency_admin(
    current_user: User = Depends(require_agency_user),
    agency_service: AgencyService = Depends(get_agency_service),
) -> tuple[User, UUID]:
    """Require that the current user is an agency admin (owner or admin role)."""
    membership = await agency_service.get_user_agency_membership(current_user.id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agency found for user",
        )

    if membership.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return current_user, membership.agency_id


# ============================================
# Opportunity CRUD Endpoints
# ============================================

@router.post("/", response_model=AgencyOpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    opportunity_data: AgencyOpportunityCreate,
    send_immediately: bool = Query(default=False),
    current_user: User = Depends(require_agency_user),
    agency_id: UUID = Depends(get_user_agency_id),
    agency_service: AgencyService = Depends(get_agency_service),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Create a new sponsorship opportunity.

    By default creates as draft. Set send_immediately=true to send right away.
    """
    # Verify creator belongs to this agency
    creator = await db.get(User, opportunity_data.creator_id)
    if not creator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator not found",
        )

    if creator.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Creator is not part of your agency",
        )

    # Create opportunity
    opportunity = await opportunity_service.create_opportunity(
        agency_id=agency_id,
        creator_id=opportunity_data.creator_id,
        created_by=current_user.id,
        title=opportunity_data.title,
        brand_name=opportunity_data.brand_name,
        description=opportunity_data.description,
        requirements=opportunity_data.requirements.model_dump() if opportunity_data.requirements else {},
        compensation=opportunity_data.compensation.model_dump() if opportunity_data.compensation else {},
        brand_logo_url=opportunity_data.brand_logo_url,
        deadline=opportunity_data.deadline,
        content_deadline=opportunity_data.content_deadline,
        send_immediately=send_immediately,
    )

    # Send notification if sent immediately
    if send_immediately:
        try:
            agency = await agency_service.get_by_id(agency_id)
            send_opportunity_notification.delay(
                creator_email=creator.email,
                creator_name=creator.full_name or "Creator",
                agency_name=agency.name,
                opportunity_title=opportunity.title,
                brand_name=opportunity.brand_name,
            )
        except Exception as e:
            logger.error(f"Failed to send opportunity notification: {e}")

    return AgencyOpportunityResponse(
        id=opportunity.id,
        agency_id=opportunity.agency_id,
        creator_id=opportunity.creator_id,
        created_by=opportunity.created_by,
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
        creator_response_at=opportunity.creator_response_at,
        creator_notes=opportunity.creator_notes,
        project_id=opportunity.project_id,
        created_at=opportunity.created_at,
        updated_at=opportunity.updated_at,
        creator_email=creator.email,
        creator_full_name=creator.full_name,
    )


@router.get("/", response_model=List[AgencyOpportunityListResponse])
async def list_opportunities(
    opportunity_status: Optional[str] = Query(None, alias="status"),
    creator_id: Optional[UUID] = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    agency_id: UUID = Depends(get_user_agency_id),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    List all opportunities for the agency.
    """
    opportunities = await opportunity_service.get_by_agency(
        agency_id=agency_id,
        status=opportunity_status,
        creator_id=creator_id,
        limit=limit,
        offset=offset,
    )

    return [
        AgencyOpportunityListResponse(
            id=opp.id,
            creator_id=opp.creator_id,
            title=opp.title,
            brand_name=opp.brand_name,
            status=opp.status,
            deadline=opp.deadline,
            sent_at=opp.sent_at,
            creator_full_name=opp.creator.full_name if opp.creator else None,
            created_at=opp.created_at,
        )
        for opp in opportunities
    ]


@router.get("/stats")
async def get_opportunity_stats(
    agency_id: UUID = Depends(get_user_agency_id),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    Get opportunity statistics for the agency.
    """
    stats = await opportunity_service.get_agency_stats(agency_id)
    return stats


@router.get("/{opportunity_id}", response_model=AgencyOpportunityResponse)
async def get_opportunity(
    opportunity_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    Get a specific opportunity by ID.
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    return AgencyOpportunityResponse(
        id=opportunity.id,
        agency_id=opportunity.agency_id,
        creator_id=opportunity.creator_id,
        created_by=opportunity.created_by,
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
        creator_response_at=opportunity.creator_response_at,
        creator_notes=opportunity.creator_notes,
        project_id=opportunity.project_id,
        created_at=opportunity.created_at,
        updated_at=opportunity.updated_at,
        creator_email=opportunity.creator.email if opportunity.creator else None,
        creator_full_name=opportunity.creator.full_name if opportunity.creator else None,
    )


@router.patch("/{opportunity_id}", response_model=AgencyOpportunityResponse)
async def update_opportunity(
    opportunity_id: UUID,
    updates: AgencyOpportunityUpdate,
    agency_id: UUID = Depends(get_user_agency_id),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    Update an opportunity (only drafts can be fully edited).
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    if opportunity.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft opportunities can be edited",
        )

    update_data = updates.model_dump(exclude_unset=True)
    if "requirements" in update_data and update_data["requirements"]:
        update_data["requirements"] = update_data["requirements"].model_dump() if hasattr(update_data["requirements"], "model_dump") else update_data["requirements"]
    if "compensation" in update_data and update_data["compensation"]:
        update_data["compensation"] = update_data["compensation"].model_dump() if hasattr(update_data["compensation"], "model_dump") else update_data["compensation"]

    updated = await opportunity_service.update_opportunity(opportunity_id, **update_data)

    return AgencyOpportunityResponse(
        id=updated.id,
        agency_id=updated.agency_id,
        creator_id=updated.creator_id,
        created_by=updated.created_by,
        title=updated.title,
        brand_name=updated.brand_name,
        brand_logo_url=updated.brand_logo_url,
        description=updated.description,
        requirements=updated.requirements,
        compensation=updated.compensation,
        deadline=updated.deadline,
        content_deadline=updated.content_deadline,
        status=updated.status,
        sent_at=updated.sent_at,
        viewed_at=updated.viewed_at,
        creator_response_at=updated.creator_response_at,
        creator_notes=updated.creator_notes,
        project_id=updated.project_id,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        creator_email=updated.creator.email if updated.creator else None,
        creator_full_name=updated.creator.full_name if updated.creator else None,
    )


@router.delete("/{opportunity_id}")
async def delete_opportunity(
    opportunity_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    Delete a draft opportunity.
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    success = await opportunity_service.delete_opportunity(opportunity_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft opportunities can be deleted",
        )

    return {"message": "Opportunity deleted"}


# ============================================
# Opportunity Actions
# ============================================

@router.post("/{opportunity_id}/send")
async def send_opportunity(
    opportunity_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    agency_service: AgencyService = Depends(get_agency_service),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Send a draft opportunity to the creator.
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    if opportunity.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft opportunities can be sent",
        )

    sent = await opportunity_service.send_opportunity(opportunity_id)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send opportunity",
        )

    # Send notification to creator
    try:
        creator = await db.get(User, opportunity.creator_id)
        agency = await agency_service.get_by_id(agency_id)
        if creator and agency:
            send_opportunity_notification.delay(
                creator_email=creator.email,
                creator_name=creator.full_name or "Creator",
                agency_name=agency.name,
                opportunity_title=opportunity.title,
                brand_name=opportunity.brand_name,
            )
    except Exception as e:
        logger.error(f"Failed to send opportunity notification: {e}")

    return {"message": "Opportunity sent to creator"}


@router.post("/{opportunity_id}/cancel")
async def cancel_opportunity(
    opportunity_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    Cancel an opportunity.
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    cancelled = await opportunity_service.cancel_opportunity(opportunity_id)
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel this opportunity",
        )

    return {"message": "Opportunity cancelled"}


@router.post("/{opportunity_id}/complete")
async def complete_opportunity(
    opportunity_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    opportunity_service: AgencyOpportunityService = Depends(get_opportunity_service),
) -> Any:
    """
    Mark an accepted opportunity as completed.
    """
    opportunity = await opportunity_service.get_by_id(opportunity_id)
    if not opportunity or opportunity.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    if opportunity.status != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only accepted opportunities can be marked as completed",
        )

    completed = await opportunity_service.complete_opportunity(opportunity_id)
    if not completed:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete opportunity",
        )

    return {"message": "Opportunity marked as completed"}
