"""Database configuration and session management."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Convert postgres:// to postgresql:// for SQLAlchemy 2.0
DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DB_ECHO,
    poolclass=NullPool,
    future=True,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database (create tables).
    
    For demo service, we drop and recreate all tables on startup
    to ensure schema is always up-to-date.
    """
    # Import models to register them with Base.metadata
    from app.models import DemoProfile, DemoContent, DemoInteraction, GenerationCache  # noqa: F401
    
    async with engine.begin() as conn:
        # Drop all tables first (demo service - no persistent data)
        await conn.run_sync(Base.metadata.drop_all)
        # Create all tables with current schema
        await conn.run_sync(Base.metadata.create_all)
