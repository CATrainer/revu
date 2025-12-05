"""
Agency campaign management endpoints.

Handles campaign CRUD, deliverable tracking, and creator assignments.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.agency_campaign import (
    AgencyCampaign,
    CampaignCreator,
    CampaignDeliverable,
)
from app.models.agency_notification import AgencyActivity, AgencyNotification, AgencyTask
from app.schemas.agency_dashboard import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignStatus,
    DeliverableCreate,
    DeliverableUpdate,
    DeliverableResponse,
    DeliverableStatus,
    CreatorSummary,
)

router = APIRouter()


# ============================================
# Helper Functions
# ============================================

async def get_user_agency_id(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> UUID:
    """Get the agency ID for the current agency user."""
    if current_user.account_type != "agency":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency account required",
        )

    from app.models.agency import AgencyMember
    result = await db.execute(
        select(AgencyMember.agency_id).where(
            AgencyMember.user_id == current_user.id,
            AgencyMember.status == "active"
        )
    )
    agency_id = result.scalar_one_or_none()

    if not agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agency found for user",
        )
    return agency_id


def build_campaign_response(campaign: AgencyCampaign) -> CampaignResponse:
    """Build campaign response with computed fields."""
    creators = []
    creator_ids = []

    for ca in campaign.creator_assignments:
        creator_ids.append(ca.creator_id)
        if ca.creator:
            creators.append(CreatorSummary(
                id=ca.creator.id,
                name=ca.creator.full_name or "Unknown",
                handle=None,  # Could get from profile
                avatar_url=getattr(ca.creator, 'avatar_url', None),
                platform=ca.platform,
            ))

    deliverables = []
    completed_count = 0
    has_overdue = False
    next_deliverable = None

    for d in sorted(campaign.deliverables, key=lambda x: x.order):
        dr = DeliverableResponse(
            id=d.id,
            campaign_id=d.campaign_id,
            type=d.type,
            title=d.title,
            description=d.description,
            owner_type=d.owner_type,
            owner_id=d.owner_id,
            creator_id=d.creator_id,
            status=d.status,
            due_date=d.due_date,
            completed_at=d.completed_at,
            files=d.files or [],
            feedback=d.feedback,
            revision_count=d.revision_count,
            order=d.order,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        deliverables.append(dr)

        if d.status in ['completed', 'approved']:
            completed_count += 1
        if d.status == 'overdue':
            has_overdue = True
        if not next_deliverable and d.status not in ['completed', 'approved', 'cancelled']:
            next_deliverable = dr

    owner_name = None
    if campaign.owner:
        owner_name = campaign.owner.full_name

    return CampaignResponse(
        id=campaign.id,
        agency_id=campaign.agency_id,
        deal_id=campaign.deal_id,
        brand_name=campaign.brand_name,
        brand_logo_url=campaign.brand_logo_url,
        title=campaign.title,
        description=campaign.description,
        campaign_type=campaign.campaign_type,
        value=campaign.value or Decimal("0"),
        currency=campaign.currency,
        status=campaign.status,
        posting_date=campaign.posting_date,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        tags=campaign.tags or [],
        notes=campaign.notes,
        creator_ids=creator_ids,
        creators=creators,
        owner_id=campaign.owner_id,
        owner_name=owner_name,
        deliverables=deliverables,
        deliverables_completed=completed_count,
        deliverables_total=len(deliverables),
        has_overdue=has_overdue,
        next_deliverable=next_deliverable,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


async def log_activity(
    db: AsyncSession,
    agency_id: UUID,
    actor_id: UUID,
    actor_name: str,
    action: str,
    entity_type: str,
    entity_id: UUID,
    entity_name: str,
    description: str,
):
    """Log activity to the activity feed."""
    activity = AgencyActivity(
        id=uuid4(),
        agency_id=agency_id,
        actor_id=actor_id,
        actor_name=actor_name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        description=description,
    )
    db.add(activity)


# ============================================
# Campaign CRUD Endpoints
# ============================================

@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[CampaignStatus] = None,
    creator_id: Optional[UUID] = None,
    brand_name: Optional[str] = None,
    has_overdue: Optional[bool] = None,
    search: Optional[str] = None,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """List all campaigns for the agency with optional filters."""
    query = (
        select(AgencyCampaign)
        .options(
            selectinload(AgencyCampaign.creator_assignments).selectinload(CampaignCreator.creator),
            selectinload(AgencyCampaign.deliverables),
            selectinload(AgencyCampaign.owner),
        )
        .where(AgencyCampaign.agency_id == agency_id)
    )

    if status:
        query = query.where(AgencyCampaign.status == status.value)

    if brand_name:
        query = query.where(AgencyCampaign.brand_name.ilike(f"%{brand_name}%"))

    if search:
        query = query.where(
            or_(
                AgencyCampaign.title.ilike(f"%{search}%"),
                AgencyCampaign.brand_name.ilike(f"%{search}%"),
            )
        )

    if creator_id:
        query = query.join(CampaignCreator).where(CampaignCreator.creator_id == creator_id)

    query = query.order_by(AgencyCampaign.created_at.desc())

    result = await db.execute(query)
    campaigns = result.scalars().unique().all()

    responses = [build_campaign_response(c) for c in campaigns]

    # Filter by has_overdue if specified
    if has_overdue is not None:
        responses = [r for r in responses if r.has_overdue == has_overdue]

    return responses


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get a single campaign by ID."""
    result = await db.execute(
        select(AgencyCampaign)
        .options(
            selectinload(AgencyCampaign.creator_assignments).selectinload(CampaignCreator.creator),
            selectinload(AgencyCampaign.deliverables),
            selectinload(AgencyCampaign.owner),
        )
        .where(
            AgencyCampaign.id == campaign_id,
            AgencyCampaign.agency_id == agency_id,
        )
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    return build_campaign_response(campaign)


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Create a new campaign."""
    campaign = AgencyCampaign(
        id=uuid4(),
        agency_id=agency_id,
        deal_id=data.deal_id,
        brand_name=data.brand_name,
        brand_logo_url=data.brand_logo_url,
        title=data.title,
        description=data.description,
        campaign_type=data.campaign_type,
        value=data.value,
        currency=data.currency,
        status=data.status.value if data.status else 'draft',
        posting_date=data.posting_date,
        start_date=data.start_date,
        end_date=data.end_date,
        owner_id=data.owner_id or current_user.id,
        tags=data.tags or [],
        notes=data.notes,
    )
    db.add(campaign)

    # Add creator assignments
    for creator_id in data.creator_ids:
        assignment = CampaignCreator(
            id=uuid4(),
            campaign_id=campaign.id,
            creator_id=creator_id,
            status='assigned',
        )
        db.add(assignment)

    # Log activity
    await log_activity(
        db, agency_id, current_user.id, current_user.full_name or "User",
        "created", "campaign", campaign.id, campaign.title,
        f"Created campaign '{campaign.title}' for {campaign.brand_name}"
    )

    await db.commit()
    await db.refresh(campaign)

    # Reload with relationships
    result = await db.execute(
        select(AgencyCampaign)
        .options(
            selectinload(AgencyCampaign.creator_assignments).selectinload(CampaignCreator.creator),
            selectinload(AgencyCampaign.deliverables),
            selectinload(AgencyCampaign.owner),
        )
        .where(AgencyCampaign.id == campaign.id)
    )
    campaign = result.scalar_one()

    return build_campaign_response(campaign)


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    data: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Update a campaign."""
    result = await db.execute(
        select(AgencyCampaign)
        .options(
            selectinload(AgencyCampaign.creator_assignments),
            selectinload(AgencyCampaign.deliverables),
            selectinload(AgencyCampaign.owner),
        )
        .where(
            AgencyCampaign.id == campaign_id,
            AgencyCampaign.agency_id == agency_id,
        )
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)

    if 'status' in update_data and update_data['status']:
        update_data['status'] = update_data['status'].value

    # Handle creator_ids separately
    creator_ids = update_data.pop('creator_ids', None)

    for field, value in update_data.items():
        setattr(campaign, field, value)

    # Update creator assignments if provided
    if creator_ids is not None:
        # Remove existing assignments
        for assignment in campaign.creator_assignments:
            await db.delete(assignment)

        # Add new assignments
        for creator_id in creator_ids:
            assignment = CampaignCreator(
                id=uuid4(),
                campaign_id=campaign.id,
                creator_id=creator_id,
                status='assigned',
            )
            db.add(assignment)

    # Log activity
    await log_activity(
        db, agency_id, current_user.id, current_user.full_name or "User",
        "updated", "campaign", campaign.id, campaign.title,
        f"Updated campaign '{campaign.title}'"
    )

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(AgencyCampaign)
        .options(
            selectinload(AgencyCampaign.creator_assignments).selectinload(CampaignCreator.creator),
            selectinload(AgencyCampaign.deliverables),
            selectinload(AgencyCampaign.owner),
        )
        .where(AgencyCampaign.id == campaign.id)
    )
    campaign = result.scalar_one()

    return build_campaign_response(campaign)


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Delete a campaign."""
    result = await db.execute(
        select(AgencyCampaign).where(
            AgencyCampaign.id == campaign_id,
            AgencyCampaign.agency_id == agency_id,
        )
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    title = campaign.title

    await db.delete(campaign)

    # Log activity
    await log_activity(
        db, agency_id, current_user.id, current_user.full_name or "User",
        "deleted", "campaign", campaign_id, title,
        f"Deleted campaign '{title}'"
    )

    await db.commit()

    return {"message": "Campaign deleted"}


# ============================================
# Deliverable Endpoints
# ============================================

@router.get("/{campaign_id}/deliverables", response_model=List[DeliverableResponse])
async def list_deliverables(
    campaign_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """List all deliverables for a campaign."""
    # Verify campaign access
    result = await db.execute(
        select(AgencyCampaign).where(
            AgencyCampaign.id == campaign_id,
            AgencyCampaign.agency_id == agency_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    result = await db.execute(
        select(CampaignDeliverable)
        .where(CampaignDeliverable.campaign_id == campaign_id)
        .order_by(CampaignDeliverable.order)
    )
    deliverables = result.scalars().all()

    return [
        DeliverableResponse(
            id=d.id,
            campaign_id=d.campaign_id,
            type=d.type,
            title=d.title,
            description=d.description,
            owner_type=d.owner_type,
            owner_id=d.owner_id,
            creator_id=d.creator_id,
            status=d.status,
            due_date=d.due_date,
            completed_at=d.completed_at,
            files=d.files or [],
            feedback=d.feedback,
            revision_count=d.revision_count,
            order=d.order,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in deliverables
    ]


@router.post("/{campaign_id}/deliverables", response_model=DeliverableResponse, status_code=status.HTTP_201_CREATED)
async def create_deliverable(
    campaign_id: UUID,
    data: DeliverableCreate,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Create a new deliverable for a campaign."""
    # Verify campaign access
    result = await db.execute(
        select(AgencyCampaign).where(
            AgencyCampaign.id == campaign_id,
            AgencyCampaign.agency_id == agency_id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Get max order
    result = await db.execute(
        select(func.max(CampaignDeliverable.order))
        .where(CampaignDeliverable.campaign_id == campaign_id)
    )
    max_order = result.scalar() or 0

    deliverable = CampaignDeliverable(
        id=uuid4(),
        campaign_id=campaign_id,
        type=data.type.value,
        title=data.title,
        description=data.description,
        owner_type=data.owner_type,
        owner_id=data.owner_id,
        creator_id=data.creator_id,
        due_date=data.due_date,
        order=data.order if data.order else max_order + 1,
        status='pending',
    )
    db.add(deliverable)

    # Create auto-task for deliverable
    if data.due_date:
        task = AgencyTask(
            id=uuid4(),
            agency_id=agency_id,
            title=f"Complete: {data.title}",
            description=f"Deliverable for campaign '{campaign.title}'",
            priority='normal',
            status='todo',
            due_date=data.due_date,
            related_type='deliverable',
            related_id=deliverable.id,
            is_auto_generated=True,
            source='deliverable_created',
        )
        db.add(task)

    await db.commit()
    await db.refresh(deliverable)

    return DeliverableResponse(
        id=deliverable.id,
        campaign_id=deliverable.campaign_id,
        type=deliverable.type,
        title=deliverable.title,
        description=deliverable.description,
        owner_type=deliverable.owner_type,
        owner_id=deliverable.owner_id,
        creator_id=deliverable.creator_id,
        status=deliverable.status,
        due_date=deliverable.due_date,
        completed_at=deliverable.completed_at,
        files=deliverable.files or [],
        feedback=deliverable.feedback,
        revision_count=deliverable.revision_count,
        order=deliverable.order,
        created_at=deliverable.created_at,
        updated_at=deliverable.updated_at,
    )


@router.patch("/{campaign_id}/deliverables/{deliverable_id}", response_model=DeliverableResponse)
async def update_deliverable(
    campaign_id: UUID,
    deliverable_id: UUID,
    data: DeliverableUpdate,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Update a deliverable."""
    result = await db.execute(
        select(CampaignDeliverable)
        .join(AgencyCampaign)
        .where(
            CampaignDeliverable.id == deliverable_id,
            CampaignDeliverable.campaign_id == campaign_id,
            AgencyCampaign.agency_id == agency_id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if not deliverable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    update_data = data.model_dump(exclude_unset=True)

    if 'type' in update_data and update_data['type']:
        update_data['type'] = update_data['type'].value
    if 'status' in update_data and update_data['status']:
        update_data['status'] = update_data['status'].value
        if update_data['status'] in ['completed', 'approved']:
            update_data['completed_at'] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(deliverable, field, value)

    await db.commit()
    await db.refresh(deliverable)

    return DeliverableResponse(
        id=deliverable.id,
        campaign_id=deliverable.campaign_id,
        type=deliverable.type,
        title=deliverable.title,
        description=deliverable.description,
        owner_type=deliverable.owner_type,
        owner_id=deliverable.owner_id,
        creator_id=deliverable.creator_id,
        status=deliverable.status,
        due_date=deliverable.due_date,
        completed_at=deliverable.completed_at,
        files=deliverable.files or [],
        feedback=deliverable.feedback,
        revision_count=deliverable.revision_count,
        order=deliverable.order,
        created_at=deliverable.created_at,
        updated_at=deliverable.updated_at,
    )


@router.post("/{campaign_id}/deliverables/{deliverable_id}/complete", response_model=DeliverableResponse)
async def complete_deliverable(
    campaign_id: UUID,
    deliverable_id: UUID,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Mark a deliverable as completed."""
    result = await db.execute(
        select(CampaignDeliverable)
        .join(AgencyCampaign)
        .where(
            CampaignDeliverable.id == deliverable_id,
            CampaignDeliverable.campaign_id == campaign_id,
            AgencyCampaign.agency_id == agency_id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if not deliverable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    deliverable.status = 'completed'
    deliverable.completed_at = datetime.utcnow()

    # Mark related task as completed
    result = await db.execute(
        select(AgencyTask).where(
            AgencyTask.related_type == 'deliverable',
            AgencyTask.related_id == deliverable_id,
        )
    )
    task = result.scalar_one_or_none()
    if task:
        task.status = 'completed'
        task.completed_at = datetime.utcnow()

    # Log activity
    result = await db.execute(
        select(AgencyCampaign).where(AgencyCampaign.id == campaign_id)
    )
    campaign = result.scalar_one()

    await log_activity(
        db, agency_id, current_user.id, current_user.full_name or "User",
        "completed", "deliverable", deliverable.id, deliverable.title,
        f"Completed '{deliverable.title}' for campaign '{campaign.title}'"
    )

    await db.commit()
    await db.refresh(deliverable)

    return DeliverableResponse(
        id=deliverable.id,
        campaign_id=deliverable.campaign_id,
        type=deliverable.type,
        title=deliverable.title,
        description=deliverable.description,
        owner_type=deliverable.owner_type,
        owner_id=deliverable.owner_id,
        creator_id=deliverable.creator_id,
        status=deliverable.status,
        due_date=deliverable.due_date,
        completed_at=deliverable.completed_at,
        files=deliverable.files or [],
        feedback=deliverable.feedback,
        revision_count=deliverable.revision_count,
        order=deliverable.order,
        created_at=deliverable.created_at,
        updated_at=deliverable.updated_at,
    )


@router.delete("/{campaign_id}/deliverables/{deliverable_id}")
async def delete_deliverable(
    campaign_id: UUID,
    deliverable_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Delete a deliverable."""
    result = await db.execute(
        select(CampaignDeliverable)
        .join(AgencyCampaign)
        .where(
            CampaignDeliverable.id == deliverable_id,
            CampaignDeliverable.campaign_id == campaign_id,
            AgencyCampaign.agency_id == agency_id,
        )
    )
    deliverable = result.scalar_one_or_none()

    if not deliverable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deliverable not found",
        )

    # Delete related task
    result = await db.execute(
        select(AgencyTask).where(
            AgencyTask.related_type == 'deliverable',
            AgencyTask.related_id == deliverable_id,
        )
    )
    task = result.scalar_one_or_none()
    if task:
        await db.delete(task)

    await db.delete(deliverable)
    await db.commit()

    return {"message": "Deliverable deleted"}
