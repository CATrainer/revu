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
from sqlalchemy.orm import DeclarativeBase, declared_attr, sessionmaker, Session
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
        }


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI routes to get an async database session.

    Yields:
        AsyncSession: An async database session.
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


def get_async_session_context():
    """
    Context manager for Celery tasks to get an async database session.
    
    Usage:
        async with get_async_session_context() as db:
            # Use db session
    """
    return async_session_maker()


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
                platform,
                automation,
                template,
                analytics,
                audit,
                ai_training,
                youtube,
                workflow,
                application,
            )

            # Configure the registry to resolve any relationship mapping issues
            from sqlalchemy.orm import configure_mappers
            configure_mappers()

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


# Synchronous database session for Celery tasks and scripts
# Create sync engine for Celery tasks
sync_database_url = settings.DATABASE_URL
if sync_database_url.startswith("postgresql+asyncpg://"):
    sync_database_url = sync_database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
elif not sync_database_url.startswith("postgresql://"):
    # Ensure it's a proper postgres URL
    if sync_database_url.startswith("postgres://"):
        sync_database_url = sync_database_url.replace("postgres://", "postgresql://", 1)

sync_engine = create_engine(
    sync_database_url,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,
)

# Create sync session factory
sync_session_maker = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def get_db():
    """
    Synchronous database session generator for scripts.

    Usage:
        db = next(get_db())
        try:
            # Use db
        finally:
            db.close()
    """
    session = sync_session_maker()
    try:
        yield session
    finally:
        session.close()


def get_db_context():
    """
    Synchronous database session context manager for Celery tasks.

    Usage:
        with get_db_context() as db:
            # Use db
    """
    return sync_session_maker()