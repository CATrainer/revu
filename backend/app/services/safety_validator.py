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
from app.utils import debug_log

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
            model="claude-sonnet-4-20250514",
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
    if os.getenv("TESTING_MODE", "false").lower() == "true":
        debug_log.add("safety.enqueue", {"queue_id": str(queue_id), "size": len(_SAFETY_BUFFER)})
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
        if os.getenv("TESTING_MODE", "false").lower() == "true":
            debug_log.add("safety.flush", {"size": len(_SAFETY_BUFFER), "reason": reason})
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
        model = os.getenv("CLAUDE_MODEL") or "claude-sonnet-4-20250514"
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
    # Explicitly CAST to avoid ambiguous parameter typing in Postgres
    values_clause = ",".join([
        f"(CAST(:qid{i} AS text), CAST(:safe{i} AS boolean), CAST(:notes{i} AS text))"
        for i in range(len(updates))
    ])
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
    if os.getenv("TESTING_MODE", "false").lower() == "true":
        try:
            debug_log.add(
                "safety.batch.done",
                {"size": len(batch), "duration_s": round(duration, 3), "reason": trigger_reason, "updates": len(updates)},
            )
        except Exception:
            pass


# --------- Deletion criteria evaluation (AI + safeguards) ---------

_POSITIVE_PHRASES = {
    "love this", "great", "awesome", "amazing", "thanks", "thank you", "nice",
    "well done", "helpful", "subscribed", "learned a lot", "good job", "fantastic",
}

_QUESTION_MARKERS = {"?", "how do", "can you", "what about", "where do", "why does"}

_SPAM_MARKERS = {
    "whatsapp", "telegram", "bitcoin", "crypto", "investment", "contact me", "dm me",
    "check my profile", "promo", "giveaway", "earn", "forex", "loan", "cashapp",
}


def _is_whitelisted_author(comment: Dict[str, Any]) -> bool:
    try:
        env = os.getenv("KNOWN_GOOD_COMMENTERS") or os.getenv("COMMENTER_WHITELIST") or ""
        items = [s.strip().lower() for s in env.split(",") if s.strip()]
        if not items:
            return False
        name = (comment.get("author_display_name") or "").lower()
        cid = (comment.get("author_channel_id") or "").lower()
        return (name and name in items) or (cid and cid in items)
    except Exception:
        return False


def _looks_legitimate_comment(text: str) -> bool:
    t = (text or "").strip().lower()
    if not t:
        return False
    # Strongly positive or appreciative comments
    for p in _POSITIVE_PHRASES:
        if p in t:
            return True
    # Questions or asking for help
    if any(m in t for m in _QUESTION_MARKERS):
        return True
    # Very short generic positives
    if len(t) <= 12 and any(w in t for w in ("nice", "good", "great", "cool", "wow")):
        return True
    return False


def _spammy_markers_score(text: str) -> float:
    t = (text or "").lower()
    score = 0.0
    # URLs/emails/phones boost spam score
    if _URL_RE.search(t):
        score += 0.25
    if _EMAIL_RE.search(t):
        score += 0.2
    if _PHONE_RE.search(t):
        score += 0.2
    # Repeated specials often used in spam
    specials = sum(1 for c in t if c in _SPECIALS)
    if len(t) >= 40 and specials > 6:
        score += 0.1
    # Known spam markers
    score += min(0.4, 0.08 * sum(1 for m in _SPAM_MARKERS if m in t))
    # Excessive uppercase words
    words = [w for w in re.split(r"\s+", t) if w]
    if words:
        caps_words = sum(1 for w in words if len(w) >= 4 and w.isupper())
        if caps_words >= 3:
            score += 0.15
    return max(0.0, min(1.0, score))


