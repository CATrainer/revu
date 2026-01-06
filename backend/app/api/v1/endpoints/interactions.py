"""API endpoints for interactions (comments, DMs, mentions)."""
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
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
    
    # Reply filters - control whether to show/hide our outgoing replies (type='reply')
    if filters.outgoing_replies_only:
        # Sent view: Only show our outgoing replies
        conditions.append(Interaction.type == 'reply')
    elif filters.exclude_outgoing_replies is not False:
        # Default: Exclude our outgoing replies from main list (they appear in thread view)
        # Incoming responses from fans (type='comment', 'dm') still show up
        conditions.append(Interaction.type != 'reply')
    
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
    
    # Archive filters
    if filters.exclude_archived:
        conditions.append(Interaction.archived_at.is_(None))
    
    if filters.archived_only:
        conditions.append(Interaction.archived_at.isnot(None))
    
    # Sent/Response filters
    if filters.exclude_sent:
        # Exclude interactions that have been responded to, UNLESS there's new activity after the response
        # An interaction should show in "All" if:
        # 1. It has never been responded to (responded_at is None), OR
        # 2. It has new activity after the response (last_activity_at > responded_at)
        conditions.append(
            or_(
                Interaction.responded_at.is_(None),
                Interaction.last_activity_at > Interaction.responded_at
            )
        )
    
    if filters.has_sent_response:
        # Only show interactions that have been responded to
        conditions.append(Interaction.responded_at.isnot(None))
    
    return base_query.where(and_(*conditions))


