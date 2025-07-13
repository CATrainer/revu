"""
Minimal Supabase client for authentication only.

This is a workaround for the proxy parameter issue in the Supabase client.
"""

import httpx
from typing import Optional, Dict
from loguru import logger

from app.core.config import settings


class MinimalSupabaseAuth:
    """Minimal Supabase authentication client."""
    
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        
    async def create_user(self, email: str, password: str, metadata: dict = None) -> dict:
        """Create a user using Supabase Auth API directly."""
        if not self.base_url or not self.service_key:
            raise Exception("Supabase not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/auth/v1/admin/users",
                headers={
                    "apikey": self.service_key,
                    "Authorization": f"Bearer {self.service_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": metadata or {},
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "id": data["id"],
                    "email": data["email"],
                    "created_at": data["created_at"],
                }
            else:
                raise Exception(f"Failed to create user: {response.text}")
    
    async def verify_token(self, access_token: str) -> Optional[Dict]:
        """Verify an access token."""
        if not self.base_url or not self.anon_key:
            return None
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/auth/v1/user",
                headers={
                    "apikey": self.anon_key,
                    "Authorization": f"Bearer {access_token}",
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "id": data["id"],
                    "email": data["email"],
                    "metadata": data.get("user_metadata", {}),
                }
            
            return None
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete a user."""
        if not self.base_url or not self.service_key:
            return False
            
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": self.service_key,
                    "Authorization": f"Bearer {self.service_key}",
                }
            )
            
            return response.status_code == 200


# Create a global instance
supabase_auth = MinimalSupabaseAuth()