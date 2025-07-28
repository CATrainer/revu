#!/usr/bin/env python
"""
Database health check script for debugging Railway issues.
"""

import asyncio
import os
from sqlalchemy import text
from app.core.database import get_async_session
from app.models.user import User
from loguru import logger

async def check_database_health():
    """Check if database is accessible and schema is correct."""
    try:
        # Test basic connectivity
        async for session in get_async_session():
            # Test basic query
            result = await session.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
            
            # Test if users table exists
            result = await session.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
            )
            columns = [row[0] for row in result.fetchall()]
            logger.info(f"✅ Users table columns: {columns}")
            
            # Check if new columns exist
            required_columns = [
                'access_status', 'joined_waiting_list_at', 
                'early_access_granted_at', 'demo_requested', 'demo_requested_at'
            ]
            
            missing_columns = [col for col in required_columns if col not in columns]
            if missing_columns:
                logger.error(f"❌ Missing columns: {missing_columns}")
                logger.info("Migration may not have completed successfully")
            else:
                logger.info("✅ All required columns present")
            
            # Test creating a user object (this will fail if schema is wrong)
            try:
                # Don't actually insert, just test if the model works
                test_user = User(
                    email="test@example.com",
                    full_name="Test User",
                    access_status="waiting_list"
                )
                logger.info("✅ User model instantiation successful")
            except Exception as e:
                logger.error(f"❌ User model issue: {e}")
            
            break
            
    except Exception as e:
        logger.error(f"❌ Database health check failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    asyncio.run(check_database_health())
