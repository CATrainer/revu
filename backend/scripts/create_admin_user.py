#!/usr/bin/env python3
"""
Script to create a shared admin user for developers.
"""

import asyncio
import os
import sys
from datetime import datetime
from sqlalchemy import select

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import async_session_maker
from app.models.user import User
from app.core.security import get_password_hash


async def create_admin_user():
    """Create the shared admin account for developers."""
    
    # Admin credentials
    admin_email = "admin@revu.dev"
    admin_password = "DevAdmin2025!"
    admin_name = "Developer Admin"
    
    async with async_session_maker() as session:
        try:
            # Check if admin user already exists
            result = await session.execute(
                select(User).where(User.email == admin_email)
            )
            existing_admin = result.scalar_one_or_none()
            
            if existing_admin:
                print(f"Admin user {admin_email} already exists!")
                return
            
            # Create the admin user
            hashed_password = get_password_hash(admin_password)
            
            admin_user = User(
                email=admin_email,
                hashed_password=hashed_password,
                full_name=admin_name,
                is_active=True,
                is_admin=True,
                access_status="full_access",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            session.add(admin_user)
            await session.commit()
            
            print(f"✅ Admin user created successfully!")
            print(f"Email: {admin_email}")
            print(f"Password: {admin_password}")
            print(f"⚠️  Remember to document these credentials in the README!")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error creating admin user: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(create_admin_user())
