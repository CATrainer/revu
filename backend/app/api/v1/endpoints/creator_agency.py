"""
Creator-side agency endpoints.

Handles creator operations related to agencies: viewing agency info,
accepting invitations, requesting to join, and leaving agencies.
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.agency import Agency, AgencyMember, AgencyInvitation
from app.schemas.agency import (
    AgencyPublicResponse,
    CreatorAgencyResponse,
    PendingInvitationResponse,
    AgencyJoinRequest,
)
from app.services.agency_service import AgencyService
from app.tasks.email import send_join_request_notification, send_join_request_accepted_email

router = APIRouter()


# ============================================
# Helper Functions
# ============================================

async def get_agency_service(db: AsyncSession = Depends(get_async_session)) -> AgencyService:
    """Get agency service instance."""
    return AgencyService(db)


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
# Creator Agency Status Endpoints
# ============================================

@router.get("/current", response_model=Optional[CreatorAgencyResponse])
async def get_current_agency(
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Get the creator's current agency (if any).
    Returns null if creator is not part of any agency.
    """
    if not current_user.agency_id:
        return None

    agency = await agency_service.get_by_id(current_user.agency_id)
    if not agency:
        return None

    # Get membership details if exists
    membership = await agency_service.get_user_agency_membership(current_user.id)

    return CreatorAgencyResponse(
        agency_id=agency.id,
        agency_name=agency.name,
        agency_slug=agency.slug,
        agency_logo_url=agency.logo_url,
        role=membership.role if membership else "member",
        joined_at=membership.joined_at if membership else None,
    )


@router.delete("/leave")
async def leave_agency(
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Leave the current agency.
    Creator will be unlinked from the agency.
    """
    if not current_user.agency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not part of any agency",
        )

    agency = await agency_service.get_by_id(current_user.agency_id)
    agency_name = agency.name if agency else "Unknown"

    success = await agency_service.unlink_creator_from_agency(current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to leave agency",
        )

    logger.info(f"Creator {current_user.email} left agency {agency_name}")
    return {"message": f"You have left {agency_name}"}


# ============================================
# Invitation Endpoints (Creator Side)
# ============================================

@router.get("/invitations", response_model=List[PendingInvitationResponse])
async def get_pending_invitations(
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Get all pending agency invitations for the current creator.
    """
    invitations = await agency_service.get_pending_invitations_for_email(current_user.email)

    return [
        PendingInvitationResponse(
            id=inv.id,
            agency_id=inv.agency_id,
            agency_name=inv.agency.name if inv.agency else "Unknown",
            agency_logo_url=inv.agency.logo_url if inv.agency else None,
            invited_at=inv.created_at,
            expires_at=inv.expires_at,
        )
        for inv in invitations
    ]


@router.post("/invitations/{invitation_id}/accept")
async def accept_invitation(
    invitation_id: UUID,
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Accept an agency invitation.
    Creator will be linked to the agency.
    """
    # Check if creator is already in an agency
    if current_user.agency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already part of an agency. Leave your current agency first.",
        )

    # Get and validate invitation
    invitation = await agency_service.get_invitation_by_id(invitation_id)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Verify invitation is for this user
    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for you",
        )

    # Check if invitation is still valid
    if invitation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is {invitation.status}",
        )

    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    # Accept the invitation
    await agency_service.accept_invitation(invitation_id)

    # Link creator to agency
    await agency_service.link_creator_to_agency(current_user.id, invitation.agency_id)

    agency = await agency_service.get_by_id(invitation.agency_id)
    agency_name = agency.name if agency else "Unknown"

    logger.info(f"Creator {current_user.email} accepted invitation to join {agency_name}")
    return {"message": f"You have joined {agency_name}"}


@router.post("/invitations/{invitation_id}/decline")
async def decline_invitation(
    invitation_id: UUID,
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Decline an agency invitation.
    """
    invitation = await agency_service.get_invitation_by_id(invitation_id)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Verify invitation is for this user
    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for you",
        )

    if invitation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is already {invitation.status}",
        )

    # Cancel/decline the invitation
    await agency_service.cancel_invitation(invitation_id)

    return {"message": "Invitation declined"}


