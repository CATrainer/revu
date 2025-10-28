"""
Demo platform action provider.

Sends actions back to the demo-simulator service via REST API.
"""

import logging
import httpx
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.interaction import Interaction
from app.services.platform_actions import PlatformActionProvider

logger = logging.getLogger(__name__)


class DemoActionProvider(PlatformActionProvider):
    """
    Action provider for demo mode.
    
    Sends actions to demo-simulator service via REST API.
    """
    
    def __init__(self):
        self.demo_url = settings.DEMO_SERVICE_URL
        self.timeout = 10.0
        logger.info(f"DemoActionProvider initialized (demo_url={self.demo_url})")
    
    async def send_reply(
        self,
        interaction: Interaction,
        reply_text: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Send reply to demo interaction."""
        
        url = f"{self.demo_url}/actions/reply"
        
        payload = {
            "interaction_id": str(interaction.id),
            "platform_id": interaction.platform_id,
            "platform": interaction.platform,
            "reply_text": reply_text,
            "user_id": str(interaction.user_id),
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "reply_id": data.get("reply_id"),
                    }
                else:
                    logger.error(f"Demo service error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "error": f"Demo service returned {response.status_code}"
                    }
        
        except httpx.TimeoutException:
            logger.error("Demo service timeout - cannot send reply")
            return {
                "success": False,
                "error": "Demo service is unreachable (timeout). Response not sent."
            }
        
        except Exception as e:
            logger.error(f"Error sending reply to demo service: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Failed to reach demo service: {str(e)}"
            }
    
    async def delete_interaction(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Delete demo interaction."""
        
        url = f"{self.demo_url}/actions/delete/{interaction.platform_id}"
        
        params = {
            "user_id": str(interaction.user_id),
            "platform": interaction.platform,
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.delete(url, params=params)
                
                if response.status_code == 200:
                    return {"success": True}
                else:
                    return {
                        "success": False,
                        "error": f"Demo service returned {response.status_code}"
                    }
        
        except httpx.TimeoutException:
            logger.error("Demo service timeout on delete")
            return {"success": False, "error": "Demo service unreachable"}
        
        except Exception as e:
            logger.error(f"Error deleting demo interaction: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def mark_as_read(
        self,
        interaction: Interaction,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Mark demo interaction as read."""
        
        url = f"{self.demo_url}/actions/mark-read"
        
        payload = {
            "platform_id": interaction.platform_id,
            "user_id": str(interaction.user_id),
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    return {"success": True}
                else:
                    return {
                        "success": False,
                        "error": f"Demo service returned {response.status_code}"
                    }
        
        except httpx.TimeoutException:
            logger.error("Demo service timeout on mark_as_read")
            return {"success": False, "error": "Demo service unreachable"}
        
        except Exception as e:
            logger.error(f"Error marking demo interaction as read: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def react_to_interaction(
        self,
        interaction: Interaction,
        reaction_type: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """React to demo interaction (like, heart, etc.)."""
        
        url = f"{self.demo_url}/actions/react"
        
        payload = {
            "platform_id": interaction.platform_id,
            "reaction_type": reaction_type,
            "user_id": str(interaction.user_id),
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    return {"success": True}
                else:
                    return {
                        "success": False,
                        "error": f"Demo service returned {response.status_code}"
                    }
        
        except Exception as e:
            logger.error(f"Error reacting to demo interaction: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
