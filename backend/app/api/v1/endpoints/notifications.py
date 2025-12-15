"""
Notification API Endpoints

Handles notification management for both creators and agency users.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import (
    CreatorNotification,
    CREATOR_NOTIFICATION_TYPES,
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

class NotificationResponse(BaseModel):
    """Notification response schema."""
    id: str
    type: str
    title: str
    message: Optional[str] = None
    priority: str
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    is_dismissed: bool
    data: dict
    created_at: str

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """List of notifications response."""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Unread count response."""
    count: int


class NotificationTypeInfo(BaseModel):
    """Notification type information."""
    id: str
    title: str
    category: str
    default_in_app: bool
    default_email: bool


class NotificationCategoryInfo(BaseModel):
    """Notification category information."""
    id: str
    name: str
    types: List[NotificationTypeInfo]


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


class MuteEntityRequest(BaseModel):
    """Request to mute an entity."""
    entity_type: str
    entity_id: str


# =============================================================================
# Creator Notification Endpoints
# =============================================================================

@router.get("/notifications", response_model=NotificationListResponse)
async def get_notifications(
    unread_only: bool = Query(False, description="Only return unread notifications"),
    notification_type: Optional[str] = Query(None, description="Filter by type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Get notifications for the current user."""
    service = get_notification_service(session)
    
    notifications = await service.get_creator_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        notification_type=notification_type,
        limit=limit,
        offset=offset,
    )
    
    unread_count = await service.get_creator_unread_count(current_user.id)
    
    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=str(n.id),
                type=n.type,
                title=n.title,
                message=n.message,
                priority=n.priority,
                action_url=n.action_url,
                action_label=n.action_label,
                entity_type=n.entity_type,
                entity_id=str(n.entity_id) if n.entity_id else None,
                is_read=n.is_read,
                is_dismissed=n.is_dismissed,
                data=n.data or {},
                created_at=n.created_at.isoformat() if n.created_at else "",
            )
            for n in notifications
        ],
        total=len(notifications),
        unread_count=unread_count,
    )


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Get count of unread notifications."""
    service = get_notification_service(session)
    count = await service.get_creator_unread_count(current_user.id)
    return UnreadCountResponse(count=count)


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Mark a notification as read."""
    service = get_notification_service(session)
    notification = await service.mark_creator_notification_read(notification_id, current_user.id)
    
    if not notification:
        raise HTTPException(404, "Notification not found")
    
    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Mark all notifications as read."""
    service = get_notification_service(session)
    count = await service.mark_all_creator_notifications_read(current_user.id)
    return {"success": True, "count": count}


@router.post("/notifications/{notification_id}/dismiss")
async def dismiss_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Dismiss a notification."""
    service = get_notification_service(session)
    notification = await service.dismiss_creator_notification(notification_id, current_user.id)
    
    if not notification:
        raise HTTPException(404, "Notification not found")
    
    return {"success": True}


# =============================================================================
# Notification Preferences Endpoints
# =============================================================================

@router.get("/notifications/preferences", response_model=PreferencesResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Get notification preferences."""
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
async def update_preferences(
    request: PreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Update notification preferences."""
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


@router.post("/notifications/mute")
async def mute_entity(
    request: MuteEntityRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Mute notifications for a specific entity."""
    service = get_notification_service(session)
    await service.mute_entity(current_user.id, request.entity_type, request.entity_id)
    return {"success": True}


@router.post("/notifications/unmute")
async def unmute_entity(
    request: MuteEntityRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Unmute notifications for a specific entity."""
    service = get_notification_service(session)
    await service.unmute_entity(current_user.id, request.entity_type, request.entity_id)
    return {"success": True}


# =============================================================================
# Notification Types Info
# =============================================================================

@router.get("/notifications/types")
async def get_notification_types(
    dashboard: str = Query("creator", pattern="^(creator|agency)$"),
):
    """Get available notification types with their settings."""
    types = CREATOR_NOTIFICATION_TYPES if dashboard == "creator" else AGENCY_NOTIFICATION_TYPES
    categories = NOTIFICATION_CATEGORIES.get(dashboard, {})
    
    # Group types by category
    result = []
    for cat_id, cat_name in categories.items():
        cat_types = [
            NotificationTypeInfo(
                id=type_id,
                title=type_info["title"],
                category=cat_id,
                default_in_app=type_info.get("default_in_app", True),
                default_email=type_info.get("default_email", True),
            )
            for type_id, type_info in types.items()
            if type_info.get("category") == cat_id
        ]
        if cat_types:
            result.append(NotificationCategoryInfo(
                id=cat_id,
                name=cat_name,
                types=cat_types,
            ))
    
    return result


# =============================================================================
# Server-Sent Events for Real-time Notifications
# =============================================================================

@router.get("/notifications/stream")
async def notification_stream(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Server-Sent Events stream for real-time notifications.
    
    Clients should connect to this endpoint and listen for events.
    Events are sent as JSON with format: {"type": "notification", "data": {...}}
    """
    import asyncio
    import json
    
    async def event_generator():
        """Generate SSE events."""
        service = get_notification_service(session)
        last_check = None
        
        # Send initial connection event
        yield f"data: {json.dumps({'type': 'connected', 'user_id': str(current_user.id)})}\n\n"
        
        while True:
            try:
                # Check for new notifications every 5 seconds
                await asyncio.sleep(5)
                
                # Get unread count
                count = await service.get_creator_unread_count(current_user.id)
                
                # Send heartbeat with unread count
                yield f"data: {json.dumps({'type': 'heartbeat', 'unread_count': count})}\n\n"
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"SSE error: {e}")
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
