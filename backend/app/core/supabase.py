"""
Supabase client configuration and utilities.

This module provides integration with Supabase for authentication,
database operations, and real-time features.
"""

from typing import Optional, Dict, Any
import httpx
from loguru import logger

from app.core.config import settings

# Supabase client instances
_supabase_client: Optional[Any] = None
_supabase_admin_client: Optional[Any] = None


def get_supabase_client():
    """
    Get Supabase client instance (singleton pattern).
    
    Returns:
        Supabase client or None if not configured
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        logger.warning("Supabase credentials not configured")
        return None
    
    try:
        from supabase import create_client, Client
        
        # Create client without proxy options to avoid the error
        _supabase_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_ANON_KEY
        )
        
        logger.info("Supabase client initialized successfully")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


def get_supabase_admin_client():
    """
    Get Supabase admin client with service role key (singleton pattern).
    
    Returns:
        Admin Supabase client or None if not configured
    """
    global _supabase_admin_client
    
    if _supabase_admin_client is not None:
        return _supabase_admin_client
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase admin credentials not configured")
        return None
    
    try:
        from supabase import create_client, Client
        
        # Create admin client
        _supabase_admin_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY
        )
        
        logger.info("Supabase admin client initialized successfully")
        return _supabase_admin_client
    except Exception as e:
        logger.error(f"Failed to create Supabase admin client: {e}")
        return None



class SupabaseAuth:
    """Supabase authentication utilities using the official client."""
    
    @staticmethod
    async def verify_token(access_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Supabase access token and get user data.
        
        Args:
            access_token: JWT access token from Supabase
            
        Returns:
            dict: User data if valid, None otherwise
        """
        client = get_supabase_client()
        if not client:
            return None
            
        try:
            # Get user from token
            response = client.auth.get_user(access_token)
            if response and response.user:
                return {
                    "id": response.user.id,
                    "email": response.user.email,
                    "metadata": response.user.user_metadata,
                }
            return None
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None
    
    @staticmethod
    async def create_user(email: str, password: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
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
        admin_client = get_supabase_admin_client()
        if not admin_client:
            # Fallback to using HTTP client directly if admin client fails
            return await SupabaseAuth._create_user_http(email, password, metadata)
            
        try:
            # Use the admin API to create user
            response = admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,  # Auto-confirm for now
                "user_metadata": metadata or {}
            })
            
            if response and response.user:
                return {
                    "id": response.user.id,
                    "email": response.user.email,
                    "created_at": response.user.created_at,
                }
            
            raise Exception("Failed to create user - no user returned")
        except Exception as e:
            logger.error(f"Supabase user creation failed: {e}")
            # Try HTTP fallback
            return await SupabaseAuth._create_user_http(email, password, metadata)
    
    @staticmethod
    async def _create_user_http(email: str, password: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Create user using direct HTTP API call as fallback.
        
        This is used when the Supabase Python client has issues.
        """
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise Exception("Supabase not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
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
    
    @staticmethod
    async def update_user_metadata(user_id: str, metadata: Dict) -> bool:
        """
        Update user metadata in Supabase.
        
        Args:
            user_id: Supabase user ID
            metadata: Metadata to update
            
        Returns:
            bool: Success status
        """
        admin_client = get_supabase_admin_client()
        if not admin_client:
            return await SupabaseAuth._update_user_metadata_http(user_id, metadata)
            
        try:
            response = admin_client.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": metadata}
            )
            return response is not None
        except Exception as e:
            logger.error(f"Failed to update user metadata: {e}")
            return await SupabaseAuth._update_user_metadata_http(user_id, metadata)
    
    @staticmethod
    async def _update_user_metadata_http(user_id: str, metadata: Dict) -> bool:
        """Update user metadata using direct HTTP API call."""
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return False
            
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": "application/json",
                },
                json={"user_metadata": metadata}
            )
            
            return response.status_code == 200
    
    @staticmethod
    async def delete_user(user_id: str) -> bool:
        """
        Delete a user from Supabase.
        
        Args:
            user_id: Supabase user ID
            
        Returns:
            bool: Success status
        """
        admin_client = get_supabase_admin_client()
        if not admin_client:
            return await SupabaseAuth._delete_user_http(user_id)
            
        try:
            admin_client.auth.admin.delete_user(user_id)
            return True
        except Exception as e:
            logger.error(f"Failed to delete user: {e}")
            return await SupabaseAuth._delete_user_http(user_id)
    
    @staticmethod
    async def _delete_user_http(user_id: str) -> bool:
        """Delete user using direct HTTP API call."""
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return False
            
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                }
            )
            
            return response.status_code == 200
    
    @staticmethod
    async def send_password_reset(email: str) -> bool:
        """
        Send password reset email.
        
        Args:
            email: User email
            
        Returns:
            bool: Success status
        """
        client = get_supabase_client()
        if not client:
            return False
            
        try:
            client.auth.reset_password_for_email(
                email,
                {
                    "redirect_to": f"{settings.FRONTEND_URL}/auth/reset-password",
                }
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset: {e}")
            return False
    
    @staticmethod
    async def sign_in_with_password(email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Sign in a user with email and password.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            dict: Session data with access token, or None if failed
        """
        client = get_supabase_client()
        if not client:
            return None
            
        try:
            response = client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response and response.user:
                return {
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "metadata": response.user.user_metadata,
                    },
                    "access_token": response.session.access_token if response.session else None,
                    "refresh_token": response.session.refresh_token if response.session else None,
                }
            return None
        except Exception as e:
            logger.error(f"Sign in failed: {e}")
            return None


# Create global instance for backward compatibility
supabase_auth = SupabaseAuth()