"""
Agency Notification API Endpoints

Handles notification management for agency dashboard users.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.agency import Agency, AgencyMember
from app.models.agency_notification import AgencyNotification
from app.models.notification import (
    AGENCY_NOTIFICATION_TYPES,
    NOTIFICATION_CATEGORIES,
)
from app.models.creator_tools import NotificationPreference
from app.services.notification_service import get_notification_service

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class AgencyNotificationResponse(BaseModel):
    """Agency notification response schema."""
    id: str
    type: str
    title: str
    description: Optional[str] = None
    priority: str
    link_url: Optional[str] = None
    icon: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    is_actioned: bool
    metadata: dict
    created_at: str

    class Config:
        from_attributes = True


class AgencyNotificationListResponse(BaseModel):
    """List of agency notifications response."""
    notifications: List[AgencyNotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Unread count response."""
    count: int


class PreferencesResponse(BaseModel):
    """Notification preferences response."""
    in_app_enabled: bool
    email_enabled: bool
    email_frequency: str
    digest_hour: int
    type_settings: dict
    muted_entities: list


class PreferencesUpdateRequest(BaseModel):
    """Request to update preferences."""
    in_app_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    email_frequency: Optional[str] = Field(None, pattern="^(instant|daily_digest)$")
    digest_hour: Optional[int] = Field(None, ge=0, le=23)
    type_settings: Optional[dict] = None


# =============================================================================
# Helper to get user's agency
# =============================================================================

async def get_user_agency(user: User, session: AsyncSession) -> Agency:
    """Get the agency for the current user."""
    # Check if user is agency owner
    result = await session.execute(
        select(Agency).where(Agency.owner_id == user.id)
    )
    agency = result.scalar_one_or_none()
    
    if agency:
        return agency
    
    # Check if user is agency member
    result = await session.execute(
        select(AgencyMember).where(
            AgencyMember.user_id == user.id,
            AgencyMember.status == 'active'
        )
    )
    member = result.scalar_one_or_none()
    
    if member:
        result = await session.execute(
            select(Agency).where(Agency.id == member.agency_id)
        )
        return result.scalar_one_or_none()
    
    return None


# =============================================================================
# Agency Notification Endpoints
# =============================================================================

@router.get("/notifications", response_model=AgencyNotificationListResponse)
async def get_agency_notifications(
    unread_only: bool = Query(False, description="Only return unread notifications"),
    notification_type: Optional[str] = Query(None, description="Filter by type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Get notifications for the current agency user."""
    agency = await get_user_agency(current_user, session)
    if not agency:
        raise HTTPException(403, "Not a member of any agency")
    
    service = get_notification_service(session)
    
    notifications = await service.get_agency_notifications(
        user_id=current_user.id,
        agency_id=agency.id,
        unread_only=unread_only,
        notification_type=notification_type,
        limit=limit,
        offset=offset,
    )
    
    unread_count = await service.get_agency_unread_count(current_user.id, agency.id)
    
    return AgencyNotificationListResponse(
        notifications=[
            AgencyNotificationResponse(
                id=str(n.id),
                type=n.type,
                title=n.title,
                description=n.description,
                priority=n.priority,
                link_url=n.link_url,
                icon=n.icon,
                entity_type=n.entity_type,
                entity_id=str(n.entity_id) if n.entity_id else None,
                is_read=n.is_read,
                is_actioned=n.is_actioned,
                metadata=n.notification_metadata or {},
                created_at=n.created_at.isoformat() if n.created_at else "",
            )
            for n in notifications
        ],
        total=len(notifications),
        unread_count=unread_count,
    )


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def get_agency_unread_count(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Get count of unread agency notifications."""
    agency = await get_user_agency(current_user, session)
    if not agency:
        return UnreadCountResponse(count=0)
    
    service = get_notification_service(session)
    count = await service.get_agency_unread_count(current_user.id, agency.id)
    return UnreadCountResponse(count=count)


@router.post("/notifications/{notification_id}/read")
async def mark_agency_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Mark an agency notification as read."""
    service = get_notification_service(session)
    notification = await service.mark_agency_notification_read(notification_id, current_user.id)
    
    if not notification:
        raise HTTPException(404, "Notification not found")
    
    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_agency_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Mark all agency notifications as read."""
    agency = await get_user_agency(current_user, session)
    if not agency:
        raise HTTPException(403, "Not a member of any agency")
    
    service = get_notification_service(session)
    count = await service.mark_all_agency_notifications_read(current_user.id, agency.id)
    return {"success": True, "count": count}


# =============================================================================
# Agency Notification Preferences
# =============================================================================

@router.get("/notifications/preferences", response_model=PreferencesResponse)
async def get_agency_preferences(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Get notification preferences for agency user."""
    service = get_notification_service(session)
    prefs = await service.get_or_create_preferences(current_user.id)
    
    return PreferencesResponse(
        in_app_enabled=prefs.in_app_enabled,
        email_enabled=prefs.email_enabled,
        email_frequency=prefs.email_frequency,
        digest_hour=prefs.digest_hour,
        type_settings=prefs.type_settings or {},
        muted_entities=prefs.muted_entities or [],
    )


@router.put("/notifications/preferences", response_model=PreferencesResponse)
async def update_agency_preferences(
    request: PreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Update notification preferences for agency user."""
    service = get_notification_service(session)
    
    prefs = await service.update_preferences(
        user_id=current_user.id,
        in_app_enabled=request.in_app_enabled,
        email_enabled=request.email_enabled,
        email_frequency=request.email_frequency,
        digest_hour=request.digest_hour,
        type_settings=request.type_settings,
    )
    
    return PreferencesResponse(
        in_app_enabled=prefs.in_app_enabled,
        email_enabled=prefs.email_enabled,
        email_frequency=prefs.email_frequency,
        digest_hour=prefs.digest_hour,
        type_settings=prefs.type_settings or {},
        muted_entities=prefs.muted_entities or [],
    )


@router.get("/notifications/types")
async def get_agency_notification_types():
    """Get available agency notification types with their settings."""
    types = AGENCY_NOTIFICATION_TYPES
    categories = NOTIFICATION_CATEGORIES.get("agency", {})
    
    result = []
    for cat_id, cat_name in categories.items():
        cat_types = [
            {
                "id": type_id,
                "title": type_info["title"],
                "category": cat_id,
                "default_in_app": type_info.get("default_in_app", True),
                "default_email": type_info.get("default_email", True),
                "icon": type_info.get("icon", "bell"),
            }
            for type_id, type_info in types.items()
            if type_info.get("category") == cat_id
        ]
        if cat_types:
            result.append({
                "id": cat_id,
                "name": cat_name,
                "types": cat_types,
            })
    
    return result


# =============================================================================
# Server-Sent Events for Real-time Agency Notifications
# =============================================================================

@router.get("/notifications/stream")
async def agency_notification_stream(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Server-Sent Events stream for real-time agency notifications.
    """
    import asyncio
    import json
    
    agency = await get_user_agency(current_user, session)
    
    async def event_generator():
        """Generate SSE events."""
        service = get_notification_service(session)
        
        # Send initial connection event
        yield f"data: {json.dumps({'type': 'connected', 'user_id': str(current_user.id)})}\n\n"
        
        while True:
            try:
                await asyncio.sleep(5)
                
                if agency:
                    count = await service.get_agency_unread_count(current_user.id, agency.id)
                else:
                    count = 0
                
                yield f"data: {json.dumps({'type': 'heartbeat', 'unread_count': count})}\n\n"
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Agency SSE error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                break
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
