"""
Supabase client configuration and utilities.

This module provides integration with Supabase for authentication,
database operations, and real-time features.
"""

from typing import Optional, Dict, Any
import httpx
from loguru import logger

from app.core.config import settings


class SupabaseAuth:
    """Supabase authentication utilities using direct HTTP calls."""
    
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
    
    async def verify_token(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Supabase access token and get user data.
        
        Args:
            access_token: JWT access token from Supabase
            
        Returns:
            dict: User data if valid, None otherwise
        """
        if not self.base_url or not self.anon_key:
            logger.warning("Supabase credentials not configured")
            return None
            
        async with httpx.AsyncClient() as client:
            try:
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
            except Exception as e:
                logger.error(f"Token verification failed: {e}")
                return None
    
    async def create_user(self, email: str, password: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Create a new user in Supabase Auth.
        
        Args:
            email: User email
            password: User password  
            metadata: Additional user metadata
            
        Returns:
            dict: Created user data
            
        Raises:
            Exception: If user creation fails
        """
        if not self.base_url or not self.service_key:
            raise Exception("Supabase admin credentials not configured")
            
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
    
    async def update_user_metadata(self, user_id: str, metadata: Dict) -> bool:
        """
        Update user metadata in Supabase.
        
        Args:
            user_id: Supabase user ID
            metadata: Metadata to update
            
        Returns:
            bool: Success status
        """
        if not self.base_url or not self.service_key:
            return False
            
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.base_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": self.service_key,
                    "Authorization": f"Bearer {self.service_key}",
                    "Content-Type": "application/json",
                },
                json={"user_metadata": metadata}
            )
            
            return response.status_code == 200
    
    async def delete_user(self, user_id: str) -> bool:
        """
        Delete a user from Supabase.
        
        Args:
            user_id: Supabase user ID
            
        Returns:
            bool: Success status
        """
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
    
    async def send_password_reset(self, email: str) -> bool:
        """
        Send password reset email.
        
        Args:
            email: User email
            
        Returns:
            bool: Success status
        """
        if not self.base_url or not self.anon_key:
            return False
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/auth/v1/recover",
                    headers={
                        "apikey": self.anon_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "email": email,
                        "redirect_to": f"{settings.FRONTEND_URL}/auth/reset-password",
                    }
                )
                
                return response.status_code in [200, 204]
            except Exception as e:
                logger.error(f"Failed to send password reset: {e}")
                return False
    
    async def sign_in_with_password(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Sign in a user with email and password.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            dict: Session data with access token, or None if failed
        """
        if not self.base_url or not self.anon_key:
            return None
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/auth/v1/token?grant_type=password",
                    headers={
                        "apikey": self.anon_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "email": email,
                        "password": password,
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "user": {
                            "id": data["user"]["id"],
                            "email": data["user"]["email"],
                            "metadata": data["user"].get("user_metadata", {}),
                        },
                        "access_token": data["access_token"],
                        "refresh_token": data["refresh_token"],
                    }
                
                return None
            except Exception as e:
                logger.error(f"Sign in failed: {e}")
                return None


# Create global instance for backward compatibility
supabase_auth = SupabaseAuth()


# Stub functions that used to return Supabase client
def get_supabase_client():
    """
    Get Supabase client instance.
    
    Note: This now returns None as we use direct HTTP calls instead.
    The Supabase Python client has compatibility issues.
    """
    logger.warning("get_supabase_client() called - using direct HTTP implementation instead")
    return None


def get_supabase_admin_client():
    """
    Get Supabase admin client.
    
    Note: This now returns None as we use direct HTTP calls instead.
    The Supabase Python client has compatibility issues.
    """
    logger.warning("get_supabase_admin_client() called - using direct HTTP implementation instead")
    return None