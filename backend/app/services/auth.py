"""
Authentication service for handling auth operations.
"""

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

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

    async def send_password_reset_email(self, email: str) -> None:
        """
        Send a password reset email to the user.

        Args:
            email: Email address to send reset link to
        """
        # TODO: Implement email sending
        logger.info(f"Password reset email would be sent to: {email}")
        pass

    async def reset_password(self, token: str, new_password: str) -> dict:
        """
        Reset user password using a reset token.

        Args:
            token: Password reset token
            new_password: New password to set

        Returns:
            dict: Updated user object
        """
        # TODO: Implement password reset
        logger.info("Password reset would be performed")
        return {
            "id": "mock-user-id",
            "email": "user@example.com",
            "full_name": "Test User",
        }
