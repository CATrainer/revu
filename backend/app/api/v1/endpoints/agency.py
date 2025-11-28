"""
Agency management endpoints.

Handles agency operations, creator management, team members, and invitations.
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
from app.schemas.agency import (
    AgencyResponse,
    AgencyUpdate,
    AgencyMemberResponse,
    AgencyMemberListResponse,
    AgencyMemberRoleUpdate,
    AgencyInviteRequest,
    AgencyInvitationResponse,
    AgencyInvitationListResponse,
    AgencyPublicResponse,
    CreatorAgencyResponse,
    PendingInvitationResponse,
)
from app.services.agency_service import AgencyService
from app.tasks.email import send_creator_invitation_email, send_join_request_notification

router = APIRouter()


# ============================================
# Helper Functions
# ============================================

async def get_agency_service(db: AsyncSession = Depends(get_async_session)) -> AgencyService:
    """Get agency service instance."""
    return AgencyService(db)


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
# Agency Profile Endpoints
# ============================================

@router.get("/me", response_model=AgencyResponse)
async def get_my_agency(
    agency_id: UUID = Depends(get_user_agency_id),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Get the current user's agency profile.
    """
    agency = await agency_service.get_by_id(agency_id)
    if not agency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found",
        )
    return agency


@router.patch("/me", response_model=AgencyResponse)
async def update_my_agency(
    updates: AgencyUpdate,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Update the current user's agency profile.
    Requires admin privileges.
    """
    _, agency_id = admin_data

    agency = await agency_service.update_agency(
        agency_id=agency_id,
        **updates.model_dump(exclude_unset=True),
    )

    if not agency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found",
        )

    return agency


# ============================================
# Creator Management Endpoints
# ============================================

@router.get("/creators", response_model=List[dict])
async def list_agency_creators(
    agency_id: UUID = Depends(get_user_agency_id),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    List all creators linked to the agency.
    """
    creators = await agency_service.get_agency_creators(agency_id)

    return [
        {
            "id": creator.id,
            "email": creator.email,
            "full_name": creator.full_name,
            "avatar_url": getattr(creator, 'avatar_url', None),
            "youtube_channel_name": getattr(creator, 'youtube_channel_name', None),
            "youtube_subscriber_count": getattr(creator, 'youtube_subscriber_count', None),
            "created_at": creator.created_at,
        }
        for creator in creators
    ]


@router.delete("/creators/{creator_id}")
async def remove_creator_from_agency(
    creator_id: UUID,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Remove a creator from the agency.
    Requires admin privileges.
    """
    _, agency_id = admin_data

    # Verify creator belongs to this agency
    creator = await db.get(User, creator_id)
    if not creator or creator.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator not found in agency",
        )

    success = await agency_service.unlink_creator_from_agency(creator_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove creator",
        )

    return {"message": "Creator removed from agency"}


# ============================================
# Creator Invitation Endpoints
# ============================================

@router.post("/invitations", response_model=AgencyInvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_creator(
    invite_data: AgencyInviteRequest,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Invite a creator to join the agency by email.
    Requires admin privileges.
    """
    current_user, agency_id = admin_data

    # Check if email already has a pending invitation
    existing_invitations = await agency_service.get_agency_invitations(agency_id, status="pending")
    for inv in existing_invitations:
        if inv.email.lower() == invite_data.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An invitation has already been sent to this email",
            )

    # Check if user already exists and is already in an agency
    from app.services.user import UserService
    user_service = UserService(db)
    existing_user = await user_service.get_by_email(invite_data.email)

    if existing_user:
        if existing_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This user is already part of an agency",
            )
        if existing_user.account_type != "creator":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only invite creator accounts",
            )

    # Create invitation
    invitation = await agency_service.create_invitation(
        agency_id=agency_id,
        email=invite_data.email,
        invited_by=current_user.id,
    )

    # Get agency for email
    agency = await agency_service.get_by_id(agency_id)

    # Send invitation email
    try:
        send_creator_invitation_email.delay(
            email=invite_data.email,
            agency_name=agency.name,
            invitation_token=invitation.token,
            inviter_name=current_user.full_name,
        )
    except Exception as e:
        logger.error(f"Failed to queue invitation email: {e}")

    return AgencyInvitationResponse(
        id=invitation.id,
        agency_id=invitation.agency_id,
        email=invitation.email,
        status=invitation.status,
        invited_by=invitation.invited_by,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        created_at=invitation.created_at,
        agency_name=agency.name,
        agency_logo_url=agency.logo_url,
    )


