"""
Team management endpoints for agency team operations.

Includes invitation acceptance flow and permission-based team operations.
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_async_session
from app.core.security import create_access_token, create_refresh_token
from app.core.permissions import (
    Permission,
    AgencyPermissionChecker,
    require_agency_owner,
)
from app.models.user import User
from app.models.agency import Agency, AgencyMember, AgencyInvitation
from app.schemas.agency import (
    AgencyInvitationResponse,
    AgencyInvitationListResponse,
    AgencyMemberRoleUpdate,
    AgencyMemberRole,
)
from app.services.agency_service import AgencyService
from app.tasks.email import send_creator_invitation_email

router = APIRouter()


# ============================================
# Schemas
# ============================================

class TeamInviteRequest(BaseModel):
    """Schema for inviting a team member with role."""
    email: EmailStr
    role: AgencyMemberRole = "member"


class InvitationVerifyResponse(BaseModel):
    """Response when verifying an invitation token."""
    valid: bool
    email: Optional[str] = None
    agency_name: Optional[str] = None
    agency_logo_url: Optional[str] = None
    role: Optional[str] = None
    expires_at: Optional[datetime] = None
    requires_signup: bool = False
    message: Optional[str] = None


class InvitationAcceptRequest(BaseModel):
    """Request to accept an invitation."""
    token: str
    # For new users
    password: Optional[str] = Field(None, min_length=8)
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)


class InvitationAcceptResponse(BaseModel):
    """Response after accepting an invitation."""
    success: bool
    message: str
    agency_id: UUID
    agency_name: str
    role: str
    # Auth tokens for new users
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class TeamMemberDetailResponse(BaseModel):
    """Detailed team member response."""
    id: UUID
    user_id: UUID
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str] = None
    role: str
    status: str
    joined_at: Optional[datetime]
    invited_by_name: Optional[str] = None
    created_at: datetime


class TeamOverviewResponse(BaseModel):
    """Team overview with members and invitations."""
    members: List[TeamMemberDetailResponse]
    pending_invitations: List[AgencyInvitationListResponse]
    total_members: int
    total_pending: int


# ============================================
# Helper Functions
# ============================================

async def get_agency_service(db: AsyncSession = Depends(get_async_session)) -> AgencyService:
    """Get agency service instance."""
    return AgencyService(db)


# ============================================
# Public Endpoints (No Auth Required)
# ============================================

@router.get("/invitations/verify/{token}", response_model=InvitationVerifyResponse)
async def verify_invitation_token(
    token: str,
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Verify an invitation token and return invitation details.
    Public endpoint - no authentication required.
    """
    invitation = await agency_service.get_invitation_by_token(token)
    
    if not invitation:
        return InvitationVerifyResponse(
            valid=False,
            message="Invalid or expired invitation token",
        )
    
    if invitation.status != "pending":
        return InvitationVerifyResponse(
            valid=False,
            message=f"Invitation has already been {invitation.status}",
        )
    
    if invitation.expires_at < datetime.utcnow():
        return InvitationVerifyResponse(
            valid=False,
            message="Invitation has expired",
        )
    
    # Check if user already exists
    from app.services.user import UserService
    user_service = UserService(db)
    existing_user = await user_service.get_by_email(invitation.email)
    
    agency = await agency_service.get_by_id(invitation.agency_id)
    
    return InvitationVerifyResponse(
        valid=True,
        email=invitation.email,
        agency_name=agency.name if agency else None,
        agency_logo_url=agency.logo_url if agency else None,
        role=invitation.role,
        expires_at=invitation.expires_at,
        requires_signup=existing_user is None,
    )


