"""
Agency service for managing agencies and their operations.
"""

import re
import secrets
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from loguru import logger
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agency import Agency, AgencyMember, AgencyInvitation
from app.models.user import User


class AgencyService:
    """Service for agency management operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # Agency CRUD Operations
    # ============================================

    async def create_agency(
        self,
        name: str,
        owner_id: UUID,
        website: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Agency:
        """
        Create a new agency and set the owner as an agency member.

        Args:
            name: Agency display name
            owner_id: User ID of the agency owner
            website: Optional agency website
            description: Optional agency description

        Returns:
            Agency: The created agency
        """
        # Generate unique slug
        slug = await self._generate_unique_slug(name)

        # Create agency
        agency = Agency(
            name=name,
            slug=slug,
            owner_id=owner_id,
            website=website,
            description=description,
            settings={},
            is_active=True,
        )
        self.db.add(agency)
        await self.db.flush()

        # Create owner membership
        owner_member = AgencyMember(
            agency_id=agency.id,
            user_id=owner_id,
            role="owner",
            status="active",
            joined_at=datetime.utcnow(),
        )
        self.db.add(owner_member)

        await self.db.commit()
        await self.db.refresh(agency)

        logger.info(f"Agency created: {agency.name} (slug={agency.slug}, owner_id={owner_id})")
        return agency

    async def get_by_id(self, agency_id: UUID) -> Optional[Agency]:
        """Get agency by ID."""
        result = await self.db.execute(
            select(Agency).where(Agency.id == agency_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Agency]:
        """Get agency by slug."""
        result = await self.db.execute(
            select(Agency).where(Agency.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_id: UUID) -> Optional[Agency]:
        """Get agency owned by a specific user."""
        result = await self.db.execute(
            select(Agency).where(Agency.owner_id == owner_id)
        )
        return result.scalar_one_or_none()

    async def update_agency(
        self,
        agency_id: UUID,
        **updates
    ) -> Optional[Agency]:
        """Update agency details."""
        agency = await self.get_by_id(agency_id)
        if not agency:
            return None

        for key, value in updates.items():
            if hasattr(agency, key) and value is not None:
                setattr(agency, key, value)

        agency.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(agency)

        logger.info(f"Agency updated: {agency.name} (id={agency_id})")
        return agency

    async def search_agencies(
        self,
        query: str,
        limit: int = 10
    ) -> List[Agency]:
        """Search agencies by name (for creators to find agencies)."""
        result = await self.db.execute(
            select(Agency)
            .where(
                and_(
                    Agency.is_active == True,
                    Agency.name.ilike(f"%{query}%")
                )
            )
            .order_by(Agency.name)
            .limit(limit)
        )
        return list(result.scalars().all())

    # ============================================
    # Membership Operations
    # ============================================

    async def get_user_agency_membership(
        self,
        user_id: UUID
    ) -> Optional[AgencyMember]:
        """Get user's active agency membership (if any)."""
        result = await self.db.execute(
            select(AgencyMember)
            .options(selectinload(AgencyMember.agency))
            .where(
                and_(
                    AgencyMember.user_id == user_id,
                    AgencyMember.status == "active"
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_agency_members(
        self,
        agency_id: UUID,
        status: Optional[str] = None,
        role: Optional[str] = None,
    ) -> List[AgencyMember]:
        """Get all members of an agency."""
        query = select(AgencyMember).options(
            selectinload(AgencyMember.user)
        ).where(AgencyMember.agency_id == agency_id)

        if status:
            query = query.where(AgencyMember.status == status)
        if role:
            query = query.where(AgencyMember.role == role)

        result = await self.db.execute(query.order_by(AgencyMember.created_at))
        return list(result.scalars().all())

    async def get_agency_creators(self, agency_id: UUID) -> List[User]:
        """Get all creators (non-team members) linked to an agency."""
        result = await self.db.execute(
            select(User)
            .where(
                and_(
                    User.agency_id == agency_id,
                    User.account_type == "creator"
                )
            )
            .order_by(User.full_name)
        )
        return list(result.scalars().all())

    async def get_agency_creator_count(self, agency_id: UUID) -> int:
        """Get count of creators linked to an agency."""
        result = await self.db.execute(
            select(func.count(User.id))
            .where(
                and_(
                    User.agency_id == agency_id,
                    User.account_type == "creator"
                )
            )
        )
        return result.scalar() or 0

    async def check_user_can_join_agency(self, user_id: UUID) -> bool:
        """Check if user can join an agency (not already in one)."""
        user = await self.db.get(User, user_id)
        if not user:
            return False

        # Check if user already has an agency
        if user.agency_id:
            return False

        # Check for any active memberships
        existing = await self.get_user_agency_membership(user_id)
        return existing is None

    async def add_member(
        self,
        agency_id: UUID,
        user_id: UUID,
        role: str = "member",
        status: str = "pending_invite",
        invited_by: Optional[UUID] = None,
    ) -> AgencyMember:
        """Add a member to an agency."""
        member = AgencyMember(
            agency_id=agency_id,
            user_id=user_id,
            role=role,
            status=status,
            invited_by=invited_by,
            invited_at=datetime.utcnow() if status == "pending_invite" else None,
        )
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)

        logger.info(f"Member added to agency: user_id={user_id}, agency_id={agency_id}, role={role}")
        return member

    async def update_member_status(
        self,
        member_id: UUID,
        new_status: str,
    ) -> Optional[AgencyMember]:
        """Update a member's status."""
        result = await self.db.execute(
            select(AgencyMember).where(AgencyMember.id == member_id)
        )
        member = result.scalar_one_or_none()
        if not member:
            return None

        member.status = new_status
        if new_status == "active":
            member.joined_at = datetime.utcnow()

        member.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(member)

        return member

    async def update_member_role(
        self,
        member_id: UUID,
        new_role: str,
    ) -> Optional[AgencyMember]:
        """Update a member's role."""
        result = await self.db.execute(
            select(AgencyMember).where(AgencyMember.id == member_id)
        )
        member = result.scalar_one_or_none()
        if not member:
            return None

        member.role = new_role
        member.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(member)

        logger.info(f"Member role updated: member_id={member_id}, new_role={new_role}")
        return member

    async def remove_member(self, member_id: UUID) -> bool:
        """Remove a member from an agency."""
        result = await self.db.execute(
            select(AgencyMember).where(AgencyMember.id == member_id)
        )
        member = result.scalar_one_or_none()
        if not member:
            return False

        # Update status to removed
        member.status = "removed"
        member.updated_at = datetime.utcnow()

        # Also clear the user's agency_id if they're a creator
        user = await self.db.get(User, member.user_id)
        if user and user.agency_id == member.agency_id:
            user.agency_id = None

        await self.db.commit()

        logger.info(f"Member removed from agency: member_id={member_id}")
        return True

    async def link_creator_to_agency(
        self,
        user_id: UUID,
        agency_id: UUID,
    ) -> bool:
        """Link a creator to an agency (set user.agency_id)."""
        user = await self.db.get(User, user_id)
        if not user:
            return False

        user.agency_id = agency_id
        await self.db.commit()

        logger.info(f"Creator linked to agency: user_id={user_id}, agency_id={agency_id}")
        return True

    async def unlink_creator_from_agency(self, user_id: UUID) -> bool:
        """Remove a creator's agency link."""
        user = await self.db.get(User, user_id)
        if not user:
            return False

        user.agency_id = None
        await self.db.commit()

        logger.info(f"Creator unlinked from agency: user_id={user_id}")
        return True

    # ============================================
    # Invitation Operations
    # ============================================

    async def create_invitation(
        self,
        agency_id: UUID,
        email: str,
        invited_by: UUID,
        role: str = "member",
        expires_in_days: int = 7,
    ) -> AgencyInvitation:
        """Create an invitation for a non-user to join an agency."""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        invitation = AgencyInvitation(
            agency_id=agency_id,
            email=email.lower(),
            token=token,
            role=role,
            invited_by=invited_by,
            expires_at=expires_at,
            status="pending",
        )
        self.db.add(invitation)
        await self.db.commit()
        await self.db.refresh(invitation)

        logger.info(f"Invitation created: email={email}, agency_id={agency_id}, role={role}")
        return invitation

    async def get_invitation_by_token(self, token: str) -> Optional[AgencyInvitation]:
        """Get an invitation by its token."""
        result = await self.db.execute(
            select(AgencyInvitation)
            .options(selectinload(AgencyInvitation.agency))
            .where(AgencyInvitation.token == token)
        )
        return result.scalar_one_or_none()

    async def get_invitation_by_id(self, invitation_id: UUID) -> Optional[AgencyInvitation]:
        """Get an invitation by ID."""
        result = await self.db.execute(
            select(AgencyInvitation)
            .options(selectinload(AgencyInvitation.agency))
            .where(AgencyInvitation.id == invitation_id)
        )
        return result.scalar_one_or_none()

    async def get_pending_invitations_for_email(self, email: str) -> List[AgencyInvitation]:
        """Get all pending invitations for an email address."""
        result = await self.db.execute(
            select(AgencyInvitation)
            .options(selectinload(AgencyInvitation.agency))
            .where(
                and_(
                    AgencyInvitation.email == email.lower(),
                    AgencyInvitation.status == "pending",
                    AgencyInvitation.expires_at > datetime.utcnow()
                )
            )
            .order_by(AgencyInvitation.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_agency_invitations(
        self,
        agency_id: UUID,
        status: Optional[str] = None,
    ) -> List[AgencyInvitation]:
        """Get all invitations for an agency."""
        query = select(AgencyInvitation).where(
            AgencyInvitation.agency_id == agency_id
        )
        if status:
            query = query.where(AgencyInvitation.status == status)

        result = await self.db.execute(query.order_by(AgencyInvitation.created_at.desc()))
        return list(result.scalars().all())

    async def accept_invitation(self, invitation_id: UUID) -> Optional[AgencyInvitation]:
        """Mark an invitation as accepted."""
        invitation = await self.get_invitation_by_id(invitation_id)
        if not invitation:
            return None

        invitation.status = "accepted"
        invitation.accepted_at = datetime.utcnow()
        invitation.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(invitation)

        return invitation

    async def cancel_invitation(self, invitation_id: UUID) -> bool:
        """Cancel a pending invitation."""
        invitation = await self.get_invitation_by_id(invitation_id)
        if not invitation or invitation.status != "pending":
            return False

        invitation.status = "cancelled"
        invitation.updated_at = datetime.utcnow()

        await self.db.commit()
        return True

    # ============================================
    # Join Request Operations
    # ============================================

    async def create_join_request(
        self,
        agency_id: UUID,
        user_id: UUID,
    ) -> AgencyMember:
        """Create a join request from a creator to an agency."""
        member = AgencyMember(
            agency_id=agency_id,
            user_id=user_id,
            role="member",
            status="pending_request",
        )
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)

        logger.info(f"Join request created: user_id={user_id}, agency_id={agency_id}")
        return member

    async def get_pending_join_requests(self, agency_id: UUID) -> List[AgencyMember]:
        """Get all pending join requests for an agency."""
        return await self.get_agency_members(agency_id, status="pending_request")

    async def accept_join_request(self, member_id: UUID) -> Optional[AgencyMember]:
        """Accept a join request."""
        member = await self.update_member_status(member_id, "active")
        if member:
            # Also link the creator to the agency
            await self.link_creator_to_agency(member.user_id, member.agency_id)
        return member

    async def reject_join_request(self, member_id: UUID) -> bool:
        """Reject a join request."""
        result = await self.db.execute(
            select(AgencyMember).where(AgencyMember.id == member_id)
        )
        member = result.scalar_one_or_none()
        if not member or member.status != "pending_request":
            return False

        # Delete the request entirely
        await self.db.delete(member)
        await self.db.commit()

        logger.info(f"Join request rejected: member_id={member_id}")
        return True

    # ============================================
    # Helper Methods
    # ============================================

    async def _generate_unique_slug(self, name: str) -> str:
        """Generate a unique slug from agency name."""
        # Convert to lowercase and replace spaces/special chars with hyphens
        base_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

        # Check if slug exists
        slug = base_slug
        counter = 1

        while True:
            result = await self.db.execute(
                select(Agency).where(Agency.slug == slug)
            )
            if not result.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug

    async def is_user_agency_admin(self, user_id: UUID, agency_id: UUID) -> bool:
        """Check if user is an admin (owner or admin role) of the agency."""
        result = await self.db.execute(
            select(AgencyMember)
            .where(
                and_(
                    AgencyMember.agency_id == agency_id,
                    AgencyMember.user_id == user_id,
                    AgencyMember.status == "active",
                    AgencyMember.role.in_(["owner", "admin"])
                )
            )
        )
        return result.scalar_one_or_none() is not None

    async def is_user_agency_member(self, user_id: UUID, agency_id: UUID) -> bool:
        """Check if user is any kind of member of the agency."""
        result = await self.db.execute(
            select(AgencyMember)
            .where(
                and_(
                    AgencyMember.agency_id == agency_id,
                    AgencyMember.user_id == user_id,
                    AgencyMember.status == "active"
                )
            )
        )
        return result.scalar_one_or_none() is not None
