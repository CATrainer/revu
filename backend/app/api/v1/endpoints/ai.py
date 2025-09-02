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
from app.services.safety_validator import quick_safety_check, schedule_safety_check
from app.services.youtube_service import YouTubeService
from datetime import timedelta
from app.services.batch_processor import BatchProcessor, QueueItem
from app.utils import debug_log

router = APIRouter()

# Buffer for deferred AI safety validation
SAFETY_BUFFER: List[Dict[str, Any]] = []
SAFETY_BATCH_SIZE = 10


async def _run_ai_safety_batch(db: AsyncSession) -> None:
    """Run AI safety validation for up to SAFETY_BATCH_SIZE buffered items.

    Each item: { queue_id: str, response_text: str, original_comment: str }
    Updates ai_responses: passed_safety, safety_checked_at, safety_notes.
    """
    if not SAFETY_BUFFER:
        return
    batch = SAFETY_BUFFER[:SAFETY_BATCH_SIZE]
    del SAFETY_BUFFER[: len(batch)]

    if not batch:
        return

    # Build prompt for Claude to validate all
    system_prompt = (
        "You are a strict safety validator for YouTube replies. For each item, decide if the AI response is appropriate, "
        "on-topic with the original comment, and safe. Consider harassment, hate, sexual content, self-harm, PII, scams, "
        "external links, and dangerous instructions. Return ONLY JSON: {\"items\": [{\"queue_id\": str, \"is_safe\": bool, \"reason\": str}]}"
    )
    numbered = []
    for i, it in enumerate(batch, start=1):
        qid = it.get("queue_id")
        oc = (it.get("original_comment") or "").replace("\n", " ")
        rt = (it.get("response_text") or "").replace("\n", " ")
        numbered.append(f"{i}. queue_id={qid}\nOriginal: {oc}\nResponse: {rt}")
    user_prompt = (
        "Validate the following items and return JSON with an items array as specified.\n\n"
        + "\n\n".join(numbered)
    )

    claude = ClaudeService()
    if not getattr(claude, "client", None):
        # Can't run AI validation; leave pending
        return

    try:
        model = getattr(settings, "CLAUDE_MODEL", None) or os.getenv("CLAUDE_MODEL") or "claude-3-5-sonnet-latest"
        resp = claude.client.messages.create(
            model=model,
            max_tokens=getattr(settings, "CLAUDE_MAX_TOKENS", None) or int(os.getenv("CLAUDE_MAX_TOKENS", "300")),
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=0.0,
        )
        content = getattr(resp, "content", None)
        if isinstance(content, list) and content:
            first = content[0]
            text_out = getattr(first, "text", None) or (first.get("text") if isinstance(first, dict) else None)
        else:
            text_out = getattr(resp, "output_text", None)
    except Exception as e:
        logger.exception("Claude safety batch error: {}", e)
        return

    data = _extract_json(text_out or "")
    if not isinstance(data, dict):
        return
    items = data.get("items")
    if not isinstance(items, list):
        return

    # Build VALUES mapping for updates
    updates: List[Dict[str, Any]] = []
    for it in items:
        try:
            qid = str(it.get("queue_id"))
            is_safe = bool(it.get("is_safe", False))
            reason = str(it.get("reason", ""))
            if qid:
                updates.append({"qid": qid, "safe": is_safe, "notes": reason})
        except Exception:
            continue

    if not updates:
        return

    # Construct dynamic SQL to update ai_responses joined by queue_id
    values_clause = ",".join([f"(:qid{i}, :safe{i}, :notes{i})" for i in range(len(updates))])
    params: Dict[str, Any] = {}
    for i, u in enumerate(updates):
        params[f"qid{i}"] = u["qid"]
        params[f"safe{i}"] = u["safe"]
        params[f"notes{i}"] = u["notes"]

    await db.execute(
        text(
            f"""
            UPDATE ai_responses ar
            SET passed_safety = v.safe,
                safety_checked_at = now(),
                safety_notes = v.notes
            FROM (
                VALUES {values_clause}
            ) AS v(queue_id, safe, notes)
            WHERE ar.queue_id::text = v.queue_id
            """
        ),
        params,
    )
    await db.commit()


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
    # Debug: start cache lookup
    if os.getenv("TESTING_MODE", "false").lower() == "true":
        debug_log.add("cache.lookup.start", {"fp": fp, "comment_len": len(yt.comment_text or "")})
    try:
        # Isolate cache lookup and usage increment in a SAVEPOINT so failures don't abort the main tx
        async with db.begin_nested():
            cache_row = await db.execute(
                text(
                    """
                    SELECT response_template
                    FROM response_cache
                    WHERE fingerprint = CAST(:fp AS varchar(128))
                      AND (expires_at IS NULL OR expires_at > now())
                    LIMIT 1
                    """
                ),
                {"fp": fp},
            )
            row = cache_row.first()
            if row and row[0]:
                ai_text = row[0]
                from_cache = True
                if os.getenv("TESTING_MODE", "false").lower() == "true":
                    debug_log.add("cache.hit", {"fp": fp, "len": len(ai_text or "")})
                # Increment usage and update last_used_at
                await db.execute(
                    text(
                        """
                        UPDATE response_cache
                        SET usage_count = usage_count + 1, last_used_at = now()
                        WHERE fingerprint = CAST(:fp AS varchar(128))
                        """
                    ),
                    {"fp": fp},
                )
            else:
                if os.getenv("TESTING_MODE", "false").lower() == "true":
                    debug_log.add("cache.miss", {"fp": fp})
    except Exception as e:
        logger.exception("Cache lookup failed: {}", e)

    # If no cache, generate response via Claude
    if not ai_text:
        claude = ClaudeService()
        try:
            ai_text = await claude.generate_response(
                db=db,
                channel_id=str(yt.channel_id),
                comment_text=yt.comment_text,
                channel_name=str(yt.channel_id),
                video_title=yt.video_title,
                from_cache=False,
            )
        except Exception as e:
            logger.exception("Claude generation error: {}", e)
            ai_text = None

    if not ai_text:
        # Update queue failure, increment counters and schedule retry with backoff; DLQ after threshold
        try:
            # increment failure_count and set last_error
            await db.execute(
                text(
                    """
                    UPDATE comments_queue
                    SET failure_count = failure_count + 1,
                        status = CASE WHEN failure_count + 1 >= 5 THEN 'failed' ELSE 'pending' END,
                        last_error_code = 502,
                        last_error_message = 'ai_generation_failed',
                        last_error_at = now(),
                        next_attempt_at = CASE WHEN failure_count + 1 < 5 THEN now() + (interval '30 seconds' * POWER(2, failure_count)) ELSE NULL END,
                        processed_at = now()
                    WHERE id = :qid
                    RETURNING failure_count, status
                    """
                ),
                {"qid": queue_id},
            )
            # If reached terminal failure, move to DLQ
            row = await db.execute(text("SELECT failure_count, status, comment_id, channel_id FROM comments_queue WHERE id = :qid"), {"qid": queue_id})
            r = row.first()
            if r and int(r[0] or 0) >= 5 and str(r[1]) == 'failed':
                await db.execute(
                    text(
                        """
                        INSERT INTO comments_dead_letter (queue_id, channel_id, comment_id, reason, error_code, error_message, created_at)
                        SELECT id, channel_id, comment_id, 'ai_generation_failed', 502, 'Claude returned no text', now()
                        FROM comments_queue WHERE id = :qid
                        """
                    ),
                    {"qid": queue_id},
                )
            await db.commit()
        except Exception:
            logger.exception("Failed to update queue failure/ DLQ")
            await db.rollback()
        raise HTTPException(status_code=502, detail="AI generation failed")

    # If newly generated (not from cache), store in response_cache with 30-day expiry
    if not from_cache and ai_text:
        try:
            # Isolate cache writes in a nested transaction (SAVEPOINT) so failures don't abort the main tx
            async with db.begin_nested():
            # Try update first (cast param to match varchar column)
                await db.execute(
                    text(
                        """
                        UPDATE response_cache
                        SET response_template = :rtxt,
                            last_used_at = now(),
                            expires_at = now() + interval '30 days'
                        WHERE fingerprint = CAST(:fp AS varchar(128))
                        """
                    ),
                    {"fp": fp, "rtxt": ai_text},
                )
            # Insert if it does not exist; cast param everywhere to avoid ambiguous parameter typing
                await db.execute(
                    text(
                        """
                        INSERT INTO response_cache (fingerprint, response_template, usage_count, last_used_at, expires_at)
                        SELECT CAST(:fp AS varchar(128)), :rtxt, 1, now(), now() + interval '30 days'
                        WHERE NOT EXISTS (
                            SELECT 1 FROM response_cache WHERE fingerprint = CAST(:fp AS varchar(128))
                        )
                        """
                    ),
                    {"fp": fp, "rtxt": ai_text},
                )
        except Exception as e:
            logger.exception("Failed to store response in cache: {}", e)
        else:
            if os.getenv("TESTING_MODE", "false").lower() == "true":
                debug_log.add("cache.store", {"fp": fp, "len": len(ai_text or "")})
    elif from_cache:
        # Count cache hit and generated response
        try:
            await ClaudeService.increment_metrics(
                db,
                channel_id=str(yt.channel_id),
                delta_generated=1,
                delta_cache_hits=1,
            )
        except Exception:
            logger.exception("Failed to update metrics for cache hit")

    # Safety: quick check first
    quick_ok, quick_reason = quick_safety_check(ai_text)

    # Store into ai_responses and complete queue
    try:
        if not quick_ok:
            # Fail fast: mark unsafe with reason
            await db.execute(
                text(
                    """
                    INSERT INTO ai_responses (queue_id, response_text, passed_safety, safety_checked_at, safety_notes, created_at)
                    VALUES (CAST(:qid AS uuid), :rtxt, false, now(), :notes, now())
                    """
                ),
                {"qid": str(queue_id), "rtxt": ai_text, "notes": f"quick_fail:{quick_reason}"},
            )
        else:
            # Defer AI safety; mark pending (no safety_checked_at yet)
            await db.execute(
                text(
                    """
                    INSERT INTO ai_responses (queue_id, response_text, passed_safety, safety_notes, created_at)
                    VALUES (CAST(:qid AS uuid), :rtxt, false, :notes, now())
                    """
                ),
                {"qid": str(queue_id), "rtxt": ai_text, "notes": "pending_ai"},
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

    # If quick OK, enqueue for AI safety via batched scheduler
    if quick_ok:
        try:
            await schedule_safety_check(
                db,
                queue_id=str(queue_id),
                response_text=ai_text,
                original_comment=yt.comment_text,
            )
            if os.getenv("TESTING_MODE", "false").lower() == "true":
                debug_log.add("safety.enqueue", {"queue_id": str(queue_id)})
        except Exception as e:
            logger.exception("Safety scheduling failed: {}", e)
            # Best-effort error_logs entry; do not fail the main request
            try:
                await db.execute(
                    text(
                        """
                        INSERT INTO error_logs (service_name, operation, error_code, message, context, created_at)
                        VALUES ('ai', 'schedule_safety_check', 0, :msg, :ctx, now())
                        """
                    ),
                    {"msg": str(e), "ctx": {"queue_id": str(queue_id)}},
                )
                await db.commit()
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass

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
        # Mark each as failure with backoff; DLQ if threshold reached
        await db.execute(
            text(
                f"""
                UPDATE comments_queue
                SET failure_count = failure_count + 1,
                    status = CASE WHEN failure_count + 1 >= 5 THEN 'failed' ELSE 'pending' END,
                    last_error_code = 502,
                    last_error_message = 'ai_batch_generation_failed',
                    last_error_at = now(),
                    next_attempt_at = CASE WHEN failure_count + 1 < 5 THEN now() + (interval '30 seconds' * POWER(2, failure_count)) ELSE NULL END,
                    processed_at = now()
                WHERE comment_id IN ({placeholders2})
                """
            ),
            params2,
        )
        # Insert into DLQ for those that reached threshold in this update
        await db.execute(
            text(
                f"""
                INSERT INTO comments_dead_letter (queue_id, channel_id, comment_id, reason, error_code, error_message, created_at)
                SELECT cq.id, cq.channel_id, cq.comment_id, 'ai_generation_failed', 502, 'Claude batch returned no text', now()
                FROM comments_queue cq
                WHERE cq.comment_id IN ({placeholders2}) AND cq.failure_count >= 5 AND cq.status = 'failed'
                ON CONFLICT DO NOTHING
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
    no_response_ids: List[str] = []
    for cid in raw_ids:
        if cid in results_map and cid in by_comment_id:
            response_items.append(BatchGenerateItem(comment_id=cid, response_text=results_map[cid]))
            to_complete_ids.append(cid)
        elif cid in missing_ids:
            response_items.append(BatchGenerateItem(comment_id=cid, error="not_found"))
        else:
            response_items.append(BatchGenerateItem(comment_id=cid, error="no_response"))
            no_response_ids.append(cid)

    # Insert ai_responses for those generated with safety quick checks
    if to_complete_ids:
        placeholders3 = ",".join([f":cid{i}" for i in range(len(to_complete_ids))])
        params3 = {f"cid{i}": x for i, x in enumerate(to_complete_ids)}

        # Evaluate quick safety per item and prepare VALUES with notes
        values_rows: List[str] = []
        insert_params: Dict[str, Any] = {**params3}
        safety_enqueue: List[Dict[str, Any]] = []
        for i, cid in enumerate(to_complete_ids):
            resp_txt = results_map.get(cid, "")
            ok, reason = quick_safety_check(resp_txt)
            values_rows.append(f"(:v_qid{i}, :v_txt{i}, :v_safe{i}, :v_checked{i}, :v_notes{i})")
            insert_params[f"v_txt{i}"] = resp_txt
            # lookup queue_id by comment_id using by_comment_id
            qid = str(by_comment_id[cid]["queue_id"]) if cid in by_comment_id else None
            insert_params[f"v_qid{i}"] = qid
            if ok:
                insert_params[f"v_safe{i}"] = False  # pending AI validation
                insert_params[f"v_checked{i}"] = None
                insert_params[f"v_notes{i}"] = "pending_ai"
                # enqueue for AI safety batch
                safety_enqueue.append({
                    "queue_id": qid,
                    "response_text": resp_txt,
                    "original_comment": by_comment_id[cid]["content"],
                })
            else:
                insert_params[f"v_safe{i}"] = False
                insert_params[f"v_checked{i}"] = "now()"  # handled specially below
                insert_params[f"v_notes{i}"] = f"quick_fail:{reason}"

        # Build INSERT selecting from VALUES; handle safety_checked_at with NULLIF to map "now()" token
        await db.execute(
            text(
                f"""
                INSERT INTO ai_responses (queue_id, response_text, passed_safety, safety_checked_at, safety_notes, created_at)
                SELECT v.queue_id::uuid, v.response_text, v.safe, 
                       CASE WHEN v.checked = 'now()' THEN now() ELSE NULL END,
                       v.notes, now()
                FROM (
                    VALUES {','.join(values_rows)}
                ) AS v(queue_id, response_text, safe, checked, notes)
                """
            ),
            insert_params,
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

    # For items that received no response, revert from processing and schedule retry/backoff
    if no_response_ids:
        placeholders4 = ",".join([f":nid{i}" for i in range(len(no_response_ids))])
        params4 = {f"nid{i}": x for i, x in enumerate(no_response_ids)}
        await db.execute(
            text(
                f"""
                UPDATE comments_queue
                SET failure_count = failure_count + 1,
                    status = CASE WHEN failure_count + 1 >= 5 THEN 'failed' ELSE 'pending' END,
                    last_error_code = 500,
                    last_error_message = 'no_response_for_item',
                    last_error_at = now(),
                    next_attempt_at = CASE WHEN failure_count + 1 < 5 THEN now() + (interval '30 seconds' * POWER(2, failure_count)) ELSE NULL END,
                    processed_at = now()
                WHERE comment_id IN ({placeholders4})
                """
            ),
            params4,
        )
        await db.execute(
            text(
                f"""
                INSERT INTO comments_dead_letter (queue_id, channel_id, comment_id, reason, error_code, error_message, created_at)
                SELECT cq.id, cq.channel_id, cq.comment_id, 'ai_no_response', 500, 'Claude did not return an item', now()
                FROM comments_queue cq
                WHERE cq.comment_id IN ({placeholders4}) AND cq.failure_count >= 5 AND cq.status = 'failed'
                ON CONFLICT DO NOTHING
                """
            ),
            params4,
        )
        await db.commit()

    # Enqueue quick-safe items for AI safety via batched scheduler
    if to_complete_ids:
        for enq in safety_enqueue:
            await schedule_safety_check(
                db,
                queue_id=str(enq.get("queue_id")),
                response_text=str(enq.get("response_text") or ""),
                original_comment=str(enq.get("original_comment") or ""),
            )

    return BatchGenerateResponse(
        items=response_items,
        metadata={"source": "youtube", "count": len(to_complete_ids)},
    )


# ---------------- Approval queue endpoints ----------------

@router.post("/force-process")
async def force_process_pending(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """TESTING ONLY: Immediately process all pending comments in batches.

    - Requires TESTING_MODE=true in environment.
    - Bypasses normal wait/size thresholds and processes grouped batches until none remain.
    - Returns a detailed summary of successes and failures.
    """
    # Guard: only allow in testing mode
    testing = os.getenv("TESTING_MODE", "false").lower() == "true"
    if not testing:
        raise HTTPException(status_code=403, detail="Not allowed outside testing mode")

    bp = BatchProcessor(db)

    total_processed = 0
    total_attempted = 0
    batches = 0
    details: List[Dict[str, Any]] = []

    while True:
        pending = await bp.get_pending_comments(limit=200)
        if not pending:
            break
        groups = bp.group_comments(pending)
        if not groups:
            break
        for group in groups:
            subset = group[: bp.get_batch_size()]
            if not subset:
                continue
            results = await bp.process_batch(subset)
            # Mark last_batch_processed_at for attempted items
            try:
                ids = [it.queue_id for it in subset]
                if ids:
                    values = ",".join([f"(CAST(:id{i} AS uuid))" for i in range(len(ids))])
                    params = {f"id{i}": str(v) for i, v in enumerate(ids)}
                    await db.execute(
                        text(
                            f"""
                                UPDATE comments_queue cq
                                SET last_batch_processed_at = now()
                                FROM (VALUES {values}) AS v(id)
                                WHERE cq.id = v.id
                            """
                        ),
                        params,
                    )
                    await db.commit()
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass

            # Summarize results
            for r in results:
                cid = r.get("comment_id") if isinstance(r, dict) else None
                if isinstance(r, dict) and r.get("response_text"):
                    total_processed += 1
                    total_attempted += 1
                    details.append({"comment_id": cid, "status": "ok"})
                else:
                    total_attempted += 1
                    err = (r.get("error") if isinstance(r, dict) else "unknown_error")
                    details.append({"comment_id": cid, "status": "error", "error": err})

            batches += 1

    return {
        "status": "ok",
        "trigger": "force",
        "processed": total_processed,
        "attempted": total_attempted,
        "batches": batches,
        "batch_size": bp.get_batch_size(),
        "details": details,
    }

@router.get("/pending-approvals")
async def list_pending_approvals(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Return AI responses that are waiting for approval (safety-passed, not yet approved)."""
    res = await db.execute(
        text(
            """
            SELECT ar.id, ar.queue_id, ar.response_text, ar.passed_safety, ar.safety_checked_at,
                   cq.comment_id, cq.channel_id, cq.video_id, cq.content, ar.created_at
            FROM ai_responses ar
            JOIN comments_queue cq ON cq.id = ar.queue_id
            WHERE ar.approved_at IS NULL AND ar.passed_safety = TRUE
            ORDER BY ar.created_at ASC
            """
        )
    )
    rows = res.fetchall()
    return [
        {
            "response_id": str(r[0]),
            "queue_id": str(r[1]),
            "response_text": r[2],
            "passed_safety": bool(r[3]),
            "safety_checked_at": r[4],
            "comment_id": r[5],
            "channel_id": str(r[6]),
            "video_id": str(r[7]),
            "comment_text": r[8],
            "created_at": r[9],
        }
        for r in rows
    ]


@router.post("/approve/{response_id}")
async def approve_response(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    response_id: str,
):
    """Approve a response and post it to YouTube as a reply."""
    # Load response and queue context
    res = await db.execute(
        text(
            """
            SELECT ar.id, ar.queue_id, ar.response_text, ar.approved_at,
                   cq.comment_id, cq.channel_id
            FROM ai_responses ar
            JOIN comments_queue cq ON cq.id = ar.queue_id
            WHERE ar.id = :rid
            """
        ),
        {"rid": response_id},
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="response not found")
    if row[3] is not None:
        raise HTTPException(status_code=409, detail="response already approved")

    queue_id = str(row[1])
    response_text = row[2] or ""
    parent_comment_id = row[4]
    channel_id = row[5]

    # Post reply via YouTubeService; ownership check enforced inside
    yt = YouTubeService(db)
    try:
        await yt.reply_to_comment(
            user_id=current_user.id,
            connection_id=channel_id,
            parent_comment_id=parent_comment_id,
            text=response_text,
        )
    except Exception as e:
        # Don't mark approved on post failure
        raise HTTPException(status_code=502, detail=f"post failed: {e}")

    # Mark approved and posted
    await db.execute(
        text(
            """
            UPDATE ai_responses
            SET approved_at = now(), posted_at = now()
            WHERE id = :rid
            """
        ),
        {"rid": response_id},
    )
    await db.execute(
        text("UPDATE comments_queue SET status = 'completed', processed_at = now() WHERE id = :qid"),
        {"qid": queue_id},
    )
    await db.commit()
    return {"status": "approved"}


@router.post("/reject/{response_id}")
async def reject_response(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    response_id: str,
):
    """Reject a response; it will not be posted."""
    res = await db.execute(
        text("SELECT id, approved_at FROM ai_responses WHERE id = :rid"),
        {"rid": response_id},
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="response not found")
    if row[1] is not None:
        raise HTTPException(status_code=409, detail="already approved")
    await db.execute(
        text(
            """
            UPDATE ai_responses SET safety_notes = 'rejected_by_user', safety_checked_at = COALESCE(safety_checked_at, now())
            WHERE id = :rid
            """
        ),
        {"rid": response_id},
    )
    await db.commit()
    return {"status": "rejected"}


@router.put("/edit-response/{response_id}")
async def edit_response_text(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    response_id: str,
    payload: Dict[str, Any],
):
    """Edit the response text before approval.

    Body: { "response_text": string }
    """
    new_text = (payload or {}).get("response_text")
    if not isinstance(new_text, str) or not new_text.strip():
        raise HTTPException(status_code=400, detail="response_text is required")
    res = await db.execute(
        text("SELECT id, approved_at FROM ai_responses WHERE id = :rid"),
        {"rid": response_id},
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="response not found")
    if row[1] is not None:
        raise HTTPException(status_code=409, detail="already approved")
    await db.execute(
        text("UPDATE ai_responses SET response_text = :txt, safety_notes = 'edited_by_user' WHERE id = :rid"),
        {"txt": new_text.strip(), "rid": response_id},
    )
    await db.commit()
    return {"status": "updated"}


@router.get("/queue-status")
async def queue_status(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Return current queue metrics and batch-processing estimates.

    Response:
    {
      pending_by_classification: { cls: count, ... },
      oldest_pending_age_seconds: int,
      estimated_seconds_to_next_batch: int | None,
      last_batch: { time: datetime | None, size: int | None },
      mode: "testing" | "production",
      average_processing_time_seconds: float | None
    }
    """
    # 1) Pending by classification
    res = await db.execute(
        text(
            """
            SELECT COALESCE(classification, 'unknown') AS cls, COUNT(*)
            FROM comments_queue
            WHERE status = 'pending'
            GROUP BY 1
            ORDER BY 2 DESC
            """
        )
    )
    rows = res.fetchall()
    pending_by_classification = {str(r[0]): int(r[1] or 0) for r in rows}

    # Helper: total pending
    res2 = await db.execute(text("SELECT COUNT(*) FROM comments_queue WHERE status = 'pending'"))
    pending_total = int(res2.scalar() or 0)

    # 2) Oldest pending age in seconds
    res3 = await db.execute(
        text(
            """
            SELECT COALESCE(EXTRACT(EPOCH FROM (now() - MIN(created_at)))::int, 0)
            FROM comments_queue
            WHERE status = 'pending'
            """
        )
    )
    oldest_age = int(res3.scalar() or 0)

    # 3) Estimated time until next batch processing
    try:
        wait_max = int(os.getenv("BATCH_WAIT_MAX_SECONDS", "120"))
    except Exception:
        wait_max = 120
    try:
        size_min = int(os.getenv("BATCH_SIZE_MIN", "1"))
    except Exception:
        size_min = 1

    # Last batch time
    res4 = await db.execute(text("SELECT MAX(last_batch_processed_at) FROM comments_queue"))
    last_batch_time = res4.scalar()

    # Compute remaining seconds for each trigger path
    estimated_seconds = None
    if pending_total <= 0:
        estimated_seconds = None
    else:
        # Size trigger
        if pending_total >= max(1, size_min):
            estimated_seconds = 0
        else:
            # Time triggers
            rem_oldest = max(0, wait_max - oldest_age)
            rem_last = None
            if last_batch_time is not None:
                from datetime import datetime, timezone, timedelta
                rem_last = int(
                    max(
                        0,
                        (last_batch_time + timedelta(minutes=5) - datetime.now(timezone.utc)).total_seconds(),
                    )
                )
            # Choose the sooner of the time-based triggers if both exist
            candidates = [rem_oldest]
            if rem_last is not None:
                candidates.append(rem_last)
            estimated_seconds = min(candidates) if candidates else None

    # 4) Last batch process time and size
    last_batch_size = None
    if last_batch_time is not None:
        res5 = await db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM comments_queue
                WHERE last_batch_processed_at = :t
                """
            ),
            {"t": last_batch_time},
        )
        last_batch_size = int(res5.scalar() or 0)

    # 5) Current mode
    mode = "testing" if os.getenv("TESTING_MODE", "false").lower() == "true" else "production"

    # 6) Average processing time per comment
    res6 = await db.execute(
        text(
            """
            SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at)))
            FROM comments_queue
            WHERE status = 'completed' AND processed_at IS NOT NULL
            """
        )
    )
    avg_proc = res6.scalar()
    average_processing_time_seconds = float(avg_proc) if avg_proc is not None else None

    return {
        "pending_by_classification": pending_by_classification,
        "pending_total": pending_total,
        "oldest_pending_age_seconds": oldest_age,
        "estimated_seconds_to_next_batch": estimated_seconds,
        "last_batch": {"time": last_batch_time, "size": last_batch_size},
        "mode": mode,
        "average_processing_time_seconds": average_processing_time_seconds,
    }
