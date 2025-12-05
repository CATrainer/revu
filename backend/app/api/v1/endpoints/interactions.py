"""API endpoints for interactions (comments, DMs, mentions)."""
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.interaction import Interaction
from app.models.view import InteractionView
from app.schemas.interaction import (
    InteractionCreate,
    InteractionUpdate,
    InteractionOut,
    InteractionList,
    InteractionFilters,
    BulkActionRequest,
    BulkActionResponse,
    GenerateResponseRequest,
    SendResponseRequest,
    InteractionContext,
    InteractionThread,
    PendingResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def build_filter_query(
    base_query,
    filters: InteractionFilters,
    user_id: UUID,
    user_demo_mode: bool = False
):
    """Build SQLAlchemy query from filter parameters."""
    conditions = [Interaction.user_id == user_id]
    
    # CRITICAL: Filter by demo mode - users should only see data matching their mode
    conditions.append(Interaction.is_demo == user_demo_mode)
    
    if filters.platforms:
        conditions.append(Interaction.platform.in_(filters.platforms))
    
    if filters.types:
        conditions.append(Interaction.type.in_(filters.types))
    
    if filters.keywords:
        # Search in content for any keyword
        keyword_conditions = [
            Interaction.content.ilike(f"%{kw}%") for kw in filters.keywords
        ]
        conditions.append(or_(*keyword_conditions))
    
    if filters.sentiment:
        conditions.append(Interaction.sentiment == filters.sentiment)
    
    if filters.priority_min:
        conditions.append(Interaction.priority_score >= filters.priority_min)
    
    if filters.priority_max:
        conditions.append(Interaction.priority_score <= filters.priority_max)
    
    if filters.status:
        conditions.append(Interaction.status.in_(filters.status))
    
    if filters.tags:
        # Check if interaction has any of the specified tags
        for tag in filters.tags:
            conditions.append(Interaction.tags.contains([tag]))
    
    if filters.categories:
        # Check if interaction has any of the specified categories
        for category in filters.categories:
            conditions.append(Interaction.categories.contains([category]))
    
    if filters.has_replies is not None:
        if filters.has_replies:
            conditions.append(Interaction.reply_count > 0)
        else:
            conditions.append(Interaction.reply_count == 0)
    
    if filters.is_unread is not None:
        if filters.is_unread:
            conditions.append(Interaction.status == 'unread')
        else:
            conditions.append(Interaction.status != 'unread')
    
    if filters.date_from:
        conditions.append(Interaction.created_at >= filters.date_from)
    
    if filters.date_to:
        conditions.append(Interaction.created_at <= filters.date_to)
    
    if filters.author_username:
        conditions.append(Interaction.author_username.ilike(f"%{filters.author_username}%"))
    
    if filters.assigned_to_user_id:
        conditions.append(Interaction.assigned_to_user_id == filters.assigned_to_user_id)
    
    if filters.fan_id:
        conditions.append(Interaction.fan_id == filters.fan_id)
    
    return base_query.where(and_(*conditions))


@router.post("/interactions", response_model=InteractionOut, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    payload: InteractionCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new interaction (typically from platform sync)."""
    # Check for duplicate platform_id
    existing = await session.execute(
        select(Interaction).where(Interaction.platform_id == payload.platform_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Interaction with this platform_id already exists")
    
    interaction = Interaction(
        **payload.model_dump(exclude={'platform_created_at'}),
        platform_created_at=payload.platform_created_at or datetime.utcnow(),
        user_id=current_user.id,
        organization_id=getattr(current_user, 'organization_id', None),
    )
    
    session.add(interaction)
    await session.commit()
    await session.refresh(interaction)

    # Trigger workflow evaluation
    from app.services.workflow_engine import WorkflowEngine
    workflow_engine = WorkflowEngine()
    try:
        workflow_results = await workflow_engine.process_interaction(
            db=session,
            interaction=interaction,
            user_id=current_user.id,
            organization_id=getattr(current_user, 'organization_id', None),
        )
        # Store workflow results in interaction metadata if needed
        if workflow_results:
            interaction.triggered_workflows = [r.get("workflow_id") for r in workflow_results if "workflow_id" in r]
            await session.commit()
    except Exception as e:
        # Log error but don't fail interaction creation
        logger.error(f"Workflow evaluation failed: {e}")

    # TODO: Update thread and fan records

    return interaction


@router.get("/interactions", response_model=InteractionList)
async def list_interactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("newest", description="newest, oldest, priority, engagement"),
    tab: Optional[str] = Query(None, description="all, unanswered, awaiting_approval, answered"),
    
    # Filter parameters
    platforms: Optional[List[str]] = Query(None),
    types: Optional[List[str]] = Query(None),
    keywords: Optional[List[str]] = Query(None),
    sentiment: Optional[str] = Query(None),
    priority_min: Optional[int] = Query(None, ge=1, le=100),
    priority_max: Optional[int] = Query(None, ge=1, le=100),
    status: Optional[List[str]] = Query(None),
    tags: Optional[List[str]] = Query(None),
    
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List interactions with filtering and pagination. V2: Supports tab-based filtering."""
    # Apply tab-based filtering (V2)
    if tab:
        if tab == "unanswered":
            status = ["unread", "read"]
        elif tab == "awaiting_approval":
            status = ["awaiting_approval"]
        elif tab == "answered":
            status = ["answered"]
        # "all" tab doesn't filter by status
    
    # Build filters
    filters = InteractionFilters(
        platforms=platforms,
        types=types,
        keywords=keywords,
        sentiment=sentiment,
        priority_min=priority_min,
        priority_max=priority_max,
        status=status,
        tags=tags,
    )
    
    # Build query
    query = select(Interaction)
    show_demo_data = (current_user.demo_mode_status == 'enabled')
    query = build_filter_query(query, filters, current_user.id, show_demo_data)
    
    # Apply sorting
    if sort_by == "newest":
        query = query.order_by(desc(Interaction.created_at))
    elif sort_by == "oldest":
        query = query.order_by(Interaction.created_at.asc())
    elif sort_by == "priority":
        query = query.order_by(desc(Interaction.priority_score), desc(Interaction.created_at))
    elif sort_by == "engagement":
        query = query.order_by(desc(Interaction.like_count + Interaction.reply_count), desc(Interaction.created_at))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await session.execute(query)
    interactions = list(result.scalars().all())
    
    return InteractionList(
        interactions=interactions,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(interactions)) < total
    )


@router.get("/interactions/by-view/{view_id}", response_model=InteractionList)
async def list_interactions_by_view(
    view_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: Optional[str] = Query(None, description="newest, oldest, priority, engagement - overrides view default"),
    tab: Optional[str] = Query(None, description="all, unanswered, awaiting_approval, answered"),
    platforms: Optional[List[str]] = Query(None, description="Filter by platforms - overrides view default"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List interactions filtered by a specific view's configuration.
    
    Query params (sort_by, tab, platforms) override view defaults.
    """
    # Get view
    view = await session.get(InteractionView, view_id)
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Check access
    if view.user_id != current_user.id:
        if not (view.is_shared and 
                hasattr(current_user, 'organization_id') and 
                view.organization_id == current_user.organization_id):
            raise HTTPException(status_code=404, detail="View not found")
    
    # Parse view filters
    filters = InteractionFilters(**view.filters)
    
    # Override with query params if provided
    if platforms:
        filters.platforms = platforms
    
    # Apply tab-based filtering (overrides view filters)
    if tab:
        if tab == "unanswered":
            filters.status = ["unread", "read"]
        elif tab == "awaiting_approval":
            filters.status = ["awaiting_approval"]
        elif tab == "answered":
            filters.status = ["answered"]
        # "all" tab doesn't filter by status
    
    # Build query
    query = select(Interaction)
    show_demo_data = (current_user.demo_mode_status == 'enabled')
    query = build_filter_query(query, filters, current_user.id, show_demo_data)
    
    # Apply sorting (query param overrides view default)
    effective_sort = sort_by or view.display.get('sortBy', 'newest')
    if effective_sort == "newest":
        query = query.order_by(desc(Interaction.created_at))
    elif effective_sort == "oldest":
        query = query.order_by(Interaction.created_at.asc())
    elif effective_sort == "priority":
        query = query.order_by(desc(Interaction.priority_score), desc(Interaction.created_at))
    elif effective_sort == "engagement":
        query = query.order_by(desc(Interaction.like_count + Interaction.reply_count), desc(Interaction.created_at))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute
    result = await session.execute(query)
    interactions = list(result.scalars().all())
    
    return InteractionList(
        interactions=interactions,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(interactions)) < total
    )


@router.get("/interactions/{interaction_id}", response_model=InteractionOut)
async def get_interaction(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific interaction by ID."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    return interaction


@router.patch("/interactions/{interaction_id}", response_model=InteractionOut)
async def update_interaction(
    interaction_id: UUID,
    payload: InteractionUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update an interaction."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(interaction, field, value)
    
    # Update read_at timestamp if marking as read
    if payload.status == 'read' and interaction.read_at is None:
        interaction.read_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(interaction)
    
    return interaction


@router.delete("/interactions/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interaction(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an interaction from platform and local database."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete from platform first (works for demo and real platforms)
    from app.services.platform_actions import get_platform_action_service
    
    platform_service = get_platform_action_service()
    result = await platform_service.delete_interaction(interaction, session)
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete from platform: {result.get('error', 'Unknown error')}"
        )
    
    # Platform delete successful, now delete from local database
    await session.delete(interaction)
    await session.commit()
    
    return None


@router.post("/interactions/bulk-action", response_model=BulkActionResponse)
async def bulk_action(
    payload: BulkActionRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Perform bulk actions on multiple interactions."""
    # Get interactions
    query = select(Interaction).where(
        and_(
            Interaction.id.in_(payload.interaction_ids),
            Interaction.user_id == current_user.id
        )
    )
    result = await session.execute(query)
    interactions = list(result.scalars().all())
    
    if not interactions:
        raise HTTPException(status_code=404, detail="No interactions found")
    
    updated_count = 0
    failed_ids = []
    
    for interaction in interactions:
        try:
            if payload.action == "tag":
                if interaction.tags is None:
                    interaction.tags = []
                if payload.value not in interaction.tags:
                    interaction.tags.append(payload.value)
            
            elif payload.action == "untag":
                if interaction.tags and payload.value in interaction.tags:
                    interaction.tags.remove(payload.value)
            
            elif payload.action == "mark_read":
                interaction.status = "read"
                if interaction.read_at is None:
                    interaction.read_at = datetime.utcnow()
            
            elif payload.action == "mark_unread":
                interaction.status = "unread"
                interaction.read_at = None
            
            elif payload.action == "archive":
                interaction.status = "archived"
            
            elif payload.action == "spam":
                interaction.status = "spam"
            
            elif payload.action == "assign":
                interaction.assigned_to_user_id = UUID(payload.value) if payload.value else None
            
            else:
                failed_ids.append(interaction.id)
                continue
            
            updated_count += 1
        
        except Exception as e:
            failed_ids.append(interaction.id)
            continue
    
    await session.commit()
    
    return BulkActionResponse(
        success=True,
        updated_count=updated_count,
        failed_ids=failed_ids,
        message=f"Successfully updated {updated_count} of {len(payload.interaction_ids)} interactions"
    )


# ==================== V2 ENDPOINTS: PRODUCTION-READY FEATURES ====================

@router.get("/interactions/{interaction_id}/context", response_model=InteractionContext)
async def get_interaction_context(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get rich context for an interaction including thread, parent content, and fan profile."""
    # Get main interaction
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    # Get thread messages if part of a thread
    thread_messages = []
    if interaction.thread_id:
        thread_query = select(Interaction).where(
            and_(
                Interaction.thread_id == interaction.thread_id,
                Interaction.id != interaction_id
            )
        ).order_by(Interaction.created_at.asc())
        thread_result = await session.execute(thread_query)
        thread_messages = list(thread_result.scalars().all())
    
    # Get parent content info (simplified for now)
    parent_content = None
    if interaction.parent_content_id:
        parent_content = {
            "id": interaction.parent_content_id,
            "title": interaction.parent_content_title,
            "url": interaction.parent_content_url,
        }
    
    # Get fan profile if available
    fan_profile = None
    if interaction.fan_id:
        from app.models.fan import Fan
        fan = await session.get(Fan, interaction.fan_id)
        if fan:
            fan_profile = {
                "id": str(fan.id),
                "username": fan.username,
                "total_interactions": fan.total_interactions,
                "is_superfan": fan.is_superfan,
                "is_customer": fan.is_customer,
            }
    
    # Get related interactions (same author, recent)
    related_query = select(Interaction).where(
        and_(
            Interaction.author_username == interaction.author_username,
            Interaction.user_id == current_user.id,
            Interaction.id != interaction_id
        )
    ).order_by(desc(Interaction.created_at)).limit(5)
    related_result = await session.execute(related_query)
    related_interactions = list(related_result.scalars().all())
    
    return InteractionContext(
        interaction=interaction,
        thread_messages=thread_messages,
        parent_content=parent_content,
        fan_profile=fan_profile,
        related_interactions=related_interactions,
    )


@router.get("/interactions/{interaction_id}/thread", response_model=InteractionThread)
async def get_interaction_thread(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get full conversation thread for an interaction."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if not interaction.thread_id:
        # Return single message if not part of thread
        return InteractionThread(
            id=interaction.id,
            messages=[interaction],
            participant_count=1,
            total_messages=1,
        )
    
    # Get all messages in thread
    thread_query = select(Interaction).where(
        Interaction.thread_id == interaction.thread_id
    ).order_by(Interaction.created_at.asc())
    
    result = await session.execute(thread_query)
    messages = list(result.scalars().all())
    
    # Count unique participants
    participants = set(msg.author_username for msg in messages if msg.author_username)
    
    return InteractionThread(
        id=interaction.thread_id,
        messages=messages,
        participant_count=len(participants),
        total_messages=len(messages),
    )


@router.post("/interactions/{interaction_id}/generate-response")
async def generate_response(
    interaction_id: UUID,
    payload: GenerateResponseRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Generate AI response for an interaction using Claude."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    # Check if API key is configured
    from app.core.config import settings
    api_key = settings.EFFECTIVE_ANTHROPIC_KEY
    
    if not api_key:
        raise HTTPException(
            status_code=503, 
            detail="AI response generation is not configured. Please set ANTHROPIC_API_KEY environment variable."
        )
    
    try:
        # Use Claude API (similar to AI assistant implementation)
        from anthropic import Anthropic
        
        client = Anthropic(api_key=api_key)
        
        # Build context
        context_parts = [
            f"Platform: {interaction.platform}",
            f"Type: {interaction.type}",
            f"User message: {interaction.content}",
        ]
        
        if interaction.parent_content_title:
            context_parts.append(f"Regarding: {interaction.parent_content_title}")
        
        if payload.context:
            context_parts.append(f"Additional context: {payload.context}")
        
        tone_instruction = ""
        if payload.tone:
            tone_instruction = f" Use a {payload.tone} tone."
        
        system_prompt = f"""You are an AI assistant helping content creators respond to their audience.
Generate a thoughtful, engaging response to the following interaction.{tone_instruction}
Keep it concise and authentic."""
        
        user_prompt = "\n".join(context_parts)
        
        # Generate response (using same model as demo-simulator)
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=500,
            temperature=0.7,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        
        generated_text = response.content[0].text
        
        # Store as pending response
        pending = PendingResponse(
            text=generated_text,
            generated_at=datetime.utcnow(),
            model="claude-sonnet-4-5-20250929",
            confidence=0.85,  # Placeholder
        )
        
        interaction.pending_response = pending.model_dump(mode='json')
        interaction.status = "awaiting_approval"
        
        await session.commit()
        await session.refresh(interaction)
        
        return {
            "success": True,
            "interaction_id": str(interaction.id),
            "pending_response": pending.model_dump(mode='json'),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")


@router.delete("/interactions/{interaction_id}/pending-response")
async def reject_pending_response(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Reject/clear a pending AI-generated response."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if not interaction.pending_response:
        raise HTTPException(status_code=400, detail="No pending response to reject")
    
    # Clear pending response and revert status
    interaction.pending_response = None
    interaction.status = "read" if interaction.status == "awaiting_approval" else interaction.status
    
    await session.commit()
    
    return {
        "success": True,
        "message": "Pending response rejected",
        "status": interaction.status,
    }


@router.post("/interactions/{interaction_id}/respond")
async def send_response(
    interaction_id: UUID,
    payload: SendResponseRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Send response to an interaction."""
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if payload.add_to_approval_queue:
        # Add to approval queue instead of sending
        pending = PendingResponse(
            text=payload.text,
            generated_at=datetime.utcnow(),
            model="manual",
        )
        interaction.pending_response = pending.model_dump(mode='json')
        interaction.status = "awaiting_approval"
        
        await session.commit()
        
        return {
            "success": True,
            "message": "Response added to approval queue",
            "status": "awaiting_approval",
        }
    
    if payload.send_immediately:
        # Send reply via platform (works for demo and real platforms)
        from app.services.platform_actions import get_platform_action_service
        
        platform_service = get_platform_action_service()
        result = await platform_service.send_reply(
            interaction,
            payload.text,
            session
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send response: {result.get('error', 'Unknown error')}"
            )
        
        # Create a reply interaction record so it shows in the thread
        from uuid import uuid4
        reply_interaction = Interaction(
            id=uuid4(),
            platform=interaction.platform,
            type='reply',  # Mark as your reply
            platform_id=result.get("reply_id", f"reply_{uuid4().hex[:12]}"),
            content=payload.text,
            author_username=current_user.email,  # Your username
            author_name=current_user.full_name or current_user.email,
            author_is_verified=True,  # You're verified as the creator
            status='answered',
            priority_score=0,  # Replies don't need priority
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            is_demo=interaction.is_demo,  # Match original interaction
            thread_id=interaction.thread_id or interaction.id,  # Link to thread
            parent_content_id=interaction.parent_content_id,
            parent_content_title=interaction.parent_content_title,
            parent_content_url=interaction.parent_content_url,
            reply_to_id=interaction.id,  # This is a reply to the original
            is_reply=True,
            created_at=datetime.utcnow(),
            platform_created_at=datetime.utcnow(),
        )
        
        # If original interaction doesn't have a thread_id, set it now
        if not interaction.thread_id:
            interaction.thread_id = interaction.id
            reply_interaction.thread_id = interaction.id
        
        session.add(reply_interaction)
        
        # Status and timestamps already updated by platform_service
        interaction.pending_response = None
        await session.commit()
        
        return {
            "success": True,
            "message": "Response sent successfully",
            "status": "answered",
            "reply_id": result.get("reply_id"),
            "thread_updated": True,
        }
    
    return {
        "success": False,
        "message": "Invalid request parameters",
    }