@router.get("/invitations", response_model=List[AgencyInvitationListResponse])
async def list_invitations(
    invitation_status: Optional[str] = Query(None, alias="status"),
    agency_id: UUID = Depends(get_user_agency_id),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    List all invitations for the agency.
    """
    invitations = await agency_service.get_agency_invitations(agency_id, status=invitation_status)

    return [
        AgencyInvitationListResponse(
            id=inv.id,
            email=inv.email,
            status=inv.status,
            expires_at=inv.expires_at,
            created_at=inv.created_at,
        )
        for inv in invitations
    ]


@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(
    invitation_id: UUID,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Cancel a pending invitation.
    Requires admin privileges.
    """
    _, agency_id = admin_data

    # Verify invitation belongs to this agency
    invitation = await agency_service.get_invitation_by_id(invitation_id)
    if not invitation or invitation.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    success = await agency_service.cancel_invitation(invitation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel this invitation",
        )

    return {"message": "Invitation cancelled"}


# ============================================
# Join Request Endpoints (Agency Side)
# ============================================

@router.get("/join-requests", response_model=List[AgencyMemberListResponse])
async def list_join_requests(
    agency_id: UUID = Depends(get_user_agency_id),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    List all pending join requests for the agency.
    """
    requests = await agency_service.get_pending_join_requests(agency_id)

    return [
        AgencyMemberListResponse(
            id=req.id,
            user_id=req.user_id,
            role=req.role,
            status=req.status,
            user_email=req.user.email if req.user else "",
            user_full_name=req.user.full_name if req.user else None,
            joined_at=req.joined_at,
        )
        for req in requests
    ]


@router.post("/join-requests/{member_id}/accept")
async def accept_join_request(
    member_id: UUID,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Accept a creator's join request.
    Requires admin privileges.
    """
    _, agency_id = admin_data

    # Get the member request
    from sqlalchemy import select
    from app.models.agency import AgencyMember

    result = await db.execute(
        select(AgencyMember).where(AgencyMember.id == member_id)
    )
    member = result.scalar_one_or_none()

    if not member or member.agency_id != agency_id or member.status != "pending_request":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found",
        )

    # Accept the request (this also links the creator)
    updated_member = await agency_service.accept_join_request(member_id)
    if not updated_member:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept join request",
        )

    return {"message": "Join request accepted"}


