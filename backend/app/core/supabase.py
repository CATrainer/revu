"""
Supabase client configuration and utilities.

This module provides integration with Supabase for authentication
and real-time features.
"""

from typing import Optional

from supabase import Client, create_client
from supabase.lib.client_options import ClientOptions

from app.core.config import settings


def get_supabase_client() -> Client:
    """
    Get Supabase client instance.
    
    Returns:
        Client: Configured Supabase client
    """
    options = ClientOptions(
        auto_refresh_token=True,
        persist_session=False,  # We handle sessions ourselves
    )
    
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_ANON_KEY,
        options=options,
    )


def get_supabase_admin_client() -> Client:
    """
    Get Supabase admin client with service role key.
    
    Returns:
        Client: Admin Supabase client
    """
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
    )


# Create singleton clients
supabase = get_supabase_client()
supabase_admin = get_supabase_admin_client()


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
        try:
            # Get user from token
            response = supabase.auth.get_user(access_token)
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
        try:
            response = supabase_admin.auth.admin.create_user({
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
        try:
            response = supabase_admin.auth.admin.update_user_by_id(
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
        try:
            supabase_admin.auth.admin.delete_user(user_id)
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
        try:
            supabase.auth.reset_password_for_email(
                email,
                {
                    "redirect_to": f"{settings.FRONTEND_URL}/auth/reset-password",
                }
            )
            return True
        except Exception:
            return False