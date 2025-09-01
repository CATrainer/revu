"""
AI endpoints.

AI-powered response generation and brand voice management.
"""

from typing import Dict, Any, List, Optional
from uuid import UUID
import json
import re
import os

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
    BatchGenerateRequest,
    BatchGenerateResponse,
    BatchGenerateItem,
    BrandVoiceUpdate,
    BrandVoiceResponse,
)
from loguru import logger
from app.services.claude_service import ClaudeService
from sqlalchemy import text
from app.services.comment_classifier import create_fingerprint
from app.core.config import settings

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

    # Create fingerprint and attempt cache hit
    fp = create_fingerprint(yt.comment_text)
    from_cache = False
    ai_text = None
    try:
        cache_row = await db.execute(
            text(
                """
                SELECT response_template
                FROM response_cache
                WHERE fingerprint = :fp AND (expires_at IS NULL OR expires_at > now())
                LIMIT 1
                """
            ),
            {"fp": fp},
        )
        row = cache_row.first()
        if row and row[0]:
            ai_text = row[0]
            from_cache = True
            # Increment usage and update last_used_at
            await db.execute(
                text(
                    """
                    UPDATE response_cache
                    SET usage_count = usage_count + 1, last_used_at = now()
                    WHERE fingerprint = :fp
                    """
                ),
                {"fp": fp},
            )
    except Exception as e:
        logger.exception("Cache lookup failed: {}", e)

    # If no cache, generate response via Claude
    if not ai_text:
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

    # If newly generated (not from cache), store in response_cache with 30-day expiry
    if not from_cache and ai_text:
        try:
            # Try update first
            await db.execute(
                text(
                    """
                    UPDATE response_cache
                    SET response_template = :rtxt,
                        last_used_at = now(),
                        expires_at = now() + interval '30 days'
                    WHERE fingerprint = :fp
                    """
                ),
                {"fp": fp, "rtxt": ai_text},
            )
            # Insert if it does not exist
            await db.execute(
                text(
                    """
                    INSERT INTO response_cache (fingerprint, response_template, usage_count, last_used_at, expires_at)
                    SELECT :fp, :rtxt, 1, now(), now() + interval '30 days'
                    WHERE NOT EXISTS (
                        SELECT 1 FROM response_cache WHERE fingerprint = :fp
                    )
                    """
                ),
                {"fp": fp, "rtxt": ai_text},
            )
        except Exception as e:
            logger.exception("Failed to store response in cache: {}", e)

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


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Try to parse JSON from a model response, tolerating code fences or prose.

    Returns a dict on success, else None.
    """
    if not text:
        return None
    # Strip code fences if present
    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    blob = fenced.group(1) if fenced else text
    # Find first JSON object if extra prose surrounds it
    first_obj = re.search(r"\{[\s\S]*\}", blob)
    candidate = first_obj.group(0) if first_obj else blob
    try:
        return json.loads(candidate)
    except Exception:
        return None


@router.post("/batch-generate", response_model=BatchGenerateResponse)
async def batch_generate(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    request: BatchGenerateRequest,
):
    """Batch-generate AI replies for up to 5 YouTube comments in one Claude call.

    Steps:
    - Fetch comments from comments_queue by IDs.
    - Build one prompt with numbered comments.
    - Ask Claude for JSON: { "items": [{ "comment_id": str, "response_text": str }, ...] }
    - Persist ai_responses and mark queue rows completed.
    - Return all generated responses.
    """
    # Deduplicate and enforce max via schema; still ensure at runtime
    raw_ids: List[str] = list(dict.fromkeys(request.comment_ids))
    if not raw_ids:
        raise HTTPException(status_code=400, detail="comment_ids is required")
    if len(raw_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum of 5 comment_ids allowed")

    # Build a safe IN clause with bound parameters
    placeholders = ",".join([f":id{i}" for i in range(len(raw_ids))])
    params = {f"id{i}": cid for i, cid in enumerate(raw_ids)}

    # Fetch queue rows
    result = await db.execute(
        text(
            f"""
            SELECT id, comment_id, content, channel_id, video_id
            FROM comments_queue
            WHERE comment_id IN ({placeholders})
            """
        ),
        params,
    )
    rows = result.fetchall()
    by_comment_id = {r[1]: {"queue_id": r[0], "content": r[2], "channel_id": r[3], "video_id": r[4]} for r in rows}

    found_ids = [cid for cid in raw_ids if cid in by_comment_id]
    missing_ids = [cid for cid in raw_ids if cid not in by_comment_id]

    if not found_ids:
        # Nothing to process
        return BatchGenerateResponse(
            items=[BatchGenerateItem(comment_id=cid, error="not_found") for cid in raw_ids],
            metadata={"source": "youtube", "count": 0},
        )

    # Mark found queue rows as processing
    placeholders2 = ",".join([f":pid{i}" for i in range(len(found_ids))])
    params2 = {f"pid{i}": cid for i, cid in enumerate(found_ids)}
    await db.execute(
        text(
            f"""
            UPDATE comments_queue
            SET status = 'processing', processed_at = now()
            WHERE comment_id IN ({placeholders2})
            """
        ),
        params2,
    )

    # Compose the prompt
    numbered = []
    for idx, cid in enumerate(found_ids, start=1):
        content = by_comment_id[cid]["content"] or ""
        content = content.strip().replace("\n", " ")
        numbered.append(f"{idx}. id={cid}: {content}")

    system_prompt = (
        "You write brief, friendly, professional replies to YouTube comments. "
        "Return ONLY valid compact JSON. No extra text. Keep each reply under 2 sentences."
    )
    user_prompt = (
        "Reply to each numbered comment below. Return a JSON object with an 'items' array, "
        "where each item has: {\"comment_id\": string, \"response_text\": string}.\n\n"
        + "\n".join(numbered)
    )

    # Call Claude directly for batch
    claude = ClaudeService()
    if not getattr(claude, "client", None):
        raise HTTPException(status_code=502, detail="AI service is unavailable")

    model = getattr(settings, "CLAUDE_MODEL", None) or os.getenv("CLAUDE_MODEL") or "claude-3-5-sonnet-latest"

    try:
        resp = claude.client.messages.create(
            model=model,
            max_tokens=getattr(settings, "CLAUDE_MAX_TOKENS", None) or int(os.getenv("CLAUDE_MAX_TOKENS", "400")),
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=0.2,
        )
        content = getattr(resp, "content", None)
        if isinstance(content, list) and content:
            first = content[0]
            text_out = getattr(first, "text", None) or (first.get("text") if isinstance(first, dict) else None)
        else:
            text_out = getattr(resp, "output_text", None)
    except Exception as e:
        logger.exception("Claude batch generation error: {}", e)
        text_out = None

    if not text_out:
        # Mark as failed
        await db.execute(
            text(
                f"""
                UPDATE comments_queue SET status = 'failed', processed_at = now()
                WHERE comment_id IN ({placeholders2})
                """
            ),
            params2,
        )
        await db.commit()
        raise HTTPException(status_code=502, detail="AI generation failed")

    data = _extract_json(text_out)
    results_map: Dict[str, str] = {}
    if data and isinstance(data, dict):
        items = data.get("items")
        if isinstance(items, list):
            for it in items:
                cid = (it or {}).get("comment_id")
                rtxt = (it or {}).get("response_text")
                if isinstance(cid, str) and isinstance(rtxt, str):
                    results_map[cid] = rtxt

    # Prepare response items for all requested IDs
    response_items: List[BatchGenerateItem] = []
    to_complete_ids: List[str] = []
    for cid in raw_ids:
        if cid in results_map and cid in by_comment_id:
            response_items.append(BatchGenerateItem(comment_id=cid, response_text=results_map[cid]))
            to_complete_ids.append(cid)
        elif cid in missing_ids:
            response_items.append(BatchGenerateItem(comment_id=cid, error="not_found"))
        else:
            response_items.append(BatchGenerateItem(comment_id=cid, error="no_response"))

    # Insert ai_responses for those generated
    if to_complete_ids:
        placeholders3 = ",".join([f":cid{i}" for i in range(len(to_complete_ids))])
        params3 = {f"cid{i}": x for i, x in enumerate(to_complete_ids)}

        # Build per-row inserts using a VALUES table from selected queue rows
        await db.execute(
            text(
                f"""
                INSERT INTO ai_responses (queue_id, response_text, passed_safety, safety_checked_at, created_at)
                SELECT cq.id, COALESCE(rtxt_map.response_text, ''), false, now(), now()
                FROM comments_queue cq
                JOIN (
                    VALUES {','.join(['(:v_id'+str(i)+', :v_txt'+str(i)+')' for i in range(len(to_complete_ids))])}
                ) AS rtxt_map(comment_id, response_text)
                ON rtxt_map.comment_id = cq.comment_id
                WHERE cq.comment_id IN ({placeholders3})
                """
            ),
            {
                **params3,
                **{f"v_id{i}": cid for i, cid in enumerate(to_complete_ids)},
                **{f"v_txt{i}": results_map[cid] for i, cid in enumerate(to_complete_ids)},
            },
        )

        # Mark completed
        await db.execute(
            text(
                f"""
                UPDATE comments_queue
                SET status = 'completed', processed_at = now()
                WHERE comment_id IN ({placeholders3})
                """
            ),
            params3,
        )

    await db.commit()

    return BatchGenerateResponse(
        items=response_items,
        metadata={"source": "youtube", "count": len(to_complete_ids)},
    )
