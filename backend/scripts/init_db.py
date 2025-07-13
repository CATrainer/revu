"""Database initialization script."""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from alembic import command
from alembic.config import Config
from loguru import logger

from app.core.database import engine


async def init_database():
    """Initialize the database with tables and initial data."""
    logger.info("Starting database initialization...")
    
    # Run Alembic migrations
    alembic_cfg = Config("alembic.ini")
    
    try:
        # Generate initial migration if needed
        command.revision(alembic_cfg, autogenerate=True, message="Initial migration")
        logger.info("Generated initial migration")
    except Exception as e:
        logger.warning(f"Could not generate migration (may already exist): {e}")
    
    # Run migrations
    command.upgrade(alembic_cfg, "head")
    logger.info("Database migrations completed")
    
    # Close connections
    await engine.dispose()
    logger.info("Database initialization completed!")


if __name__ == "__main__":
    asyncio.run(init_database())