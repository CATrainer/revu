"""DataProcessor normalizes & enriches raw platform items to unified mention records."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from hashlib import sha1
from typing import Any, Dict, List, Optional

HASHTAG_RE = re.compile(r"(?i)#(\w{2,100})")
MENTION_RE = re.compile(r"(?i)@(\w{2,100})")
URL_RE = re.compile(r"https?://\S+")


@dataclass
class RawItem:
    id: str
    text: str
    author: Optional[str] = None
    author_id: Optional[str] = None
    published_at: Optional[str] = None  # ISO8601
    like_count: Optional[int] = None
    reply_count: Optional[int] = None
    share_count: Optional[int] = None
    view_count: Optional[int] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProcessedMention:
    external_id: str
    text: str
    author_handle: Optional[str]
    author_external_id: Optional[str]
    published_at: Optional[str]
    hashtags: List[str]
    mentions: List[str]
    urls: List[str]
    engagement: Dict[str, Any]
    reach_score: float
    dedupe_key: str
    raw: Dict[str, Any]


class DataProcessor:
    """Transforms raw heterogeneous items into consistent processed mentions."""

    def normalize(self, item: RawItem, platform: str) -> ProcessedMention:
        text = (item.text or "").strip()
        hashtags = [h.lower() for h in HASHTAG_RE.findall(text)][:50]
        mentions = [m.lower() for m in MENTION_RE.findall(text)][:50]
        urls = URL_RE.findall(text)[:25]

        like = item.like_count or 0
        rep = item.reply_count or 0
        share = item.share_count or 0
        view = item.view_count or 0

        # Simple reach heuristic
        reach_score = (like * 2 + rep * 3 + share * 5 + min(view, 10000) / 100) ** 0.5

        engagement = {
            "likes": like,
            "replies": rep,
            "shares": share,
            "views": view,
            "platform": platform,
        }

        dedupe_base = f"{platform}:{item.id}:{sha1(text.encode('utf-8')).hexdigest()}"
        dedupe_key = sha1(dedupe_base.encode("utf-8")).hexdigest()

        return ProcessedMention(
            external_id=item.id,
            text=text,
            author_handle=item.author,
            author_external_id=item.author_id,
            published_at=item.published_at,
            hashtags=hashtags,
            mentions=mentions,
            urls=urls,
            engagement=engagement,
            reach_score=round(reach_score, 4),
            dedupe_key=dedupe_key,
            raw={"extra": item.extra},
        )

    def post_process(self, items: List[ProcessedMention]) -> List[ProcessedMention]:
        seen = set()
        unique: List[ProcessedMention] = []
        for it in items:
            if it.dedupe_key in seen:
                continue
            seen.add(it.dedupe_key)
            unique.append(it)
        return unique
