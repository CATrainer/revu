"""Safety validation utilities for AI-generated responses.

- quick_safety_check(text): fast local heuristics for unsafe content
- ai_safety_check(response_text, original_comment): Claude-based validation

Both return a tuple: (is_safe: bool, reason: str)
"""
from __future__ import annotations

import re
from typing import Tuple, Optional, Dict, Any

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