@router.post("/invitations/accept", response_model=InvitationAcceptResponse)
async def accept_invitation(
    accept_data: InvitationAcceptRequest,
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Accept an invitation and join the agency.
    
    For existing users: Links their account to the agency.
    For new users: Creates account and links to agency (requires password and full_name).
    """
    invitation = await agency_service.get_invitation_by_token(accept_data.token)
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation token",
        )
    
    if invitation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation has already been {invitation.status}",
        )
    
    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )
    
    # Check if user exists
    from app.services.user import UserService
    user_service = UserService(db)
    existing_user = await user_service.get_by_email(invitation.email)
    
    access_token = None
    refresh_token = None
    
    if existing_user:
        # Existing user - verify they're not already in an agency
        existing_membership = await agency_service.get_user_agency_membership(existing_user.id)
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of an agency",
            )
        
        user = existing_user
        # Update account type to agency if needed
        if user.account_type != "agency":
            user.account_type = "agency"
            await db.commit()
    else:
        # New user - require password and full_name
        if not accept_data.password or not accept_data.full_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password and full name required for new users",
            )
        
        # Create new user
        from app.core.security import get_password_hash
        
        new_user = User(
            email=invitation.email,
            hashed_password=get_password_hash(accept_data.password),
            full_name=accept_data.full_name,
            account_type="agency",
            is_active=True,
            approval_status="approved",  # Auto-approve invited users
            approved_at=datetime.utcnow(),
        )
        db.add(new_user)
        await db.flush()
        
        user = new_user
        
        # Generate auth tokens for new user
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Add user as agency member with the specified role
    member = AgencyMember(
        agency_id=invitation.agency_id,
        user_id=user.id,
        role=invitation.role,
        status="active",
        invited_by=invitation.invited_by,
        invited_at=invitation.created_at,
        joined_at=datetime.utcnow(),
    )
    db.add(member)
    
    # Mark invitation as accepted
    invitation.status = "accepted"
    invitation.accepted_at = datetime.utcnow()
    
    await db.commit()
    
    agency = await agency_service.get_by_id(invitation.agency_id)
    
    logger.info(f"Invitation accepted: user_id={user.id}, agency_id={invitation.agency_id}, role={invitation.role}")
    
    return InvitationAcceptResponse(
        success=True,
        message="Successfully joined the agency",
        agency_id=invitation.agency_id,
        agency_name=agency.name if agency else "Unknown",
        role=invitation.role,
        access_token=access_token,
        refresh_token=refresh_token,
    )


# ============================================
# Team Management Endpoints (Auth Required)
# ============================================

@router.get("/overview", response_model=TeamOverviewResponse)
async def get_team_overview(
    perm: AgencyPermissionChecker = Depends(AgencyPermissionChecker(Permission.VIEW_TEAM)),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Get team overview including members and pending invitations.
    """
    # Get all active members
    members = await agency_service.get_agency_members(perm.agency_id, status="active")
    
    # Get pending invitations
    invitations = await agency_service.get_agency_invitations(perm.agency_id, status="pending")
    
    # Build detailed member responses
    member_responses = []
    for member in members:
        # Get inviter name if available
        inviter_name = None
        if member.invited_by:
            inviter = await db.get(User, member.invited_by)
            if inviter:
                inviter_name = inviter.full_name
        
        member_responses.append(TeamMemberDetailResponse(
            id=member.id,
            user_id=member.user_id,
            email=member.user.email if member.user else "",
            full_name=member.user.full_name if member.user else None,
            avatar_url=getattr(member.user, 'avatar_url', None) if member.user else None,
            role=member.role,
            status=member.status,
            joined_at=member.joined_at,
            invited_by_name=inviter_name,
            created_at=member.created_at,
        ))
    
    # Build invitation responses
    invitation_responses = [
        AgencyInvitationListResponse(
            id=inv.id,
            email=inv.email,
            role=inv.role,
            status=inv.status,
            expires_at=inv.expires_at,
            created_at=inv.created_at,
        )
        for inv in invitations
    ]
    
    return TeamOverviewResponse(
        members=member_responses,
        pending_invitations=invitation_responses,
        total_members=len(member_responses),
        total_pending=len(invitation_responses),
    )


@router.post("/invite", response_model=AgencyInvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    invite_data: TeamInviteRequest,
    perm: AgencyPermissionChecker = Depends(AgencyPermissionChecker(Permission.INVITE_MEMBERS)),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Invite a new team member to the agency.
    Requires INVITE_MEMBERS permission (admin or owner).
    """
    # Only owner can invite admins
    if invite_data.role == "admin" and perm.membership.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can invite admins",
        )
    
    # Cannot invite owners
    if invite_data.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite users as owner",
        )
    
    # Check if email already has a pending invitation
    existing_invitations = await agency_service.get_agency_invitations(perm.agency_id, status="pending")
    for inv in existing_invitations:
        if inv.email.lower() == invite_data.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An invitation has already been sent to this email",
            )
    
    # Check if user already exists and is already a member
    from app.services.user import UserService
    user_service = UserService(db)
    existing_user = await user_service.get_by_email(invite_data.email)
    
    if existing_user:
        is_member = await agency_service.is_user_agency_member(existing_user.id, perm.agency_id)
        if is_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a team member",
            )
    
    # Create invitation with role
    invitation = await agency_service.create_invitation(
        agency_id=perm.agency_id,
        email=invite_data.email,
        invited_by=perm.user.id,
        role=invite_data.role,
    )
    
    agency = perm.agency
    
    # Send invitation email
    try:
        send_creator_invitation_email.delay(
            email=invite_data.email,
            agency_name=agency.name,
            invitation_token=invitation.token,
            inviter_name=perm.user.full_name,
            is_team_invite=True,
            role=invite_data.role,
        )
    except Exception as e:
        logger.error(f"Failed to queue team invitation email: {e}")
    
    return AgencyInvitationResponse(
        id=invitation.id,
        agency_id=invitation.agency_id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        invited_by=invitation.invited_by,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        created_at=invitation.created_at,
        agency_name=agency.name,
        agency_logo_url=agency.logo_url,
    )


@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(
    invitation_id: UUID,
    perm: AgencyPermissionChecker = Depends(AgencyPermissionChecker(Permission.INVITE_MEMBERS)),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Cancel a pending invitation.
    """
    invitation = await agency_service.get_invitation_by_id(invitation_id)
    if not invitation or invitation.agency_id != perm.agency_id:
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


@router.post("/invitations/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: UUID,
    perm: AgencyPermissionChecker = Depends(AgencyPermissionChecker(Permission.INVITE_MEMBERS)),
    agency_service: AgencyService = Depends(get_agency_service),
) -> Any:
    """
    Resend an invitation email.
    """
    invitation = await agency_service.get_invitation_by_id(invitation_id)
    if not invitation or invitation.agency_id != perm.agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )
    
    if invitation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only resend pending invitations",
        )
    
    agency = perm.agency
    
    # Resend email
    try:
        send_creator_invitation_email.delay(
            email=invitation.email,
            agency_name=agency.name,
            invitation_token=invitation.token,
            inviter_name=perm.user.full_name,
            is_team_invite=True,
            role=invitation.role,
        )
    except Exception as e:
        logger.error(f"Failed to resend invitation email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email",
        )
    
    return {"message": "Invitation resent"}


