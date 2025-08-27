"""YouTube-related utility helpers.

Functions:
- generate_oauth_state_token: secure 32-char state token for OAuth flows.
- parse_youtube_timestamp: parse YouTube RFC3339 timestamps into aware datetime.
- calculate_api_quota_cost: estimate YouTube Data API v3 quota units for an operation.
- build_youtube_api_url: construct a YouTube Data API v3 URL with query params.
"""
from __future__ import annotations

import datetime as dt
import secrets
import string
from typing import Iterable, Mapping, Optional

from urllib.parse import urlencode


def generate_oauth_state_token(length: int = 32) -> string:
    """Generate a cryptographically secure random state token.

    Args:
        length: Desired length of the token (default 32). Must be >= 1.

    Returns:
        str: A random alphanumeric string of the given length.
    """
    if length < 1:
        raise ValueError("length must be >= 1")
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def parse_youtube_timestamp(ts: Optional[str]) -> Optional[dt.datetime]:
    """Parse a YouTube RFC3339 timestamp string into a timezone-aware datetime.

    YouTube returns timestamps like "2024-07-10T15:32:01Z" or with offsets like
    "2024-07-10T15:32:01+01:00". Returns None for falsy inputs.

    Args:
        ts: Timestamp string from the YouTube API.

    Returns:
        A timezone-aware datetime in the given offset (UTC if 'Z'), or None.
    """
    if not ts:
        return None
    # Support trailing 'Z' (UTC) which datetime.fromisoformat doesn't accept directly
    iso = ts.strip().replace("Z", "+00:00")
    try:
        dt_obj = dt.datetime.fromisoformat(iso)
    except ValueError:
        # Fallback: try removing microseconds if present in odd format
        if "." in iso:
            base, _, tail = iso.partition(".")
            # Remove everything until timezone sign
            for sign in ("+", "-"):
                if sign in tail:
                    tail = tail[tail.index(sign) :]
                    break
            try:
                dt_obj = dt.datetime.fromisoformat(base + tail)
            except Exception as _:
                raise
        else:
            raise

    # Ensure timezone-aware
    if dt_obj.tzinfo is None:
        dt_obj = dt_obj.replace(tzinfo=dt.timezone.utc)
    return dt_obj


# Rough quota estimates for common Data API v3 operations
_DEFAULT_QUOTA = 1
_QUOTA_MAP: dict[str, int] = {
    # Reads
    "videos.list": 1,
    "channels.list": 1,
    "playlistItems.list": 1,
    "commentThreads.list": 1,
    "comments.list": 1,
    "search.list": 100,
    # Mutations (if used)
    "comments.insert": 50,
    "comments.markAsSpam": 50,
    "comments.setModerationStatus": 50,
}


def calculate_api_quota_cost(operation: str, parts: Optional[Iterable[str]] = None) -> int:
    """Return the YouTube API quota cost for a given operation.

    This is a static approximation based on public docs. Some endpoints
    can vary by parameters; for our tracked ops we return fixed values.

    Args:
        operation: Endpoint plus method (e.g., "videos.list", "search.list").
        parts: Optional list of requested parts; currently informational only.

    Returns:
        int: Estimated quota units consumed.
    """
    op_key = operation.strip()
    return _QUOTA_MAP.get(op_key, _DEFAULT_QUOTA)


def build_youtube_api_url(endpoint: str, params: Optional[Mapping[str, object]] = None) -> str:
    """Construct a YouTube Data API v3 URL.

    Args:
        endpoint: The API endpoint name (e.g., "videos", "search").
        params: Mapping of query params. Values can be scalars or iterables.

    Returns:
        str: The complete URL, e.g., "https://www.googleapis.com/youtube/v3/videos?part=snippet".
    """
    base = f"https://www.googleapis.com/youtube/v3/{endpoint}"
    if not params:
        return base
    # Convert booleans to lowercase strings and leave others as-is
    normalized: dict[str, object] = {}
    for k, v in params.items():
        if isinstance(v, bool):
            normalized[k] = str(v).lower()
        else:
            normalized[k] = v
    return base + "?" + urlencode(normalized, doseq=True)
