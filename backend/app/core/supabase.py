"""
Supabase client configuration and utilities.

This module provides integration with Supabase for authentication,
database operations, and real-time features.
"""

from typing import Optional, Dict, Any
import httpx
from loguru import logger
from supabase import create_client, Client

from app.core.config import settings


class SupabaseAuth:
    """Supabase authentication utilities using direct HTTP calls."""
    
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        
        # Create Supabase client for operations that work better with official client
        if self.base_url and self.anon_key:
            self.client: Client = create_client(self.base_url, self.anon_key)
    
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
    
    async def send_password_reset_email(self, email: str) -> bool:
        """
        Send password reset email using Supabase Auth.
        
        Args:
            email: Email address to send reset link to
            
        Returns:
            bool: Success status
        """
        if not self.base_url or not self.anon_key:
            logger.warning("Supabase credentials not configured")
            return False
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/auth/v1/recover",
                    headers={
                        "apikey": self.anon_key,
                        "Content-Type": "application/json",
                    },
                    json={"email": email}
                )
                
                if response.status_code == 200:
                    logger.info(f"Password reset email sent to: {email}")
                    return True
                else:
                    logger.error(f"Failed to send password reset email: {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                logger.error(f"Error sending password reset email: {e}")
                return False
    
    async def reset_password_with_token(self, access_token: str, new_password: str) -> bool:
        """
        Reset user password using Supabase access token.
        
        Args:
            access_token: Supabase access token from reset email
            new_password: New password to set
            
        Returns:
            bool: Success status
        """
        if not self.base_url or not self.anon_key:
            logger.warning("Supabase credentials not configured")
            return False
            
        logger.info(f"Attempting to reset password with token length: {len(access_token)}")
        logger.info(f"Supabase base URL: {self.base_url}")
        
        try:
            # Use the official Supabase client with the session token
            # Set the session using the access token
            logger.info("Setting session with access token...")
            
            # Create a new client instance for this specific session
            temp_client = create_client(self.base_url, self.anon_key)
            
            # Set the session manually
            # The access token from password reset should allow us to update the user
            session_data = {
                'access_token': access_token,
                'refresh_token': '',  # This might not be needed for password reset
                'user': None,
                'expires_in': 3600,
                'token_type': 'bearer'
            }
            
            # Set the session on the client
            temp_client.auth.set_session(access_token, refresh_token='')
            
            logger.info("Session set, attempting to update password...")
            
            # Now try to update the password
            response = temp_client.auth.update({'password': new_password})
            
            if response.user:
                logger.info(f"Password reset successful for user: {response.user.email}")
                return True
            else:
                logger.error("No user returned from password update")
                return False
                
        except Exception as e:
            logger.error(f"Failed to reset password using Supabase client: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            
            # Fall back to the HTTP approach
            logger.info("Falling back to HTTP approach...")
            return await self._reset_password_http(access_token, new_password)
    
    async def _reset_password_http(self, access_token: str, new_password: str) -> bool:
        """
        Fallback HTTP method for password reset.
        """
        async with httpx.AsyncClient() as client:
            try:
                # For Supabase password reset, we need to make the request with the user's session
                url = f"{self.base_url}/auth/v1/user"
                headers = {
                    "apikey": self.anon_key,
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                }
                
                # First verify the token by getting user info
                logger.info(f"Verifying token by getting user info from: {url}")
                get_response = await client.get(url, headers=headers)
                logger.info(f"Get user response status: {get_response.status_code}")
                logger.info(f"Get user response text: {get_response.text}")
                
                if get_response.status_code == 200:
                    # Token is valid, now update the password
                    logger.info("Token verified, updating password...")
                    update_payload = {"password": new_password}
                    
                    update_response = await client.put(url, headers=headers, json=update_payload)
                    logger.info(f"Update password response status: {update_response.status_code}")
                    logger.info(f"Update password response text: {update_response.text}")
                    
                    if update_response.status_code == 200:
                        logger.info("Password reset successful")
                        return True
                    else:
                        logger.error(f"Failed to update password: {update_response.status_code} - {update_response.text}")
                        return False
                else:
                    logger.error(f"Token verification failed: {get_response.status_code} - {get_response.text}")
                    
                    # The token might be expired or invalid
                    # Let's check if we can get more details about the error
                    if get_response.status_code == 401:
                        logger.error("Token appears to be expired or invalid (401 Unauthorized)")
                    elif get_response.status_code == 403:
                        logger.error("Token appears to be forbidden (403 Forbidden)")
                    
                    return False
                    
            except Exception as e:
                logger.error(f"Error resetting password: {e}")
                return False

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