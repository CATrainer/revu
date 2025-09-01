from __future__ import annotations

"""ClaudeService: thin wrapper around Anthropic client for generating YouTube comment replies."""

import os
from typing import Optional

from anthropic import Anthropic, APIError  # type: ignore

from app.core.config import settings
from loguru import logger


class ClaudeService:
    """Service for generating brief, friendly YouTube comment responses via Claude."""

    def __init__(self) -> None:
        # Prefer env var directly; fall back to settings for convenience in local/dev
        api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
        if not api_key:
            logger.warning("CLAUDE_API_KEY not set; ClaudeService will return None for generations")
        self.client = Anthropic(api_key=api_key) if api_key else None

    def generate_response(self, comment_text: str, channel_name: str, video_title: str) -> Optional[str]:
        """Generate a short, friendly YouTube comment reply.

        Returns the model text or None on error.
        """
        if not self.client:
            return None

        # Compose a concise, safe prompt
        system_prompt = (
            "You are a helpful assistant writing brief, friendly, and professional replies to YouTube comments. "
            "Keep replies under 2 sentences, positive, and aligned with the creator's tone. Avoid emojis unless appropriate."
        )
        user_prompt = (
            f"Channel: {channel_name}\n"
            f"Video: {video_title}\n"
            f"Original comment: {comment_text}\n\n"
            "Write a succinct reply that acknowledges the commenter and is helpful where possible."
        )

        try:
            # Prefer configured model name when available; fallback sensible default
            model = getattr(settings, "CLAUDE_MODEL", None) or "claude-3-5-sonnet-20240620"
            resp = self.client.messages.create(
                model=model,
                max_tokens=getattr(settings, "CLAUDE_MAX_TOKENS", 200),
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                temperature=0.3,
            )
            # Anthropic responses contain content blocks; extract first text block
            content = resp.content if hasattr(resp, "content") else None
            if isinstance(content, list) and content:
                # Each block may be a dict-like with {type: 'text', text: '...'}
                first = content[0]
                text = getattr(first, "text", None) or (first.get("text") if isinstance(first, dict) else None)
                return text or None
            # Some SDK versions expose .output_text on responses
            text = getattr(resp, "output_text", None)
            return text or None
        except APIError as e:  # anthropic-specific error
            logger.error(f"Claude APIError: {e}")
            return None
        except Exception as e:  # generic fallback
            logger.exception(f"Claude generation failed: {e}")
            return None
