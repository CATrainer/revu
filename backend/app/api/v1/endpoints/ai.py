"""
AI endpoints.

AI-powered response generation and brand voice management.
"""

from typing import Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User, UserMembership
from app.models.location import Location
from app.schemas.ai import (
    GenerateResponseResponse,
    GenerateYouTubeCommentRequest,
    BrandVoiceUpdate,
    BrandVoiceResponse,
)
from loguru import logger
from app.services.claude_service import ClaudeService
from sqlalchemy import text

router = APIRouter()


@router.post("/generate-response", response_model=GenerateResponseResponse)
async def generate_response(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    request: GenerateYouTubeCommentRequest,
):
    """Generate an AI response for a YouTube comment and persist queue/response."""
    yt: GenerateYouTubeCommentRequest = request
    # Upsert into comments_queue on unique comment_id and mark processing
    try:
        result = await db.execute(
            text(
                """
                INSERT INTO comments_queue (channel_id, video_id, comment_id, content, status, priority, created_at)
                VALUES (:channel_id, :video_id, :comment_id, :content, 'processing', 0, now())
                ON CONFLICT (comment_id) DO UPDATE SET status = EXCLUDED.status, content = EXCLUDED.content
                RETURNING id
                """
            ),
            {
                "channel_id": str(yt.channel_id),
                "video_id": str(yt.video_id),
                "comment_id": yt.comment_id,
                "content": yt.comment_text,
            },
        )
        queue_row = result.first()
        if queue_row is None:
            raise RuntimeError("Failed to upsert comments_queue row")
        queue_id = queue_row[0]
    except Exception as e:
        logger.exception("Failed to upsert into comments_queue: {}", e)
        raise HTTPException(status_code=500, detail="Failed to enqueue comment")

    # Generate response via Claude
    claude = ClaudeService()
    try:
        ai_text = claude.generate_response(
            comment_text=yt.comment_text,
            channel_name=str(yt.channel_id),
            video_title=yt.video_title,
        )
    except Exception as e:
        logger.exception("Claude generation error: {}", e)
        ai_text = None

    if not ai_text:
        # Update queue to failed
        await db.execute(
            text("UPDATE comments_queue SET status = 'failed', processed_at = now() WHERE id = :qid"),
            {"qid": queue_id},
        )
        await db.commit()
        raise HTTPException(status_code=502, detail="AI generation failed")

    # Store into ai_responses and complete queue
    try:
        await db.execute(
            text(
                """
                INSERT INTO ai_responses (queue_id, response_text, passed_safety, safety_checked_at, created_at)
                VALUES (:qid, :rtxt, false, now(), now())
                """
            ),
            {"qid": str(queue_id), "rtxt": ai_text},
        )
        await db.execute(
            text("UPDATE comments_queue SET status = 'completed', processed_at = now() WHERE id = :qid"),
            {"qid": queue_id},
        )
        await db.commit()
    except Exception as e:
        logger.exception("Failed to persist AI response: {}", e)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to store AI response")

    return GenerateResponseResponse(
        response_text=ai_text,
        alternatives=[],
        metadata={"source": "youtube"},
    )
    # Get review and verify access
    result = await db.execute(
        select(Review, Location)
        .join(Location, Review.location_id == Location.id)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Review.id == request.review_id,
            UserMembership.user_id == current_user.id,
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    review, location = row
    
    # TODO: Implement actual AI generation with OpenAI
    # For now, return a mock response
    
    # Get brand voice settings
    brand_voice = location.get_brand_voice()
    
    # Mock AI response based on review sentiment
    if review.rating >= 4:
        response_text = (
            f"Thank you so much for your wonderful {review.rating}-star review, {review.author_name or 'valued customer'}! "
            f"We're delighted to hear you had such a positive experience. "
            f"Your feedback means the world to us, and we can't wait to welcome you back soon!"
        )
    elif review.rating == 3:
        response_text = (
            f"Thank you for taking the time to share your feedback, {review.author_name or 'valued customer'}. "
            f"We appreciate your honest review and are always looking for ways to improve. "
            f"We'd love the opportunity to provide you with an even better experience next time."
        )
    else:
        response_text = (
            f"Thank you for your feedback, {review.author_name or 'valued customer'}. "
            f"We're genuinely sorry to hear that your experience didn't meet expectations. "
            f"Your comments are invaluable in helping us improve. "
            f"Please reach out to us directly so we can make things right."
        )
    
    # Apply brand voice tone adjustments
    if brand_voice.get("tone") == "casual":
        response_text = response_text.replace("Thank you so much", "Thanks so much")
        response_text = response_text.replace("We're delighted", "We're thrilled")
    elif brand_voice.get("tone") == "formal":
        response_text = response_text.replace("Thanks", "Thank you")
        response_text = response_text.replace("We're thrilled", "We are delighted")
    
    return GenerateResponseResponse(
        response_text=response_text,
        alternatives=[
            response_text.replace("Thank you", "We appreciate"),
            response_text + " Looking forward to serving you again!",
        ],
        metadata={
            "model": "gpt-4",
            "brand_voice_applied": True,
            "sentiment_detected": review.sentiment or "neutral",
        }
    )


@router.get("/voice-profile/{location_id}", response_model=BrandVoiceResponse)
async def get_brand_voice(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
):
    """
    Get brand voice profile for a location.
    """
    # Get location and verify access
    result = await db.execute(
        select(Location)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Location.id == location_id,
            UserMembership.user_id == current_user.id,
        )
    )
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    
    return BrandVoiceResponse(
        location_id=location.id,
        brand_voice=location.get_brand_voice(),
        business_info=location.get_business_info(),
    )


@router.put("/voice-profile/{location_id}", response_model=BrandVoiceResponse)
async def update_brand_voice(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
    update: BrandVoiceUpdate,
):
    """
    Update brand voice profile for a location.
    """
    # Get location and verify access with appropriate permissions
    result = await db.execute(
        select(Location, UserMembership)
        .join(UserMembership, UserMembership.organization_id == Location.organization_id)
        .where(
            Location.id == location_id,
            UserMembership.user_id == current_user.id,
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    
    location, membership = row
    
    # Check permissions
    if membership.role not in ["owner", "admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update brand voice",
        )
    
    # Update brand voice and business info
    if update.brand_voice is not None:
        location.brand_voice_data = {**location.brand_voice_data, **update.brand_voice}
    
    if update.business_info is not None:
        location.business_info = {**location.business_info, **update.business_info}
    
    await db.commit()
    await db.refresh(location)
    
    return BrandVoiceResponse(
        location_id=location.id,
        brand_voice=location.get_brand_voice(),
        business_info=location.get_business_info(),
    )


@router.post("/train-voice")
async def train_brand_voice(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    location_id: UUID,
    training_data: Dict[str, Any],
):
    """
    Train AI on brand voice using example responses.
    """
    # TODO: Implement training logic
    # This would involve:
    # 1. Storing example responses
    # 2. Fine-tuning or creating prompts
    # 3. Updating brand voice settings
    
    return {
        "message": "Brand voice training initiated",
        "status": "pending",
        "estimated_time": "2-3 minutes",
    }