@router.patch("/members/{member_id}/role", response_model=TeamMemberDetailResponse)
async def update_member_role(
    member_id: UUID,
    role_update: AgencyMemberRoleUpdate,
    perm: AgencyPermissionChecker = Depends(AgencyPermissionChecker(Permission.MANAGE_ROLES)),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Update a team member's role.
    Only owner can promote to admin. Cannot demote owner.
    """
    # Get the member
    result = await db.execute(
        select(AgencyMember).where(AgencyMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    
    if not member or member.agency_id != perm.agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )
    
    # Cannot change owner's role
    if member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change owner's role",
        )
    
    # Only owner can promote to admin
    if role_update.role == "admin" and perm.membership.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can promote to admin",
        )
    
    # Cannot change own role unless owner
    if member.user_id == perm.user.id and perm.membership.role != "owner":
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
    
    return TeamMemberDetailResponse(
        id=updated_member.id,
        user_id=updated_member.user_id,
        email=user.email if user else "",
        full_name=user.full_name if user else None,
        avatar_url=getattr(user, 'avatar_url', None) if user else None,
        role=updated_member.role,
        status=updated_member.status,
        joined_at=updated_member.joined_at,
        created_at=updated_member.created_at,
    )


@router.delete("/members/{member_id}")
async def remove_team_member(
    member_id: UUID,
    perm: AgencyPermissionChecker = Depends(AgencyPermissionChecker(Permission.REMOVE_MEMBERS)),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Remove a team member from the agency.
    Cannot remove owner. Cannot remove yourself.
    """
    # Get the member
    result = await db.execute(
        select(AgencyMember).where(AgencyMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    
    if not member or member.agency_id != perm.agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )
    
    # Cannot remove owner
    if member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove agency owner",
        )
    
    # Admin can only remove members, not other admins
    if perm.membership.role == "admin" and member.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin cannot remove other admins",
        )
    
    # Cannot remove yourself
    if member.user_id == perm.user.id:
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


@router.post("/leave")
async def leave_agency(
    perm: AgencyPermissionChecker = Depends(AgencyPermissionChecker(Permission.VIEW_AGENCY)),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Leave the current agency.
    Owner cannot leave - must transfer ownership first.
    """
    if perm.membership.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner cannot leave. Transfer ownership first or delete the agency.",
        )
    
    success = await agency_service.remove_member(perm.membership.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to leave agency",
        )
    
    return {"message": "Successfully left the agency"}


@router.post("/transfer-ownership/{new_owner_id}")
async def transfer_ownership(
    new_owner_id: UUID,
    owner_data: tuple = Depends(require_agency_owner),
    agency_service: AgencyService = Depends(get_agency_service),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """
    Transfer agency ownership to another admin.
    Only current owner can do this.
    """
    current_user, agency_id = owner_data
    
    # Get the new owner's membership
    result = await db.execute(
        select(AgencyMember).where(
            AgencyMember.agency_id == agency_id,
            AgencyMember.user_id == new_owner_id,
            AgencyMember.status == "active",
        )
    )
    new_owner_member = result.scalar_one_or_none()
    
    if not new_owner_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a team member",
        )
    
    if new_owner_member.role not in ["admin", "member"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transfer target",
        )
    
    # Get current owner's membership
    result = await db.execute(
        select(AgencyMember).where(
            AgencyMember.agency_id == agency_id,
            AgencyMember.user_id == current_user.id,
            AgencyMember.role == "owner",
        )
    )
    current_owner_member = result.scalar_one_or_none()
    
    # Transfer ownership
    new_owner_member.role = "owner"
    current_owner_member.role = "admin"
    
    # Update agency owner_id
    agency = await agency_service.get_by_id(agency_id)
    agency.owner_id = new_owner_id
    
    await db.commit()
    
    logger.info(f"Agency ownership transferred: from={current_user.id} to={new_owner_id}, agency_id={agency_id}")
    
    return {"message": "Ownership transferred successfully"}