@router.post("/interactions", response_model=InteractionOut, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    payload: InteractionCreate,
    background_tasks: BackgroundTasks,
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

    # STEP 1: Tag interaction for views FIRST (required for workflow view scope)
    # This must happen before workflow evaluation
    try:
        from app.services.view_classifier import ViewClassifierService
        classifier = ViewClassifierService(session)
        tags = await classifier.classify_interaction_for_all_views(
            interaction=interaction,
            user_id=current_user.id
        )
        await session.commit()
        logger.info(f"Tagged interaction {interaction.id} for {len(tags)} views")
    except Exception as e:
        logger.error(f"View tagging failed: {e}")

    # STEP 2: Run workflow evaluation with V2 engine
    # Only ONE workflow runs per interaction (highest priority wins)
    from app.services.workflow_engine_v2 import get_workflow_engine
    workflow_engine = get_workflow_engine(session)
    try:
        workflow_result = await workflow_engine.process_interaction(
            interaction=interaction,
            user_id=current_user.id,
        )
        if workflow_result:
            logger.info(f"Workflow '{workflow_result['workflow_name']}' executed for interaction {interaction.id}")
        await session.commit()
    except Exception as e:
        # Log error but don't fail interaction creation
        logger.error(f"Workflow evaluation failed: {e}")

    return interaction


async def tag_interaction_for_all_views(interaction_id: str, user_id: str):
    """Background task to tag an interaction against all custom views.
    
    - AI views: Uses LLM classification
    - Manual views: Uses keyword/filter matching (no LLM needed)
    """
    from uuid import UUID
    from app.core.database import async_session_maker
    from app.services.view_classifier import ViewClassifierService
    
    async with async_session_maker() as session:
        interaction = await session.get(Interaction, UUID(interaction_id))
        if not interaction:
            logger.error(f"Interaction {interaction_id} not found for view tagging")
            return
        
        classifier = ViewClassifierService(session)
        tags = await classifier.classify_interaction_for_all_views(
            interaction=interaction,
            user_id=UUID(user_id)
        )
        await session.commit()
        logger.info(f"Tagged interaction {interaction_id} for {len(tags)} views")


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
    
    For AI views: Uses pre-computed tags to filter interactions
    For Manual views: Uses traditional filter parameters
    
    Query params (sort_by, tab, platforms) override view defaults.
    """
    from app.models.view_tag import InteractionViewTag
    
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
    
    show_demo_data = (current_user.demo_mode_status == 'enabled')
    
    # Handle AI-filtered views differently
    if view.filter_mode == 'ai' and not view.is_system:
        # For AI views, query based on pre-computed tags
        query = (
            select(Interaction)
            .join(InteractionViewTag, InteractionViewTag.interaction_id == Interaction.id)
            .where(
                and_(
                    InteractionViewTag.view_id == view_id,
                    InteractionViewTag.matches == True,
                    Interaction.user_id == current_user.id,
                    Interaction.is_demo == show_demo_data
                )
            )
        )
        
        # Apply tab filters on top of AI view results
        if tab:
            if tab == "unanswered":
                query = query.where(and_(
                    Interaction.status.in_(["unread", "read"]),
                    Interaction.archived_at.is_(None),
                    or_(Interaction.responded_at.is_(None), Interaction.last_activity_at > Interaction.responded_at)
                ))
            elif tab == "awaiting_approval":
                query = query.where(and_(
                    Interaction.status == "awaiting_approval",
                    Interaction.archived_at.is_(None)
                ))
            elif tab == "archive":
                query = query.where(Interaction.archived_at.isnot(None))
            elif tab == "sent":
                query = query.where(and_(
                    Interaction.responded_at.isnot(None),
                    Interaction.archived_at.is_(None)
                ))
        
        # Apply platform filter if specified
        if platforms:
            query = query.where(Interaction.platform.in_(platforms))
    else:
        # For manual/system views, use traditional filter approach
        filters = InteractionFilters(**view.filters)
        
        # Override with query params if provided
        if platforms:
            filters.platforms = platforms
        
        # Apply tab-based filtering for custom views
        # Tabs act as subsets within the custom view's criteria
        if tab:
            if tab == "unanswered":
                # Show interactions that haven't been responded to yet
                filters.status = ["unread", "read"]
                filters.exclude_sent = True
                filters.exclude_archived = True
            elif tab == "awaiting_approval":
                # Show AI-generated responses pending approval
                filters.status = ["awaiting_approval"]
                filters.exclude_archived = True
            elif tab == "archive":
                # Show archived interactions within this view's criteria
                filters.archived_only = True
                # Clear exclude_archived if it was set by view
                filters.exclude_archived = None
            elif tab == "sent":
                # Show our outgoing replies
                filters.outgoing_replies_only = True
                filters.exclude_archived = True
                # Clear exclude_sent if it was set
                filters.exclude_sent = None
        
        # Build query
        query = select(Interaction)
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
    else:
        # For demo content without thread_id, look for replies via reply_to_id
        replies_query = select(Interaction).where(
            Interaction.reply_to_id == interaction_id
        ).order_by(Interaction.created_at.asc())
        replies_result = await session.execute(replies_query)
        thread_messages = list(replies_result.scalars().all())
    
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
        # For demo content without thread_id, look for replies via reply_to_id
        replies_query = select(Interaction).where(
            Interaction.reply_to_id == interaction.id
        ).order_by(Interaction.created_at.asc())
        replies_result = await session.execute(replies_query)
        replies = list(replies_result.scalars().all())
        
        if replies:
            # Include original + replies as the "thread"
            messages = [interaction] + replies
            participants = set(msg.author_username for msg in messages if msg.author_username)
            return InteractionThread(
                id=interaction.id,
                messages=messages,
                participant_count=len(participants),
                total_messages=len(messages),
            )
        
        # No replies, return single message
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
        # Use the new response generator with smart length and context
        from app.services.response_generator import get_response_generator
        
        generator = get_response_generator(session)
        
        # Get previous response for regeneration (if this is a regenerate request)
        previous_response = None
        if interaction.pending_response and interaction.pending_response.get('text'):
            previous_response = interaction.pending_response.get('text')
        
        generated_text = await generator.generate_response(
            interaction=interaction,
            user_id=current_user.id,
            tone=payload.tone or "friendly",
            previous_response=previous_response,
        )
        
        # Store as pending response
        pending = PendingResponse(
            text=generated_text,
            generated_at=datetime.utcnow(),
            model="claude-3-5-sonnet-latest",
            confidence=0.85,
        )
        
        interaction.pending_response = pending.model_dump(mode='json')
        interaction.status = "awaiting_approval"
        interaction.last_activity_at = datetime.utcnow()
        
        await session.commit()
        await session.refresh(interaction)
        
        return {
            "success": True,
            "interaction_id": str(interaction.id),
            "pending_response": pending.model_dump(mode='json'),
        }
        
    except Exception as e:
        logger.error(f"Failed to generate response: {e}")
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
        from app.services.sent_response_service import get_sent_response_service
        
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
        
        # Determine response type and track AI details
        response_type = 'manual'
        ai_model = None
        was_edited = False
        original_ai_text = None
        workflow_id = None
        
        if interaction.pending_response:
            # This was an AI-generated response (semi-automated)
            response_type = 'semi_automated'
            ai_model = interaction.pending_response.get('model')
            original_ai_text = interaction.pending_response.get('text')
            was_edited = (payload.text != original_ai_text)
            workflow_id = interaction.pending_response.get('workflow_id')
        
        # Record the sent response in sent_responses table
        sent_service = get_sent_response_service(session)
        await sent_service.record_sent_response(
            interaction_id=interaction.id,
            response_text=payload.text,
            user_id=current_user.id,
            response_type=response_type,
            ai_model=ai_model,
            was_edited=was_edited,
            original_ai_text=original_ai_text,
            workflow_id=UUID(workflow_id) if workflow_id else None,
            platform_response_id=result.get("reply_id"),
            organization_id=current_user.organization_id,
            is_demo=interaction.is_demo,
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
            thread_id=interaction.thread_id,  # Only set if original has one (FK constraint)
            parent_content_id=interaction.parent_content_id,
            parent_content_title=interaction.parent_content_title,
            parent_content_url=interaction.parent_content_url,
            reply_to_id=interaction.id,  # This is a reply to the original
            is_reply=True,
            created_at=datetime.utcnow(),
            platform_created_at=datetime.utcnow(),
            last_activity_at=datetime.utcnow(),
        )
        
        session.add(reply_interaction)
        
        # Update original interaction
        interaction.pending_response = None
        interaction.status = 'answered'
        interaction.responded_at = datetime.utcnow()  # Required for Sent view filter
        interaction.last_activity_at = datetime.utcnow()
        await session.commit()
        
        return {
            "success": True,
            "message": "Response sent successfully",
            "status": "answered",
            "reply_id": result.get("reply_id"),
            "thread_updated": True,
            "response_type": response_type,
        }
    
    return {
        "success": False,
        "message": "Invalid request parameters",
    }


@router.post("/interactions/{interaction_id}/approve-response")
async def approve_response(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Quick approve and send a pending AI-generated response.
    
    This is used from the Awaiting Approval view for one-click approval.
    """
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if not interaction.pending_response:
        raise HTTPException(status_code=400, detail="No pending response to approve")
    
    pending_text = interaction.pending_response.get('text', '')
    if not pending_text:
        raise HTTPException(status_code=400, detail="Pending response has no content")
    
    # Send the response via platform
    from app.services.platform_actions import get_platform_action_service
    from app.services.sent_response_service import get_sent_response_service
    
    platform_service = get_platform_action_service()
    result = await platform_service.send_reply(
        interaction,
        pending_text,
        session
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send response: {result.get('error', 'Unknown error')}"
        )
    
    # Determine if this was fully automated (auto-approved) or semi-automated (user approved)
    response_type = 'semi_automated'  # User clicked approve
    ai_model = interaction.pending_response.get('model')
    workflow_id = interaction.pending_response.get('workflow_id')
    
    # Record the sent response
    sent_service = get_sent_response_service(session)
    await sent_service.record_sent_response(
        interaction_id=interaction.id,
        response_text=pending_text,
        user_id=current_user.id,
        response_type=response_type,
        ai_model=ai_model,
        was_edited=False,  # Quick approve means no edits
        original_ai_text=pending_text,
        workflow_id=UUID(workflow_id) if workflow_id else None,
        platform_response_id=result.get("reply_id"),
        organization_id=current_user.organization_id,
        is_demo=interaction.is_demo,
    )
    
    # Create reply interaction record
    from uuid import uuid4
    reply_interaction = Interaction(
        id=uuid4(),
        platform=interaction.platform,
        type='reply',
        platform_id=result.get("reply_id", f"reply_{uuid4().hex[:12]}"),
        content=pending_text,
        author_username=current_user.email,
        author_name=current_user.full_name or current_user.email,
        author_is_verified=True,
        status='answered',
        priority_score=0,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        is_demo=interaction.is_demo,
        thread_id=interaction.thread_id,  # Only set if original has one (FK constraint)
        parent_content_id=interaction.parent_content_id,
        parent_content_title=interaction.parent_content_title,
        parent_content_url=interaction.parent_content_url,
        reply_to_id=interaction.id,
        is_reply=True,
        created_at=datetime.utcnow(),
        platform_created_at=datetime.utcnow(),
        last_activity_at=datetime.utcnow(),
    )
    
    session.add(reply_interaction)
    
    # Update original interaction - clear pending and mark as answered
    interaction.pending_response = None
    interaction.status = 'answered'
    interaction.responded_at = datetime.utcnow()  # Required for Sent view filter
    interaction.last_activity_at = datetime.utcnow()
    await session.commit()
    
    return {
        "success": True,
        "message": "Response approved and sent",
        "reply_id": result.get("reply_id"),
        "response_type": response_type,
    }


# ==================== ARCHIVE ENDPOINTS ====================

@router.post("/interactions/{interaction_id}/archive")
async def archive_single_interaction(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Archive a single interaction."""
    from app.services.archive_service import get_archive_service
    
    archive_service = get_archive_service(session)
    archived_count = await archive_service.manual_archive([interaction_id], current_user.id)
    await session.commit()
    
    return {
        "success": True,
        "archived": archived_count > 0,
        "message": "Interaction archived" if archived_count > 0 else "Interaction not found"
    }


@router.post("/interactions/{interaction_id}/unarchive")
async def unarchive_single_interaction(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Unarchive a single interaction."""
    from app.services.archive_service import get_archive_service
    
    archive_service = get_archive_service(session)
    unarchived_count = await archive_service.unarchive([interaction_id], current_user.id)
    await session.commit()
    
    return {
        "success": True,
        "unarchived": unarchived_count > 0,
        "message": "Interaction restored" if unarchived_count > 0 else "Interaction not found"
    }


@router.post("/interactions/archive")
async def archive_interactions(
    interaction_ids: List[UUID],
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Manually archive one or more interactions."""
    from app.services.archive_service import get_archive_service
    
    archive_service = get_archive_service(session)
    archived_count = await archive_service.manual_archive(interaction_ids, current_user.id)
    await session.commit()
    
    return {
        "success": True,
        "archived_count": archived_count,
        "message": f"Archived {archived_count} interactions"
    }


@router.post("/interactions/unarchive")
async def unarchive_interactions(
    interaction_ids: List[UUID],
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Restore archived interactions."""
    from app.services.archive_service import get_archive_service
    
    archive_service = get_archive_service(session)
    unarchived_count = await archive_service.unarchive(interaction_ids, current_user.id)
    await session.commit()
    
    return {
        "success": True,
        "unarchived_count": unarchived_count,
        "message": f"Restored {unarchived_count} interactions"
    }


@router.delete("/interactions/archive/permanent")
async def permanently_delete_archived(
    interaction_ids: List[UUID],
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Permanently delete archived interactions."""
    from app.services.archive_service import get_archive_service
    
    archive_service = get_archive_service(session)
    deleted_count = await archive_service.permanent_delete(interaction_ids, current_user.id)
    await session.commit()
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"Permanently deleted {deleted_count} interactions"
    }


@router.get("/interactions/archive/stats")
async def get_archive_stats(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get archive statistics for the current user."""
    from app.services.archive_service import get_archive_service
    
    archive_service = get_archive_service(session)
    stats = await archive_service.get_archive_stats(current_user.id)
    
    return stats


# ==================== SENT RESPONSES ENDPOINTS ====================

@router.get("/interactions/sent")
async def get_sent_responses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    response_type: Optional[str] = Query(None, description="Filter by type: manual, semi_automated, automated"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get history of sent responses with their original interactions."""
    from app.services.sent_response_service import get_sent_response_service
    
    is_demo = current_user.demo_mode_status == 'enabled'
    service = get_sent_response_service(session)
    
    responses, total = await service.get_sent_responses(
        user_id=current_user.id,
        is_demo=is_demo,
        page=page,
        page_size=page_size,
        response_type=response_type,
    )
    
    return {
        "responses": responses,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.get("/interactions/sent/stats")
async def get_sent_response_stats(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get statistics about sent responses."""
    from app.services.sent_response_service import get_sent_response_service
    
    is_demo = current_user.demo_mode_status == 'enabled'
    service = get_sent_response_service(session)
    
    stats = await service.get_response_stats(current_user.id, is_demo)
    
    return stats


# ==================== SYSTEM SETUP ENDPOINT ====================

@router.post("/interactions/setup-system")
async def setup_interactions_system(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Set up system views and workflows for the current user.
    
    This is called automatically on first login or can be triggered manually.
    Creates the 4 permanent views (All, Awaiting Approval, Archive, Sent)
    and system workflows (Auto Moderator, Auto Archive).
    """
    from app.services.system_views_service import get_system_views_service
    
    service = get_system_views_service(session)
    result = await service.setup_user_interactions_system(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
    )
    await session.commit()
    
    return {
        "success": True,
        **result,
    }