@router.post("/join-requests/{member_id}/reject")
async def reject_join_request(
    member_id: UUID,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Reject a creator's join request.
    Requires admin privileges.
    """
    _, agency_id = admin_data

    # Get the member request
    from sqlalchemy import select
    from app.models.agency import AgencyMember

    result = await db.execute(
        select(AgencyMember).where(AgencyMember.id == member_id)
    )
    member = result.scalar_one_or_none()

    if not member or member.agency_id != agency_id or member.status != "pending_request":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found",
        )

    success = await agency_service.reject_join_request(member_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject join request",
        )

    return {"message": "Join request rejected"}


# ============================================
# Team Member Endpoints
# ============================================

@router.get("/team", response_model=List[AgencyMemberListResponse])
async def list_team_members(
    agency_id: UUID = Depends(get_user_agency_id),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    List all team members of the agency.
    """
    members = await agency_service.get_agency_members(agency_id, status="active")

    return [
        AgencyMemberListResponse(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            status=member.status,
            user_email=member.user.email if member.user else "",
            user_full_name=member.user.full_name if member.user else None,
            joined_at=member.joined_at,
        )
        for member in members
    ]


@router.post("/team/invite", response_model=AgencyInvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    invite_data: AgencyInviteRequest,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Invite a new team member to the agency.
    Requires admin privileges.
    Team members are agency users, not creators.
    """
    current_user, agency_id = admin_data

    # Check if email already has a pending invitation
    existing_invitations = await agency_service.get_agency_invitations(agency_id, status="pending")
    for inv in existing_invitations:
        if inv.email.lower() == invite_data.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An invitation has already been sent to this email",
            )

    # Check if user already exists
    from app.services.user import UserService
    user_service = UserService(db)
    existing_user = await user_service.get_by_email(invite_data.email)

    if existing_user:
        # Check if already a member
        is_member = await agency_service.is_user_agency_member(existing_user.id, agency_id)
        if is_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a team member",
            )

    # Create invitation (for team members, we'll handle differently on accept)
    invitation = await agency_service.create_invitation(
        agency_id=agency_id,
        email=invite_data.email,
        invited_by=current_user.id,
    )

    # Store the role in invitation metadata or handle on accept
    # For now, team invitations default to 'member' role

    agency = await agency_service.get_by_id(agency_id)

    # Send team invitation email
    try:
        send_creator_invitation_email.delay(
            email=invite_data.email,
            agency_name=agency.name,
            invitation_token=invitation.token,
            inviter_name=current_user.full_name,
            is_team_invite=True,
        )
    except Exception as e:
        logger.error(f"Failed to queue team invitation email: {e}")

    return AgencyInvitationResponse(
        id=invitation.id,
        agency_id=invitation.agency_id,
        email=invitation.email,
        status=invitation.status,
        invited_by=invitation.invited_by,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        created_at=invitation.created_at,
        agency_name=agency.name,
        agency_logo_url=agency.logo_url,
    )


@router.patch("/team/{member_id}/role", response_model=AgencyMemberListResponse)
async def update_team_member_role(
    member_id: UUID,
    role_update: AgencyMemberRoleUpdate,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Update a team member's role.
    Requires admin privileges. Cannot change owner role.
    """
    current_user, agency_id = admin_data

    # Get the member
    from sqlalchemy import select
    from app.models.agency import AgencyMember

    result = await db.execute(
        select(AgencyMember).where(AgencyMember.id == member_id)
    )
    member = result.scalar_one_or_none()

    if not member or member.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    # Can't change owner's role
    if member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change owner's role",
        )

    # Can't change own role (unless owner)
    membership = await agency_service.get_user_agency_membership(current_user.id)
    if member.user_id == current_user.id and membership.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    updated_member = await agency_service.update_member_role(member_id, role_update.role)
    if not updated_member:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update role",
        )

    # Refetch with user info
    await db.refresh(updated_member)
    user = await db.get(User, updated_member.user_id)

    return AgencyMemberListResponse(
        id=updated_member.id,
        user_id=updated_member.user_id,
        role=updated_member.role,
        status=updated_member.status,
        user_email=user.email if user else "",
        user_full_name=user.full_name if user else None,
        joined_at=updated_member.joined_at,
    )


@router.delete("/team/{member_id}")
async def remove_team_member(
    member_id: UUID,
    admin_data: tuple = Depends(require_agency_admin),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Remove a team member from the agency.
    Requires admin privileges. Cannot remove owner.
    """
    current_user, agency_id = admin_data

    # Get the member
    from sqlalchemy import select
    from app.models.agency import AgencyMember

    result = await db.execute(
        select(AgencyMember).where(AgencyMember.id == member_id)
    )
    member = result.scalar_one_or_none()

    if not member or member.agency_id != agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    # Can't remove owner
    if member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove agency owner",
        )

    # Can't remove yourself
    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself. Use leave agency instead.",
        )

    success = await agency_service.remove_member(member_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove team member",
        )

    return {"message": "Team member removed"}


# ============================================
# Agency Stats Endpoints
# ============================================

@router.get("/stats")
async def get_agency_stats(
    agency_id: UUID = Depends(get_user_agency_id),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Get agency statistics for dashboard.
    """
    # Get creator count
    creator_count = await agency_service.get_agency_creator_count(agency_id)

    # Get pending invitations
    pending_invitations = await agency_service.get_agency_invitations(agency_id, status="pending")

    # Get pending join requests
    join_requests = await agency_service.get_pending_join_requests(agency_id)

    # Get team member count
    team_members = await agency_service.get_agency_members(agency_id, status="active")

    # TODO: Calculate total reach from creator analytics
    total_reach = 0

    # TODO: Get active opportunities count
    active_opportunities = 0

    return {
        "creator_count": creator_count,
        "team_member_count": len(team_members),
        "pending_invitations": len(pending_invitations),
        "pending_join_requests": len(join_requests),
        "total_reach": total_reach,
        "active_opportunities": active_opportunities,
    }


# ============================================
# Public Agency Search (for Creators)
# ============================================

@router.get("/search", response_model=List[AgencyPublicResponse])
async def search_agencies(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    agency_service: AgencyService = Depends(get_agency_service),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Search for agencies by name.
    Used by creators to find agencies to join.
    """
    # Only creators should search for agencies
    if current_user.account_type != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only creators can search for agencies",
        )

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
