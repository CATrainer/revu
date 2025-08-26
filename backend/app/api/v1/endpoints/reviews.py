"""
Reviews endpoints.

Review management and response operations.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.review import Review, ReviewResponse
from app.models.user import User, UserMembership
from app.models.location import Location
from app.schemas.review import (
    ReviewResponse as ReviewResponseSchema,
    ReviewListResponse,
    ReviewFilter,
    CreateResponseRequest,
    ReviewResponseCreate,
)
from app.services.demo_adapter import DemoDataAdapter

router = APIRouter()


@router.get("/", response_model=List[ReviewListResponse])
async def list_reviews(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: Optional[UUID] = None,
    platform: Optional[str] = None,
    rating: Optional[int] = Query(None, ge=1, le=5),
    sentiment: Optional[str] = None,
    needs_response: Optional[bool] = None,
    is_flagged: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
):
    """
    List reviews with filtering options.
    """
    # Base query - only reviews from user's locations
    query = (
        select(Review)
        .join(Location)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(UserMembership.user_id == current_user.id)
        .options(selectinload(Review.responses))
    )
    
    # Apply filters
    if location_id:
        query = query.where(Review.location_id == location_id)
    
    if platform:
        query = query.where(Review.platform == platform)
    
    if rating:
        query = query.where(Review.rating == rating)
    
    if sentiment:
        query = query.where(Review.sentiment == sentiment)
    
    if needs_response is not None:
        if needs_response:
            query = query.where(Review.review_reply.is_(None))
        else:
            query = query.where(Review.review_reply.is_not(None))
    
    if is_flagged is not None:
        query = query.where(Review.is_flagged == is_flagged)
    
    # Order by most recent first
    query = query.order_by(Review.published_at.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    reviews = result.scalars().all()
    return reviews


@router.get("/{review_id}", response_model=ReviewResponseSchema)
async def get_review(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    review_id: UUID,
):
    """
    Get a specific review by ID.
    """
    result = await db.execute(
        select(Review)
        .join(Location)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Review.id == review_id,
            UserMembership.user_id == current_user.id,
        )
        .options(
            selectinload(Review.responses).selectinload(ReviewResponse.created_by),
            selectinload(Review.location),
        )
    )
    review = result.scalar_one_or_none()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    return review


@router.post("/{review_id}/respond", response_model=ReviewResponseCreate)
async def create_response(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    review_id: UUID,
    response_in: CreateResponseRequest,
):
    """
    Create a response to a review.
    """
    # Get review and check permissions
    result = await db.execute(
        select(Review)
        .join(Location)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Review.id == review_id,
            UserMembership.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Create response
    review_response = ReviewResponse(
        review_id=review_id,
        response_text=response_in.response_text,
        response_type=response_in.response_type,
        ai_model=response_in.ai_model,
        created_by_id=current_user.id,
        status="draft" if response_in.send_immediately is False else "pending_approval",
    )
    db.add(review_response)
    
    # If auto-send is enabled, update status
    if response_in.send_immediately and response_in.response_type == "ai_generated":
        review_response.status = "approved"
        review_response.approval_by_id = current_user.id
        review_response.approval_at = datetime.utcnow()
        
        # TODO: Actually send to platform API
        # For now, just mark as sent
        review_response.status = "sent"
        review_response.sent_at = datetime.utcnow()
        
        # Update review with response
        review.review_reply = response_in.response_text
        review.replied_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(review_response)
    
    return review_response


@router.post("/{review_id}/tag")
async def add_tags(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    review_id: UUID,
    tags: List[str],
):
    """
    Add tags to a review.
    """
    # Get review
    result = await db.execute(
        select(Review)
        .join(Location)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Review.id == review_id,
            UserMembership.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Add tags (merge with existing)
    existing_tags = set(review.tags or [])
    new_tags = existing_tags.union(set(tags))
    review.tags = list(new_tags)
    
    await db.commit()
    
    return {"tags": review.tags}


@router.delete("/{review_id}/tag")
async def remove_tag(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    review_id: UUID,
    tag: str,
):
    """
    Remove a tag from a review.
    """
    # Get review
    result = await db.execute(
        select(Review)
        .join(Location)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Review.id == review_id,
            UserMembership.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Remove tag
    if review.tags and tag in review.tags:
        review.tags.remove(tag)
        await db.commit()
    
    return {"tags": review.tags}


@router.post("/{review_id}/flag")
async def flag_review(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    review_id: UUID,
    reason: str,
):
    """
    Flag a review for attention.
    """
    # Get review
    result = await db.execute(
        select(Review)
        .join(Location)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Review.id == review_id,
            UserMembership.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Flag review
    review.is_flagged = True
    review.flag_reason = reason
    
    await db.commit()
    
    return {"message": "Review flagged successfully"}