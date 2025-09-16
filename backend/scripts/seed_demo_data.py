"""Seed database with demo data."""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.core.security import get_password_hash
from app.models.user import User

async def seed_demo_data():
    """Seed the database with demo data for social media focus."""
    async with async_session_maker() as db:
        try:
            logger.info("Starting database seeding for social media focus...")
            
            # Create demo user for social media
            user = User(
                email="demo@revu.app",
                full_name="Demo Social Media User",
                hashed_password=get_password_hash("demo123"),
                is_active=True,
                access_status="demo_access",
                demo_access_type="creator"
            )
            db.add(user)
            await db.flush()
            
            await db.commit()
            logger.info("Database seeding completed successfully!")
            
            # Print access credentials
            print("\n" + "="*50)
            print("Demo Account Created:")
            print(f"Email: demo@revu.app")
            print(f"Password: demo123")
            print("Focus: Social Media Management")
            print("="*50 + "\n")
            
        except Exception as e:
            logger.error(f"Error seeding database: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_demo_data())