@router.get("/invitations/by-token")
async def get_invitation_by_token(
    token: str = Query(..., min_length=1),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Get invitation details by token.
    Used for the invitation acceptance page.
    This endpoint does not require authentication.
    """
    invitation = await agency_service.get_invitation_by_token(token)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or expired",
        )

    if invitation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is {invitation.status}",
        )

    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    return {
        "id": invitation.id,
        "email": invitation.email,
        "agency_id": invitation.agency_id,
        "agency_name": invitation.agency.name if invitation.agency else "Unknown",
        "agency_logo_url": invitation.agency.logo_url if invitation.agency else None,
        "expires_at": invitation.expires_at,
    }


@router.post("/invitations/accept-by-token")
async def accept_invitation_by_token(
    token: str = Query(..., min_length=1),
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Accept an invitation using the token.
    Used when user clicks link in email and is already logged in.
    """
    # Check if creator is already in an agency
    if current_user.agency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already part of an agency. Leave your current agency first.",
        )

    invitation = await agency_service.get_invitation_by_token(token)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Verify invitation is for this user
    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for your email address",
        )

    if invitation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is {invitation.status}",
        )

    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    # Accept the invitation
    await agency_service.accept_invitation(invitation.id)

    # Link creator to agency
    await agency_service.link_creator_to_agency(current_user.id, invitation.agency_id)

    agency = await agency_service.get_by_id(invitation.agency_id)
    agency_name = agency.name if agency else "Unknown"

    logger.info(f"Creator {current_user.email} accepted invitation (by token) to join {agency_name}")
    return {
        "message": f"You have joined {agency_name}",
        "agency_id": invitation.agency_id,
        "agency_name": agency_name,
    }


# ============================================
# Join Request Endpoints (Creator Side)
# ============================================

@router.post("/join/{agency_id}")
async def request_to_join_agency(
    agency_id: UUID,
    join_request: AgencyJoinRequest = None,
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Request to join an agency.
    Agency admins will be notified and can accept or reject.
    """
    # Check if creator is already in an agency
    if current_user.agency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already part of an agency. Leave your current agency first.",
        )

    # Check if agency exists
    agency = await agency_service.get_by_id(agency_id)
    if not agency or not agency.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found",
        )

    # Check if user can join an agency
    can_join = await agency_service.check_user_can_join_agency(current_user.id)
    if not can_join:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending request or membership",
        )

    # Check for existing pending request
    existing_members = await agency_service.get_agency_members(agency_id, status="pending_request")
    for member in existing_members:
        if member.user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have a pending request to join this agency",
            )

    # Create join request
    await agency_service.create_join_request(agency_id, current_user.id)

    # Notify agency admins
    try:
        # Get agency owner
        owner = await db.get(User, agency.owner_id)
        if owner:
            send_join_request_notification.delay(
                agency_admin_email=owner.email,
                agency_admin_name=owner.full_name or "Admin",
                agency_name=agency.name,
                creator_name=current_user.full_name or current_user.email,
                creator_email=current_user.email,
            )
    except Exception as e:
        logger.error(f"Failed to send join request notification: {e}")

    logger.info(f"Creator {current_user.email} requested to join agency {agency.name}")
    return {"message": f"Your request to join {agency.name} has been submitted"}


@router.get("/join-requests", response_model=List[dict])
async def get_my_join_requests(
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Get all pending join requests submitted by the creator.
    """
    result = await db.execute(
        select(AgencyMember)
        .where(
            AgencyMember.user_id == current_user.id,
            AgencyMember.status == "pending_request",
        )
    )
    requests = result.scalars().all()

    response = []
    for req in requests:
        agency = await agency_service.get_by_id(req.agency_id)
        response.append({
            "id": req.id,
            "agency_id": req.agency_id,
            "agency_name": agency.name if agency else "Unknown",
            "agency_logo_url": agency.logo_url if agency else None,
            "requested_at": req.created_at,
            "status": req.status,
        })

    return response


@router.delete("/join-requests/{request_id}")
async def cancel_join_request(
    request_id: UUID,
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Cancel a pending join request.
    """
    result = await db.execute(
        select(AgencyMember).where(AgencyMember.id == request_id)
    )
    member = result.scalar_one_or_none()

    if not member or member.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found",
        )

    if member.status != "pending_request":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request is no longer pending",
        )

    # Delete the request
    await db.delete(member)
    await db.commit()

    return {"message": "Join request cancelled"}


# ============================================
# Agency Search (for Creators)
# ============================================

@router.get("/search", response_model=List[AgencyPublicResponse])
async def search_agencies(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Search for agencies by name.
    Used by creators to find agencies to join.
    """
    agencies = await agency_service.search_agencies(q, limit)

    return [
        AgencyPublicResponse(
            id=agency.id,
            name=agency.name,
            slug=agency.slug,
            logo_url=agency.logo_url,
            description=agency.description,
            website=agency.website,
        )
        for agency in agencies
    ]


@router.get("/{agency_id}", response_model=AgencyPublicResponse)
async def get_agency_details(
    agency_id: UUID,
    current_user: User = Depends(require_creator_user),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Get public details of an agency.
    Used by creators when viewing agency before requesting to join.
    """
    agency = await agency_service.get_by_id(agency_id)
    if not agency or not agency.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found",
        )

    return AgencyPublicResponse(
        id=agency.id,
        name=agency.name,
        slug=agency.slug,
        logo_url=agency.logo_url,
        description=agency.description,
        website=agency.website,
    )
