"""TikTok action provider for real TikTok platform actions."""

import logging
from typing import Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interaction import Interaction
from app.services.platform_actions import PlatformActionProvider

logger = logging.getLogger(__name__)


class TikTokActionProvider(PlatformActionProvider):
    """
    TikTok implementation of platform actions.

    Note: TikTok API is more limited than YouTube/Instagram.
    Comment replies may require the TikTok Content Posting API.
    """

    async def send_reply(
        self,
        interaction: Interaction,
        reply_text: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Reply to a TikTok comment.

        TikTok's API for comment replies is limited.
        """
        try:
            logger.warning("TikTok reply not yet implemented")

            return {
                "success": False,
                "error": "TikTok integration coming soon. Please reply directly on TikTok for now."
            }

        except Exception as e:
            logger.error(f"Failed to reply to TikTok comment: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def delete_interaction(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Delete a TikTok comment."""
        return {
            "success": False,
            "error": "TikTok delete coming soon."
        }

    async def mark_as_read(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Mark as read - TikTok doesn't support this."""
        return {"success": True}

    async def react_to_interaction(
        self,
        interaction: Interaction,
        reaction_type: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """React to a TikTok comment."""
        return {
            "success": False,
            "error": "TikTok reactions not available via API"
        }
