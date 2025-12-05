"""YouTube action provider for real YouTube platform actions."""

import logging
from typing import Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.interaction import Interaction
from app.models.youtube import YouTubeConnection
from app.services.platform_actions import PlatformActionProvider
from app.services.youtube_client import YouTubeAPIClient

logger = logging.getLogger(__name__)


class YouTubeActionProvider(PlatformActionProvider):
    """
    YouTube implementation of platform actions.

    Uses the YouTube Data API v3 to:
    - Reply to comments
    - Delete comments
    - Like/heart comments
    """

    async def _get_client(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> YouTubeAPIClient:
        """Get authenticated YouTube client for this interaction's user."""
        # Get the user's YouTube connection
        result = await session.execute(
            select(YouTubeConnection).where(
                YouTubeConnection.user_id == interaction.user_id,
                YouTubeConnection.connection_status == 'active'
            )
        )
        connection = result.scalar_one_or_none()

        if not connection:
            raise ValueError("No active YouTube connection found for user")

        if not connection.access_token:
            raise ValueError("YouTube connection missing access token")

        return YouTubeAPIClient(
            access_token=connection.access_token,
            refresh_token=connection.refresh_token,
            scopes=["https://www.googleapis.com/auth/youtube.force-ssl"]
        )

    async def send_reply(
        self,
        interaction: Interaction,
        reply_text: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Reply to a YouTube comment.

        Uses the comments.insert API with the parent comment ID.
        """
        try:
            client = await self._get_client(interaction, session)

            # The platform_id is the YouTube comment ID
            parent_comment_id = interaction.platform_id

            if not parent_comment_id:
                return {
                    "success": False,
                    "error": "Missing YouTube comment ID"
                }

            # Post the reply
            result = client.post_comment_reply(
                parent_comment_id=parent_comment_id,
                text=reply_text
            )

            # Extract reply ID from response
            reply_id = result.get("id", "")

            logger.info(f"Successfully replied to YouTube comment {parent_comment_id}")

            return {
                "success": True,
                "reply_id": reply_id,
                "platform_response": result
            }

        except Exception as e:
            logger.error(f"Failed to reply to YouTube comment: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def delete_interaction(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Delete a YouTube comment.

        Note: Can only delete comments you own or on your videos.
        """
        try:
            client = await self._get_client(interaction, session)

            comment_id = interaction.platform_id

            if not comment_id:
                return {
                    "success": False,
                    "error": "Missing YouTube comment ID"
                }

            # Delete the comment (returns None on success)
            client.delete_comment(comment_id=comment_id)

            logger.info(f"Successfully deleted YouTube comment {comment_id}")

            return {"success": True}

        except Exception as e:
            logger.error(f"Failed to delete YouTube comment: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def mark_as_read(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Mark as read - YouTube doesn't support this natively.

        We just update our local state.
        """
        # YouTube doesn't have a "read" concept for comments
        # Just return success to update local state
        return {"success": True}

    async def react_to_interaction(
        self,
        interaction: Interaction,
        reaction_type: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        React to a YouTube comment (like/heart).

        Note: YouTube API supports liking comments but not hearting.
        Hearting is only available through YouTube Studio.
        """
        try:
            if reaction_type not in ["like"]:
                return {
                    "success": False,
                    "error": f"Unsupported reaction type: {reaction_type}. YouTube only supports 'like'."
                }

            client = await self._get_client(interaction, session)

            # YouTube uses comments.setModerationStatus for some actions
            # but liking is through comments.markAsSpam with rating parameter
            # Actually, the proper way is using the commentThreads rating

            # For now, return not implemented
            # The actual implementation would use:
            # service.comments().setModerationStatus or similar

            logger.warning("YouTube comment reactions not fully implemented")

            return {
                "success": False,
                "error": "YouTube comment liking requires additional API implementation"
            }

        except Exception as e:
            logger.error(f"Failed to react to YouTube comment: {e}")
            return {
                "success": False,
                "error": str(e)
            }
