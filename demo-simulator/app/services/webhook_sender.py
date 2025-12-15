"""Service to send webhook events to main Repruv app."""
import logging
import httpx
import hmac
import hashlib
from typing import Dict

from app.core.config import settings

logger = logging.getLogger(__name__)


class WebhookSender:
    """Send webhook events to main app."""
    
    @staticmethod
    async def send_interaction_created(interaction_data: Dict) -> bool:
        """
        Send interaction.created webhook to main app.
        
        Args:
            interaction_data: Interaction payload
            
        Returns:
            True if successful, False otherwise
        """
        webhook_url = f"{settings.MAIN_APP_URL}/api/v1/webhooks/demo"
        
        payload = {
            'event': 'interaction.created',
            'data': interaction_data,
        }
        
        return await WebhookSender._send_webhook(webhook_url, payload)
    
    @staticmethod
    async def send_content_published(content_data: Dict) -> bool:
        """
        Send content.published webhook to main app.
        
        Args:
            content_data: Content payload
            
        Returns:
            True if successful, False otherwise
        """
        webhook_url = f"{settings.MAIN_APP_URL}/api/v1/webhooks/demo"
        
        payload = {
            'event': 'content.published',
            'data': content_data,
        }
        
        return await WebhookSender._send_webhook(webhook_url, payload)
    
    @staticmethod
    async def send_content_metrics_updated(content_data: Dict) -> bool:
        """
        Send content.metrics_updated webhook to main app.
        
        Args:
            content_data: Content metrics payload
            
        Returns:
            True if successful, False otherwise
        """
        webhook_url = f"{settings.MAIN_APP_URL}/api/v1/webhooks/demo"
        
        payload = {
            'event': 'content.metrics_updated',
            'data': content_data,
        }
        
        return await WebhookSender._send_webhook(webhook_url, payload)
    
    @staticmethod
    async def send_reply_followup(interaction_data: Dict) -> bool:
        """
        Send reply.followup webhook when demo user responds to creator's reply.
        
        Args:
            interaction_data: Follow-up interaction payload
            
        Returns:
            True if successful, False otherwise
        """
        webhook_url = f"{settings.MAIN_APP_URL}/api/v1/webhooks/demo"
        
        payload = {
            'event': 'reply.followup',
            'data': interaction_data,
        }
        
        return await WebhookSender._send_webhook(webhook_url, payload)
    
    @staticmethod
    async def _send_webhook(url: str, payload: Dict) -> bool:
        """Send webhook with HMAC signature."""
        try:
            # Create HMAC signature
            signature = WebhookSender._create_signature(payload)
            
            headers = {
                'Content-Type': 'application/json',
                'X-Demo-Signature': signature,
                'User-Agent': 'Repruv-Demo-Simulator/1.0',
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                )
                
                if response.status_code == 200:
                    logger.info(f"Webhook sent successfully: {payload['event']}")
                    return True
                else:
                    logger.error(f"Webhook failed: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending webhook: {str(e)}")
            return False
    
    @staticmethod
    def _create_signature(payload: Dict) -> str:
        """Create HMAC signature for webhook payload."""
        import json
        
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            settings.MAIN_APP_WEBHOOK_SECRET.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    @staticmethod
    def verify_signature(payload: Dict, signature: str) -> bool:
        """Verify HMAC signature (for incoming webhooks if needed)."""
        expected = WebhookSender._create_signature(payload)
        return hmac.compare_digest(expected, signature)
