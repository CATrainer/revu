"""Heuristic-based YouTube comment classifier.

Provides a simple, dependency-free classifier for common categories:
- spam
- simple_positive
- question
- feedback
- negative

Also computes a priority score (0-100) to help ordering moderation/AI work.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal, Tuple
import hashlib


Classification = Literal["spam", "simple_positive", "question", "feedback", "negative"]


_URL_REGEX = re.compile(r"(https?://|www\.)", re.IGNORECASE)
_REPEAT_CHAR_REGEX = re.compile(r"(.)\1{3,}")  # any char repeated 4+ times
_ALL_CAPS_WORD_REGEX = re.compile(r"^[A-Z0-9\W]+$")  # message is all caps/non-letters

_EMOJI_REGEX = re.compile(
    r"[\U0001F300-\U0001F6FF\U0001F900-\U0001F9FF\U0001FA70-\U0001FAFF\U0001F600-\U0001F64F\u2600-\u26FF\u2700-\u27BF\u2764\uFE0F]"
)

_POSITIVE_PHRASES = {
    "great video", "love it", "nice", "awesome", "cool", "good job", "well done", "thanks", "thank you",
}

_QUESTION_STARTERS = {
    "how", "what", "why", "when", "where", "which", "can", "could", "do", "does", "did",
    "is", "are", "am", "will", "would", "should", "who",
}

_NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "hate", "dislike", "trash", "worst", "fake", "scam", "misleading",
    "boring", "annoying", "stupid", "dumb", "ugly", "broken", "bug", "slow", "lag", "cringe",
    "clickbait", "not good", "not impressed", "waste of time", "didn't like", "dont like", "don't like",
}

_FEEDBACK_CUES = {"you should", "could you", "please", "i think", "maybe", "suggest", "recommend"}


def _count_emojis(text: str) -> int:
    return len(_EMOJI_REGEX.findall(text))


def _looks_like_spam(text: str, lowered: str) -> bool:
    # Links or suspicious keywords
    if _URL_REGEX.search(text):
        return True
    if any(k in lowered for k in ("free", "giveaway", "promo", "click", "subscribe", "check my channel")):
        return True
    # Repeated characters / emoji spam
    if _REPEAT_CHAR_REGEX.search(text):
        return True
    if _count_emojis(text) >= 5:
        return True
    # Shouting (all caps) for non-trivial length
    letters = [c for c in text if c.isalpha()]
    if len(letters) >= 6 and text.upper() == text and _ALL_CAPS_WORD_REGEX.match(text.strip()):
        return True
    return False


def _is_simple_positive(text: str, lowered: str) -> bool:
    if len(text) <= 3 and _count_emojis(text) in (1, 2):
        return True
    # Short, common positive phrases without links
    if len(text) <= 40 and not _URL_REGEX.search(text):
        for phrase in _POSITIVE_PHRASES:
            if phrase in lowered:
                return True
    # Single emoji or heart
    if _count_emojis(text) in (1, 2) and len(text.strip()) <= 10:
        return True
    return False


def _is_question(text: str, lowered: str) -> bool:
    if "?" in text:
        return True
    stripped = lowered.lstrip()
    first_word = stripped.split(" ", 1)[0] if stripped else ""
    return first_word in _QUESTION_STARTERS


def _is_negative(lowered: str) -> bool:
    if any(pat in lowered for pat in _NEGATIVE_WORDS):
        return True
    return False


def _is_feedback(lowered: str) -> bool:
    return any(p in lowered for p in _FEEDBACK_CUES)


def _priority_for(classification: Classification, length: int) -> int:
    """Compute a 0-100 priority using class base + length scaling.

    - spam: low
    - simple_positive: low/medium
    - question: high
    - feedback: medium/high
    - negative: very high
    """
    length = max(0, min(500, length))
    # map length 0..500 to 0..30
    length_bonus = int((length / 500) * 30)

    base = {
        "spam": 10,
        "simple_positive": 25,
        "question": 65,
        "feedback": 55,
        "negative": 75,
    }[classification]
    score = base + length_bonus
    return max(0, min(100, score))


def classify_comment(comment_text: str) -> Tuple[Classification, int]:
    """Classify a comment and compute a priority score.

    Returns (classification, priority_score).
    """
    text = (comment_text or "").strip()
    if not text:
        return ("feedback", 0)

    lowered = text.lower()

    # Precedence: spam > simple_positive > question > negative > feedback
    if _looks_like_spam(text, lowered):
        cls: Classification = "spam"
    elif _is_simple_positive(text, lowered):
        cls = "simple_positive"
    elif _is_question(text, lowered):
        cls = "question"
    elif _is_negative(lowered):
        cls = "negative"
    elif _is_feedback(lowered):
        cls = "feedback"
    else:
        cls = "feedback"

    score = _priority_for(cls, len(text))
    return (cls, score)


def create_fingerprint(comment_text: str) -> str:
    """Create a normalized fingerprint for caching similar comments.

    Steps:
    1) Lowercase
    2) Remove numbers and special characters (keep letters and spaces)
    3) Collapse extra whitespace
    4) Remove common stopwords (e.g., "the", "a", "is")
    5) Return a SHA-256 hex digest of the cleaned text
    """
    text = (comment_text or "").lower()
    # Keep only lowercase letters and spaces
    text = re.sub(r"[^a-z\s]", " ", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return hashlib.sha256(b"").hexdigest()

    # Minimal stopword set; extend as needed
    stopwords = {
        "the", "a", "an", "is", "are", "am", "to", "and", "or", "of", "in", "on", "for", "with",
        "it", "this", "that", "you", "your", "i", "we", "they", "he", "she", "be", "was", "were",
    }
    tokens = [t for t in text.split(" ") if t and t not in stopwords]
    cleaned = " ".join(tokens)
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
