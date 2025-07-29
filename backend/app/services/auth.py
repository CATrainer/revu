"""
Authentication service for handling auth operations.
"""

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.core.supabase import SupabaseAuth
from app.services.user import UserService


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.supabase_auth = SupabaseAuth()

    async def verify_refresh_token(self, refresh_token: str) -> str:
        """
        Verify a refresh token and return the user ID.

        Args:
            refresh_token: The refresh token to verify

        Returns:
            str: User ID from the token

        Raises:
            Exception: If token is invalid
        """
        payload = decode_token(refresh_token)

        if payload.get("type") != "refresh":
            raise Exception("Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise Exception("Invalid token subject")

        return user_id

    async def send_password_reset_email(self, email: str) -> bool:
        """
        Send a password reset email to the user using Supabase.

        Args:
            email: Email address to send reset link to
            
        Returns:
            bool: Success status
        """
        # Check if user exists in our database first
        user_service = UserService(self.db)
        user = await user_service.get_by_email(email)
        
        if not user:
            # For security, we don't reveal if email exists
            logger.info(f"Password reset requested for non-existent email: {email}")
            return True  # Always return success to prevent email enumeration
        
        # Send reset email via Supabase
        success = await self.supabase_auth.send_password_reset_email(email)
        
        if success:
            logger.info(f"Password reset email sent successfully to: {email}")
        else:
            logger.error(f"Failed to send password reset email to: {email}")
            
        return success

    async def reset_password(self, token: str, new_password: str) -> dict:
        """
        Reset user password using Supabase reset token.

        Args:
            token: Password reset token from Supabase
            new_password: New password to set

        Returns:
            dict: Updated user object
            
        Raises:
            Exception: If token is invalid or password reset fails
        """
        # Use the token as an access token to reset password via Supabase
        success = await self.supabase_auth.reset_password_with_token(token, new_password)
        
        if not success:
            raise Exception("Invalid or expired reset token")
        
        # Verify the token to get user data
        user_data = await self.supabase_auth.verify_token(token)
        if not user_data:
            raise Exception("Invalid reset token")
        
        # Get our local user record
        user_service = UserService(self.db)
        user = await user_service.get_by_email(user_data["email"])
        
        if not user:
            raise Exception("User not found in local database")
        
        logger.info(f"Password reset successful for: {user.email}")
        return user
