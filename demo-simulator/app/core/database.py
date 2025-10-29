"""Database configuration and session management."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import text

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
    """
    Initialize database tables and run schema migrations.
    
    Creates tables if they don't exist. Does not drop existing tables.
    Applies schema changes for new columns automatically.
    """
    # Import models to register them with Base.metadata
    from app.models import DemoProfile, DemoContent, DemoInteraction, GenerationCache  # noqa: F401
    
    async with engine.begin() as conn:
        # Create all tables if they don't exist (idempotent)
        await conn.run_sync(Base.metadata.create_all)
        
        # Run schema migrations (add missing columns)
        await _apply_schema_migrations(conn)


async def _apply_schema_migrations(conn):
    """
    Apply schema migrations for existing tables.
    
    Since we use create_all() instead of Alembic, we need to manually
    handle column additions for existing tables.
    """
    # Migration 1: Add channel_name to demo_profiles
    check_column = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'demo_profiles' 
        AND column_name = 'channel_name'
    """)
    
    result = await conn.execute(check_column)
    if result.fetchone() is None:
        print("📦 Adding channel_name column to demo_profiles...")
        add_column = text("""
            ALTER TABLE demo_profiles 
            ADD COLUMN channel_name VARCHAR(100)
        """)
        await conn.execute(add_column)
        print("✅ Added channel_name column successfully!")
    
    # Add future migrations here as needed
    # Example:
    # if not await _column_exists(conn, 'table_name', 'new_column'):
    #     await conn.execute(text("ALTER TABLE ..."))
    #     print("✅ Added new_column...")
