"""
User service for handling user operations.
"""

from typing import Optional
from uuid import UUID

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.core.supabase import supabase_auth  # Changed from supabase_minimal
from app.models.user import User
from app.schemas.user import UserCreate


class UserService:
    """Service for user operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: UUID) -> Optional[User]:
        """
        Get a user by ID.

        Args:
            user_id: User UUID

        Returns:
            Optional[User]: User object if found
        """
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get a user by email address.

        Args:
            email: Email address to search for

        Returns:
            Optional[User]: User object if found, None otherwise
        """
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_auth_id(self, auth_id: str) -> Optional[User]:
        """
        Get a user by Supabase auth ID.

        Args:
            auth_id: Supabase auth ID

        Returns:
            Optional[User]: User object if found
        """
        result = await self.db.execute(
            select(User).where(User.auth_id == auth_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_create: UserCreate) -> User:
        """
        Create a new user.

        Args:
            user_create: User creation data

        Returns:
            User: Created user object
        """
        # Create user in Supabase
        try:
            supabase_user = await supabase_auth.create_user(
                email=user_create.email,
                password=user_create.password,
                metadata={"full_name": user_create.full_name}
            )
            auth_id = supabase_user["id"]
        except Exception as e:
            logger.error(f"Failed to create Supabase user: {e}")
            # Fallback to local auth
            auth_id = None

        # Hash password for local storage (backup auth)
        hashed_password = get_password_hash(user_create.password)

        # Create user in database
        user = User(
            email=user_create.email,
            full_name=user_create.full_name,
            auth_id=auth_id,
            hashed_password=hashed_password,
            is_active=True,
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        logger.info(f"Created user: {user.email}")
        return user

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user by email and password.

        Args:
            email: User email
            password: Plain text password

        Returns:
            Optional[User]: User object if authentication successful
        """
        user = await self.get_by_email(email)
        if not user:
            return None

        # Try Supabase authentication first
        try:
            session = await supabase_auth.sign_in_with_password(email, password)
            if session and session.get("user"):
                # Update last login
                await self.update_last_login(user.id)
                return user
        except Exception as e:
            logger.warning(f"Supabase auth failed, falling back to local: {e}")

        # Fallback to local password verification
        if verify_password(password, user.hashed_password):
            await self.update_last_login(user.id)
            return user

        return None

    async def update_last_login(self, user_id: UUID) -> None:
        """
        Update user's last login timestamp.

        Args:
            user_id: User UUID
        """
        from datetime import datetime

        user = await self.get(user_id)
        if user:
            user.last_login_at = datetime.utcnow()
            await self.db.commit()