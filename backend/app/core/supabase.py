"""
Supabase client configuration and utilities.

This module provides integration with Supabase for authentication
and real-time features.
"""

from typing import Optional

from loguru import logger

from app.core.config import settings

# Delay imports to avoid initialization issues
supabase: Optional["Client"] = None
supabase_admin: Optional["Client"] = None


def get_supabase_client() -> Optional["Client"]:
    """
    Get Supabase client instance.
    
    Returns:
        Optional[Client]: Configured Supabase client or None if not configured
    """
    global supabase
    
    if supabase is not None:
        return supabase
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        logger.warning("Supabase credentials not configured")
        return None
    
    try:
        from supabase import Client, create_client
        
        # Create client without any options to avoid compatibility issues
        supabase = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_ANON_KEY,
        )
        
        return supabase
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


def get_supabase_admin_client() -> Optional["Client"]:
    """
    Get Supabase admin client with service role key.
    
    Returns:
        Optional[Client]: Admin Supabase client or None if not configured
    """
    global supabase_admin
    
    if supabase_admin is not None:
        return supabase_admin
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase admin credentials not configured")
        return None
    
    try:
        from supabase import create_client
        
        # Create client without any options to avoid compatibility issues
        supabase_admin = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
        )
        
        return supabase_admin
    except Exception as e:
        logger.error(f"Failed to create Supabase admin client: {e}")
        return None


class SupabaseAuth:
    """Supabase authentication utilities."""
    
    @staticmethod
    async def verify_token(access_token: str) -> Optional[dict]:
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
        except Exception:
            return None
    
    @staticmethod
    async def create_user(email: str, password: str, metadata: dict = None) -> dict:
        """
        Create a new user in Supabase.
        
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
            raise Exception("Supabase admin client not configured")
            
        try:
            response = admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,  # Auto-confirm for now
                "user_metadata": metadata or {},
            })
            
            if response and response.user:
                return {
                    "id": response.user.id,
                    "email": response.user.email,
                    "created_at": response.user.created_at,
                }
            
            raise Exception("Failed to create user")
        except Exception as e:
            raise Exception(f"Supabase user creation failed: {str(e)}")
    
    @staticmethod
    async def update_user_metadata(user_id: str, metadata: dict) -> bool:
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
            return False
            
        try:
            response = admin_client.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": metadata}
            )
            return response is not None
        except Exception:
            return False
    
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
            return False
            
        try:
            admin_client.auth.admin.delete_user(user_id)
            return True
        except Exception:
            return False
    
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
        except Exception:
            return False