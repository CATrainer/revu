"""
Agency opportunity service for managing sponsorship opportunities.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import UUID

from loguru import logger
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agency import Agency
from app.models.agency_opportunity import AgencyOpportunity
from app.models.user import User


class AgencyOpportunityService:
    """Service for agency opportunity management operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # Create Operations
    # ============================================

    async def create_opportunity(
        self,
        agency_id: UUID,
        creator_id: UUID,
        created_by: UUID,
        title: str,
        brand_name: str,
        description: str,
        requirements: Dict[str, Any] = None,
        compensation: Dict[str, Any] = None,
        brand_logo_url: Optional[str] = None,
        deadline: Optional[datetime] = None,
        content_deadline: Optional[datetime] = None,
        send_immediately: bool = False,
    ) -> AgencyOpportunity:
        """
        Create a new agency opportunity.

        Args:
            agency_id: The agency creating the opportunity
            creator_id: The target creator
            created_by: The agency user creating this
            title: Opportunity title
            brand_name: Brand/sponsor name
            description: Detailed description
            requirements: Deliverables and requirements dict
            compensation: Payment terms dict
            brand_logo_url: Optional brand logo URL
            deadline: Optional response deadline
            content_deadline: Optional content delivery deadline
            send_immediately: Whether to send immediately or keep as draft

        Returns:
            AgencyOpportunity: The created opportunity
        """
        opportunity = AgencyOpportunity(
            agency_id=agency_id,
            creator_id=creator_id,
            created_by=created_by,
            title=title,
            brand_name=brand_name,
            description=description,
            requirements=requirements or {},
            compensation=compensation or {},
            brand_logo_url=brand_logo_url,
            deadline=deadline,
            content_deadline=content_deadline,
            status="sent" if send_immediately else "draft",
            sent_at=datetime.utcnow() if send_immediately else None,
        )

        self.db.add(opportunity)
        await self.db.commit()
        await self.db.refresh(opportunity)

        logger.info(f"Opportunity created: {opportunity.title} (id={opportunity.id}, creator={creator_id})")
        return opportunity

    # ============================================
    # Read Operations
    # ============================================

    async def get_by_id(self, opportunity_id: UUID) -> Optional[AgencyOpportunity]:
        """Get opportunity by ID."""
        result = await self.db.execute(
            select(AgencyOpportunity)
            .options(
                selectinload(AgencyOpportunity.agency),
                selectinload(AgencyOpportunity.creator),
            )
            .where(AgencyOpportunity.id == opportunity_id)
        )
        return result.scalar_one_or_none()

    async def get_by_agency(
        self,
        agency_id: UUID,
        status: Optional[str] = None,
        creator_id: Optional[UUID] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AgencyOpportunity]:
        """Get opportunities for an agency with optional filters."""
        query = (
            select(AgencyOpportunity)
            .options(selectinload(AgencyOpportunity.creator))
            .where(AgencyOpportunity.agency_id == agency_id)
        )

        if status:
            query = query.where(AgencyOpportunity.status == status)
        if creator_id:
            query = query.where(AgencyOpportunity.creator_id == creator_id)

        query = query.order_by(AgencyOpportunity.created_at.desc())
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_creator(
        self,
        creator_id: UUID,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AgencyOpportunity]:
        """Get opportunities for a creator with optional filters."""
        query = (
            select(AgencyOpportunity)
            .options(selectinload(AgencyOpportunity.agency))
            .where(
                AgencyOpportunity.creator_id == creator_id,
                # Only show sent opportunities to creators (not drafts)
                AgencyOpportunity.status != "draft",
            )
        )

        if status:
            query = query.where(AgencyOpportunity.status == status)

        query = query.order_by(AgencyOpportunity.sent_at.desc().nulls_last())
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_agency(
        self,
        agency_id: UUID,
        status: Optional[str] = None,
    ) -> int:
        """Count opportunities for an agency."""
        query = select(func.count(AgencyOpportunity.id)).where(
            AgencyOpportunity.agency_id == agency_id
        )
        if status:
            query = query.where(AgencyOpportunity.status == status)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def count_by_creator(
        self,
        creator_id: UUID,
        status: Optional[str] = None,
    ) -> int:
        """Count opportunities for a creator (excluding drafts)."""
        query = select(func.count(AgencyOpportunity.id)).where(
            AgencyOpportunity.creator_id == creator_id,
            AgencyOpportunity.status != "draft",
        )
        if status:
            query = query.where(AgencyOpportunity.status == status)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_pending_for_creator(self, creator_id: UUID) -> List[AgencyOpportunity]:
        """Get pending (sent but not responded) opportunities for a creator."""
        result = await self.db.execute(
            select(AgencyOpportunity)
            .options(selectinload(AgencyOpportunity.agency))
            .where(
                AgencyOpportunity.creator_id == creator_id,
                AgencyOpportunity.status.in_(["sent", "viewed"]),
            )
            .order_by(AgencyOpportunity.sent_at.desc())
        )
        return list(result.scalars().all())

    # ============================================
    # Update Operations
    # ============================================

    async def update_opportunity(
        self,
        opportunity_id: UUID,
        **updates
    ) -> Optional[AgencyOpportunity]:
        """Update opportunity details (only drafts can be fully edited)."""
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        for key, value in updates.items():
            if hasattr(opportunity, key) and value is not None:
                setattr(opportunity, key, value)

        opportunity.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(opportunity)

        logger.info(f"Opportunity updated: {opportunity.title} (id={opportunity_id})")
        return opportunity

    async def send_opportunity(self, opportunity_id: UUID) -> Optional[AgencyOpportunity]:
        """Send a draft opportunity to the creator."""
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        if opportunity.status != "draft":
            logger.warning(f"Cannot send non-draft opportunity: {opportunity_id}")
            return None

        opportunity.status = "sent"
        opportunity.sent_at = datetime.utcnow()
        opportunity.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(opportunity)

        logger.info(f"Opportunity sent: {opportunity.title} (id={opportunity_id})")
        return opportunity

    async def mark_as_viewed(self, opportunity_id: UUID) -> Optional[AgencyOpportunity]:
        """Mark opportunity as viewed by creator."""
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        if opportunity.status == "sent":
            opportunity.status = "viewed"
            opportunity.viewed_at = datetime.utcnow()
            opportunity.updated_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(opportunity)

        return opportunity

    async def accept_opportunity(
        self,
        opportunity_id: UUID,
        creator_notes: Optional[str] = None,
    ) -> Optional[AgencyOpportunity]:
        """
        Accept an opportunity.

        Args:
            opportunity_id: The opportunity to accept
            creator_notes: Optional notes from creator

        Returns:
            Updated opportunity or None if not found
        """
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        if opportunity.status not in ["sent", "viewed"]:
            logger.warning(f"Cannot accept opportunity in status {opportunity.status}")
            return None

        opportunity.status = "accepted"
        opportunity.creator_response_at = datetime.utcnow()
        opportunity.creator_notes = creator_notes
        opportunity.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(opportunity)

        logger.info(f"Opportunity accepted: {opportunity.title} (id={opportunity_id})")
        return opportunity

    async def decline_opportunity(
        self,
        opportunity_id: UUID,
        reason: Optional[str] = None,
    ) -> Optional[AgencyOpportunity]:
        """
        Decline an opportunity.

        Args:
            opportunity_id: The opportunity to decline
            reason: Optional reason for declining

        Returns:
            Updated opportunity or None if not found
        """
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        if opportunity.status not in ["sent", "viewed"]:
            logger.warning(f"Cannot decline opportunity in status {opportunity.status}")
            return None

        opportunity.status = "declined"
        opportunity.creator_response_at = datetime.utcnow()
        opportunity.creator_notes = reason
        opportunity.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(opportunity)

        logger.info(f"Opportunity declined: {opportunity.title} (id={opportunity_id})")
        return opportunity

    async def complete_opportunity(
        self,
        opportunity_id: UUID,
    ) -> Optional[AgencyOpportunity]:
        """Mark an accepted opportunity as completed."""
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        if opportunity.status != "accepted":
            logger.warning(f"Cannot complete opportunity in status {opportunity.status}")
            return None

        opportunity.status = "completed"
        opportunity.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(opportunity)

        logger.info(f"Opportunity completed: {opportunity.title} (id={opportunity_id})")
        return opportunity

    async def cancel_opportunity(
        self,
        opportunity_id: UUID,
    ) -> Optional[AgencyOpportunity]:
        """Cancel an opportunity (agency action)."""
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        if opportunity.status in ["completed", "cancelled"]:
            logger.warning(f"Cannot cancel opportunity in status {opportunity.status}")
            return None

        opportunity.status = "cancelled"
        opportunity.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(opportunity)

        logger.info(f"Opportunity cancelled: {opportunity.title} (id={opportunity_id})")
        return opportunity

    async def link_project(
        self,
        opportunity_id: UUID,
        project_id: UUID,
    ) -> Optional[AgencyOpportunity]:
        """Link a monetization project to an accepted opportunity."""
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        opportunity.project_id = project_id
        opportunity.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(opportunity)

        logger.info(f"Project linked to opportunity: opportunity={opportunity_id}, project={project_id}")
        return opportunity

    # ============================================
    # Delete Operations
    # ============================================

    async def delete_opportunity(self, opportunity_id: UUID) -> bool:
        """Delete a draft opportunity."""
        opportunity = await self.get_by_id(opportunity_id)
        if not opportunity:
            return False

        if opportunity.status != "draft":
            logger.warning(f"Cannot delete non-draft opportunity: {opportunity_id}")
            return False

        await self.db.delete(opportunity)
        await self.db.commit()

        logger.info(f"Opportunity deleted: {opportunity_id}")
        return True

    # ============================================
    # Stats
    # ============================================

    async def get_agency_stats(self, agency_id: UUID) -> Dict[str, int]:
        """Get opportunity statistics for an agency."""
        # Count by status
        statuses = ["draft", "sent", "viewed", "accepted", "declined", "completed", "cancelled"]
        stats = {}

        for status in statuses:
            count = await self.count_by_agency(agency_id, status=status)
            stats[status] = count

        # Total
        stats["total"] = sum(stats.values())

        # Active (sent + viewed)
        stats["active"] = stats["sent"] + stats["viewed"]

        return stats
