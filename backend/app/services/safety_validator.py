"""Safety validation utilities for AI-generated responses.

- quick_safety_check(text): fast local heuristics for unsafe content
- ai_safety_check(response_text, original_comment): Claude-based validation
- schedule_safety_check(db, queue_id, response_text, original_comment):
    buffered, batched safety validation using Claude with env-driven thresholds

Both checks return a tuple: (is_safe: bool, reason: str)
The scheduler enqueues and flushes to a batch based on SAFETY_CHECK_BATCH_MIN or a 2-minute timeout.
In TESTING_MODE, single items are processed immediately.
"""
from __future__ import annotations

import re
from typing import Tuple, Optional, Dict, Any, List
import os
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from loguru import logger

from app.services.claude_service import ClaudeService

# Basic profanity list (non-exhaustive, adjustable)
_PROFANITY = {
    "shit",
    "fuck",
    "bitch",
    "asshole",
    "bastard",
    "dick",
    "piss",
    "cunt",
    "slut",
    "douche",
    "whore",
    "damn",
}

# Precompiled regex patterns
_URL_RE = re.compile(r"(https?://|www\.)[\w\-]+(\.[\w\-]+)+[^\s]*", re.IGNORECASE)
_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
# Simple international-ish phone detector (tolerant)
_PHONE_RE = re.compile(r"(?:(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4})")
_SPECIALS = set("!@#$%^&*()_+=[]{}|\\:;\"'<>.,/?`~")