async def evaluate_delete_criteria(
    comment: Dict[str, Any],
    ai_criteria: Dict[str, Any] | str,
) -> Dict[str, Any]:
    """Ask Claude if the comment matches deletion criteria and return a scored decision.

    Returns a dict with keys: confidence (0-1), recommended_delete (bool), threshold (float),
    reason (str), whitelisted (bool), legitimate (bool), ai_reason (str).

    Safeguards:
    - Whitelist authors in env KNOWN_GOOD_COMMENTERS/COMMENTER_WHITELIST
    - Heuristics to avoid deleting legitimate positive/questions unless extremely confident
    - Local spam scoring as fallback when AI unavailable
    """
    text = (comment or {}).get("text") or (comment or {}).get("comment_text") or ""
    author_name = (comment or {}).get("author_display_name") or (comment or {}).get("author") or ""
    whitelisted = _is_whitelisted_author(comment)
    legitimate = _looks_legitimate_comment(text)

    # Default threshold from rule criteria or env
    try:
        if isinstance(ai_criteria, str):
            import json
            ai_criteria_obj = json.loads(ai_criteria)
        else:
            ai_criteria_obj = dict(ai_criteria or {})
    except Exception:
        ai_criteria_obj = {}
    threshold = ai_criteria_obj.get("confidence_threshold") or ai_criteria_obj.get("delete_threshold")
    if threshold is None:
        try:
            threshold = float(os.getenv("DELETE_CONFIDENCE_THRESHOLD", "0.88"))
        except Exception:
            threshold = 0.88

    # If author is whitelisted, never auto-delete
    if whitelisted:
        reason = "whitelisted_author"
        logger.info("Delete decision: SKIP (whitelisted) author={} reason={}", author_name, reason)
        try:
            debug_log.add("delete.decide", {"cid": comment.get("id") or comment.get("comment_id"), "result": "skip_whitelist"})
        except Exception:
            pass
        return {
            "confidence": 0.0,
            "recommended_delete": False,
            "threshold": threshold,
            "reason": reason,
            "whitelisted": True,
            "legitimate": legitimate,
            "ai_reason": "",
        }

    claude = ClaudeService()
    ai_conf = None
    ai_should = None
    ai_reason = ""

    if getattr(claude, "client", None):
        try:
            system_prompt = (
                "You are a careful moderation assistant. Decide if a YouTube comment should be DELETED per the provided criteria. "
                "Be conservative: avoid deleting legitimate praise, help requests, or neutral feedback. "
                "Only recommend deletion for clear spam, scams, impersonation, hate/harassment, doxxing/PII, or obvious policy violations. "
                "Respond ONLY with JSON: {\"confidence\": 0-1, \"should_delete\": boolean, \"reason\": string}."
            )
            user_prompt = (
                "Deletion criteria (JSON or text):\n" + str(ai_criteria_obj or ai_criteria or {}) + "\n\n"
                "Comment (author: " + author_name + "):\n" + text + "\n"
            )
            resp = claude.client.messages.create(
                model=os.getenv("CLAUDE_MODEL") or "claude-sonnet-4-20250514",
                max_tokens=int(os.getenv("CLAUDE_MAX_TOKENS", "200")),
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
            data = _extract_json(text_out or "") or {}
            if isinstance(data, dict):
                c = data.get("confidence")
                ai_conf = float(c) if isinstance(c, (int, float, str)) and str(c).replace(".", "", 1).isdigit() else None
                ai_should = bool(data.get("should_delete", False))
                ai_reason = str(data.get("reason", ""))
        except Exception as e:
            logger.exception("Claude delete-eval error: {}", e)

    # Fallback local heuristic when AI unavailable/malformed
    if ai_conf is None:
        spam_score = _spammy_markers_score(text)
        # reduce score if comment looks legitimate
        if legitimate:
            spam_score = max(0.0, spam_score - 0.3)
        ai_conf = spam_score
        ai_should = spam_score >= 0.8
        ai_reason = ai_reason or ("heuristic_spam_score=" + str(round(spam_score, 3)))

    # Apply conservative overrides
    eff_threshold = float(threshold)
    if legitimate:
        # require near-certainty to auto-delete legitimate-looking comments
        eff_threshold = max(eff_threshold, 0.98)

    recommended = bool(ai_should and (ai_conf >= eff_threshold))
    decision = {
        "confidence": float(max(0.0, min(1.0, ai_conf))),
        "recommended_delete": recommended,
        "threshold": eff_threshold,
        "reason": ("ai:" + ai_reason) if ai_reason else ("threshold_only"),
        "whitelisted": whitelisted,
        "legitimate": legitimate,
        "ai_reason": ai_reason,
    }

    logger.info(
        "Delete decision cid={} conf={} thr={} rec={} legit={} reason={}",
        comment.get("id") or comment.get("comment_id"),
        round(decision["confidence"], 3),
        round(decision["threshold"], 3),
        decision["recommended_delete"],
        decision["legitimate"],
        decision["reason"],
    )
    try:
        debug_log.add(
            "delete.decide",
            {
                "cid": comment.get("id") or comment.get("comment_id"),
                "confidence": decision["confidence"],
                "threshold": decision["threshold"],
                "recommended": decision["recommended_delete"],
                "legitimate": decision["legitimate"],
                "whitelisted": decision["whitelisted"],
            },
        )
    except Exception:
        pass

    return decision
