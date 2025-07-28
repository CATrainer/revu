#!/usr/bin/env python3
"""
Script to verify admin user exists and has correct permissions.
"""

import asyncio
import os
import sys
from sqlalchemy import select

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import async_session_maker
from app.models.user import User


async def verify_admin_user():
    """Verify the admin user exists and has correct admin permissions."""
    
    admin_email = "admin@revu.dev"
    
    async with async_session_maker() as session:
        try:
            # Find the admin user
            result = await session.execute(
                select(User).where(User.email == admin_email)
            )
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                print(f"❌ Admin user {admin_email} not found!")
                print("Run the create_admin_user.py script first.")
                return
            
            print(f"✅ Admin user found:")
            print(f"   Email: {admin_user.email}")
            print(f"   Name: {admin_user.full_name}")
            print(f"   Is Active: {admin_user.is_active}")
            print(f"   Is Admin: {admin_user.is_admin}")
            print(f"   Access Status: {admin_user.access_status}")
            print(f"   Created At: {admin_user.created_at}")
            
            if admin_user.is_admin:
                print("✅ Admin permissions are correctly set!")
            else:
                print("❌ Admin user does NOT have admin permissions!")
                print("Need to update the user to set is_admin=True")
                
        except Exception as e:
            print(f"❌ Error checking admin user: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(verify_admin_user())
