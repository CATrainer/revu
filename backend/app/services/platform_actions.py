"""
Platform-agnostic action service.

This service provides a unified interface for all platform actions
(reply, delete, react, etc.) that works identically for demo and real platforms.

The main application code should NEVER know if it's talking to:
- Demo service (REST API)
- YouTube (Google API)
- Instagram (Graph API)
- TikTok (REST API)

All platforms implement the same interface.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from uuid import UUID
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interaction import Interaction

logger = logging.getLogger(__name__)


class PlatformActionProvider(ABC):
    """Abstract base class for all platform action providers."""
    
    @abstractmethod
    async def send_reply(
        self,
        interaction: Interaction,
        reply_text: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Send a reply to an interaction.
        
        Args:
            interaction: The interaction to reply to
            reply_text: The text of the reply
            session: Database session
            
        Returns:
            {
                "success": bool,
                "reply_id": str,  # Platform-specific ID
                "error": Optional[str]
            }
        """
        pass
    
    @abstractmethod
    async def delete_interaction(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Delete an interaction from the platform.
        
        Returns:
            {
                "success": bool,
                "error": Optional[str]
            }
        """
        pass
    
    @abstractmethod
    async def mark_as_read(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Mark an interaction as read on the platform.
        
        Not all platforms support this (e.g., YouTube doesn't have "read" status).
        
        Returns:
            {
                "success": bool,
                "error": Optional[str]
            }
        """
        pass
    
    @abstractmethod
    async def react_to_interaction(
        self,
        interaction: Interaction,
        reaction_type: str,  # "like", "heart", etc.
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        React to an interaction (like, heart, etc.).
        
        Returns:
            {
                "success": bool,
                "error": Optional[str]
            }
        """
        pass


class PlatformActionService:
    """
    Unified service for all platform actions.
    
    Routes actions to the appropriate provider based on:
    - interaction.is_demo (demo provider)
    - interaction.platform (YouTube, Instagram, etc.)
    
    Usage:
        service = PlatformActionService()
        result = await service.send_reply(interaction, "Thanks!")
    """
    
    def __init__(self):
        self._providers: Dict[str, PlatformActionProvider] = {}
        self._demo_provider: Optional[PlatformActionProvider] = None
        
        # Lazy load providers as needed
        logger.info("PlatformActionService initialized")
    
    def _get_provider(self, interaction: Interaction) -> PlatformActionProvider:
        """Get the appropriate provider for this interaction."""
        
        # Demo mode uses demo provider
        if interaction.is_demo:
            if not self._demo_provider:
                from app.services.demo_action_provider import DemoActionProvider
                self._demo_provider = DemoActionProvider()
            return self._demo_provider
        
        # Real platforms
        platform = interaction.platform.lower()
        
        if platform not in self._providers:
            # Lazy load the provider
            if platform == 'youtube':
                from app.services.youtube_action_provider import YouTubeActionProvider
                self._providers[platform] = YouTubeActionProvider()
            elif platform == 'instagram':
                from app.services.instagram_action_provider import InstagramActionProvider
                self._providers[platform] = InstagramActionProvider()
            elif platform == 'tiktok':
                from app.services.tiktok_action_provider import TikTokActionProvider
                self._providers[platform] = TikTokActionProvider()
            else:
                raise ValueError(f"Unsupported platform: {platform}")
        
        return self._providers[platform]
    
    async def send_reply(
        self,
        interaction: Interaction,
        reply_text: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Send reply to any platform.
        
        This method works identically for demo and real platforms.
        """
        provider = self._get_provider(interaction)
        
        logger.info(
            f"Sending reply to {interaction.platform} interaction {interaction.id} "
            f"(is_demo={interaction.is_demo})"
        )
        
        result = await provider.send_reply(interaction, reply_text, session)
        
        # Update local state if successful
        if result.get("success"):
            from datetime import datetime
            interaction.replied_at = datetime.utcnow()
            interaction.status = 'answered'
            await session.commit()
            
            logger.info(f"✅ Reply sent successfully to {interaction.platform}")
        else:
            logger.warning(f"❌ Reply failed: {result.get('error')}")
        
        return result
    
    async def delete_interaction(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Delete interaction from any platform."""
        provider = self._get_provider(interaction)
        
        logger.info(
            f"Deleting {interaction.platform} interaction {interaction.id} "
            f"(is_demo={interaction.is_demo})"
        )
        
        result = await provider.delete_interaction(interaction, session)
        
        if result.get("success"):
            interaction.status = 'deleted'
            await session.commit()
            logger.info(f"✅ Interaction deleted from {interaction.platform}")
        
        return result
    
    async def mark_as_read(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Mark interaction as read on any platform."""
        provider = self._get_provider(interaction)
        
        result = await provider.mark_as_read(interaction, session)
        
        if result.get("success"):
            from datetime import datetime
            interaction.read_at = datetime.utcnow()
            interaction.status = 'read'
            await session.commit()
        
        return result
    
    async def react_to_interaction(
        self,
        interaction: Interaction,
        reaction_type: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """React to interaction on any platform."""
        provider = self._get_provider(interaction)
        
        return await provider.react_to_interaction(
            interaction,
            reaction_type,
            session
        )


# Singleton instance
_platform_action_service: Optional[PlatformActionService] = None


def get_platform_action_service() -> PlatformActionService:
    """Get singleton instance of PlatformActionService."""
    global _platform_action_service
    if _platform_action_service is None:
        _platform_action_service = PlatformActionService()
    return _platform_action_service
