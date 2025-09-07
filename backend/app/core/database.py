"""
Database configuration and session management.

This module sets up SQLAlchemy for async database operations,
provides session management, and defines base model classes.
"""

import uuid
from datetime import datetime
from typing import AsyncGenerator

from loguru import logger
from sqlalchemy import Column, DateTime, MetaData, create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, declared_attr
from sqlalchemy.pool import NullPool, QueuePool

from app.core.config import settings

# --- Diagnostics & URL normalization ---------------------------------------------------------
# Some deploy environments (e.g. Railway) may inject DATABASE_URL without +asyncpg.
# For async SQLAlchemy we need the async driver specified. We transparently upgrade here
# and log a warning so the underlying cause is visible in logs.
raw_url = settings.DATABASE_URL
effective_async_url = raw_url
if raw_url.startswith("postgresql://") and "+asyncpg" not in raw_url:
    # Avoid double replacement if driver already correct
    effective_async_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    logger.warning(
        "DATABASE_URL lacked +asyncpg driver; normalized to async variant. Original={orig}",
        orig=raw_url,
    )

def _log_env_summary():  # lightweight, avoid leaking secrets
    try:
        redacted_url = effective_async_url.split("@")[-1]  # host/db part only
        logger.info(
            "DB init: env={env} driver_url={url} echo={echo} pool(prod?={prod})", 
            env=settings.ENVIRONMENT,
            url=redacted_url,
            echo=settings.DATABASE_ECHO,
            prod=settings.ENVIRONMENT == "production",
        )
    except Exception:
        pass
_log_env_summary()

# Create async engine with conditional pooling
if settings.ENVIRONMENT == "production":
    # Use NullPool for production/serverless environments
    engine = create_async_engine(
        effective_async_url,
        echo=settings.DATABASE_ECHO,
        poolclass=NullPool,
        pool_pre_ping=True,
    )
else:
    # Use QueuePool for development with connection pooling
    engine = create_async_engine(
        effective_async_url,
        echo=settings.DATABASE_ECHO,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_pre_ping=True,
    )

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Naming convention for database constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=convention)


class Base(DeclarativeBase):
    """
    Base class for all database models.

    Provides common columns and functionality for all models.
    """

    metadata = metadata

    # Generate __tablename__ automatically from class name
    @declared_attr
    def __tablename__(cls) -> str:
        """Generate table name from class name."""
        # Convert CamelCase to snake_case
        name = cls.__name__
        # Handle acronyms and add underscores before capitals
        result = []
        for i, char in enumerate(name):
            if i > 0 and char.isupper() and name[i - 1].islower():
                result.append("_")
            result.append(char.lower())
        return "".join(result)

    # Common columns for all models
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
        comment="Primary key",
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        comment="Record creation timestamp",
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        comment="Record last update timestamp",
    )

    def __repr__(self) -> str:
        """String representation of model."""
        return f"<{self.__class__.__name__}(id={self.id})>"

    def dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            column.name: getattr(self, column.name) for column in self.__table__.columns
        }


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get async database session.

    Yields:
        AsyncSession: Database session for use in endpoints.
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_db_and_tables() -> None:
    """
    Create all database tables.

    This function should be called on application startup
    in development. In production, use Alembic migrations.
    """
    if settings.is_development:
        logger.info("Creating database tables...")
        async with engine.begin() as conn:
            # Import all models here to ensure they're registered
            from app.models import (  # noqa: F401
                user,
                organization,
                location,
                review,
                platform,
                automation,
                template,
                competitor,
                analytics,
                demo,
            )

            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
    else:
        logger.info("Skipping table creation (not in development mode)")


async def check_database_connection() -> bool:
    """
    Check if database is accessible.

    Returns:
        bool: True if database is accessible, False otherwise.
    """
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


# For Alembic migrations (synchronous)
def get_sync_engine():
    """Get synchronous engine for Alembic migrations."""
    return create_engine(
        settings.database_url_sync,
        echo=settings.DATABASE_ECHO,
    )