def quick_safety_check(response_text: str) -> Tuple[bool, str]:
    """Fast local safety gate.

    Flags:
    - URLs or emails
    - Phone numbers
    - Profanity
    - Excessive caps or special chars
    """
    txt = (response_text or "").strip()
    if not txt:
        return False, "empty"

    # URLs/emails/phones
    if _URL_RE.search(txt):
        return False, "contains_url"
    if _EMAIL_RE.search(txt):
        return False, "contains_email"
    if _PHONE_RE.search(txt):
        return False, "contains_phone"

    # Profanity (word boundary, lowercase)
    lowered = txt.lower()
    for w in _PROFANITY:
        if re.search(rf"\b{re.escape(w)}\b", lowered):
            return False, "profanity"

    # Excessive caps (ratio of uppercase letters among letters)
    letters = [c for c in txt if c.isalpha()]
    if letters:
        caps = sum(1 for c in letters if c.isupper())
        ratio = caps / max(1, len(letters))
        if len(letters) >= 10 and ratio > 0.7:
            return False, "excessive_caps"

    # Excessive special characters
    specials = sum(1 for c in txt if c in _SPECIALS)
    if len(txt) >= 20:
        if specials >= 10 or (specials / max(1, len(txt))) > 0.3:
            return False, "excessive_specials"

    return True, "ok"


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Extract JSON object from a possibly fenced/prose response."""
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    blob = fenced.group(1) if fenced else text
    first_obj = re.search(r"\{[\s\S]*\}", blob)
    candidate = first_obj.group(0) if first_obj else blob
    try:
        import json
        return json.loads(candidate)
    except Exception:
        return None


def ai_safety_check(response_text: str, original_comment: str) -> Tuple[bool, str]:
    """Use Claude to validate response safety and relevance.

    Returns (is_safe, reason). If the AI check cannot run, falls back to quick_safety_check.
    """
    # Local quick pre-check first; if it fails, short-circuit
    ok, reason = quick_safety_check(response_text)
    if not ok:
        return ok, reason

    claude = ClaudeService()
    if not getattr(claude, "client", None):
        # Fallback when SDK/API unavailable
        return ok, "ok_local_only"

    system_prompt = (
        "You are a strict content safety validator for YouTube replies. "
        "Decide if the AI response is appropriate, on-topic with the original comment, and safe. "
        "Consider: harassment, hate, sexual content, self-harm, medical/financial advice, doxxing/PII, "
        "spam/scams, external links, dangerous instructions, or policy violations. "
        "Respond ONLY with compact JSON: {\"is_safe\": boolean, \"reason\": string}."
    )

    user_prompt = (
        "Original comment:\n" + (original_comment or "") + "\n\n" +
        "AI response:\n" + (response_text or "") + "\n\n" +
        "Is the AI response appropriate, on-topic, and safe for public posting?"
    )

    try:
        resp = claude.client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=200,
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
        logger.exception("Claude safety validation error: {}", e)
        return True, "ok_local_only"  # non-blocking if remote check fails

    data = _extract_json(text_out or "")
    if isinstance(data, dict):
        is_safe = bool(data.get("is_safe", False))
        reason = str(data.get("reason", "")) or ("ok" if is_safe else "policy_violation")
        return is_safe, reason

    # If AI output malformed, fall back to local OK
    return True, "ok_local_only"


# --------- Batched safety processing (env-driven) ---------

_SAFETY_BUFFER: List[Dict[str, Any]] = []
_FIRST_ENQUEUED_AT: Optional[datetime] = None


def _get_min_batch() -> int:
    try:
        return max(1, int(os.getenv("SAFETY_CHECK_BATCH_MIN", "2")))
    except Exception:
        return 2


def _is_testing() -> bool:
    return os.getenv("TESTING_MODE", "false").lower() == "true"


async def schedule_safety_check(
    db: AsyncSession,
    *,
    queue_id: str,
    response_text: str,
    original_comment: str,
) -> None:
    """Enqueue an item for batched safety check and flush if threshold met.

    Flush conditions:
    - testing mode: process even a single item immediately
    - size: when buffer length >= SAFETY_CHECK_BATCH_MIN
    - time: when first enqueued item has waited >= 120 seconds
    """
    global _FIRST_ENQUEUED_AT

    _SAFETY_BUFFER.append(
        {
            "queue_id": str(queue_id),
            "response_text": response_text,
            "original_comment": original_comment,
        }
    )
    if _FIRST_ENQUEUED_AT is None:
        _FIRST_ENQUEUED_AT = datetime.now(timezone.utc)

    # Decide whether to flush now
    min_batch = _get_min_batch()
    testing = _is_testing()
    now = datetime.now(timezone.utc)
    age = (now - _FIRST_ENQUEUED_AT).total_seconds() if _FIRST_ENQUEUED_AT else 0

    reason = None
    if testing and len(_SAFETY_BUFFER) >= 1:
        reason = "testing_single"
    elif len(_SAFETY_BUFFER) >= min_batch:
        reason = "size"
    elif age >= 120:
        reason = "timeout"

    if reason:
        await _run_ai_safety_batch(db, trigger_reason=reason)


async def _run_ai_safety_batch(db: AsyncSession, *, trigger_reason: str) -> None:
    """Run AI safety validation for buffered items in one Claude call.

    Updates ai_responses: passed_safety, safety_checked_at, safety_notes.
    """
    global _FIRST_ENQUEUED_AT
    if not _SAFETY_BUFFER:
        return

    started = datetime.now(timezone.utc)
    batch = list(_SAFETY_BUFFER)
    _SAFETY_BUFFER.clear()
    _FIRST_ENQUEUED_AT = None

    # Build prompt for Claude to validate all
    system_prompt = (
        "You are a strict safety validator for YouTube replies. For each item, decide if the AI response is appropriate, "
        "on-topic with the original comment, and safe. Consider harassment, hate, sexual content, self-harm, PII, scams, "
        "external links, and dangerous instructions. Return ONLY JSON: {\"items\": [{\"queue_id\": str, \"is_safe\": bool, \"reason\": str}]}"
    )
    numbered: List[str] = []
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
        # Can't run AI validation; leave pending for next cycle
        logger.warning("Safety batch skipped; AI client unavailable (size={}, reason={})", len(batch), trigger_reason)
        return

    try:
        model = os.getenv("CLAUDE_MODEL") or "claude-3-5-sonnet-latest"
        max_tokens = int(os.getenv("CLAUDE_MAX_TOKENS", "300"))
        resp = claude.client.messages.create(
            model=model,
            max_tokens=max_tokens,
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
        logger.warning("Safety batch returned non-JSON (size={}, reason={})", len(batch), trigger_reason)
        return
    items = data.get("items")
    if not isinstance(items, list):
        logger.warning("Safety batch missing items array (size={}, reason={})", len(batch), trigger_reason)
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
        logger.warning("Safety batch produced no updates (size={}, reason={})", len(batch), trigger_reason)
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

    duration = (datetime.now(timezone.utc) - started).total_seconds()
    logger.info(
        "Safety batch processed size={} in {}s (reason={})",
        len(batch),
        round(duration, 3),
        trigger_reason,
    )
