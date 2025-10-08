"""
One-time migration script to upgrade all waiting list users to full access.
Run this before launch to grant access to early signups.

Usage:
    python upgrade_waitlist_users.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from datetime import datetime
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.user import User


async def upgrade_waitlist_users():
    """Upgrade all waiting list users to full access."""
    async with AsyncSessionLocal() as session:
        # Count waiting list users
        count_stmt = select(User).where(
            User.access_status.in_(["waiting", "waiting_list"])
        )
        result = await session.execute(count_stmt)
        waiting_users = result.scalars().all()
        
        count = len(waiting_users)
        
        if count == 0:
            print("✅ No waiting list users found. All users already have access!")
            return
        
        print(f"📊 Found {count} waiting list users")
        print("\nUsers to upgrade:")
        for user in waiting_users:
            print(f"  - {user.email} (joined: {user.joined_waiting_list_at or user.created_at})")
        
        # Confirm upgrade
        print(f"\n⚠️  About to upgrade {count} users to full access.")
        response = input("Continue? (yes/no): ").strip().lower()
        
        if response != 'yes':
            print("❌ Upgrade cancelled.")
            return
        
        # Perform upgrade
        now = datetime.utcnow()
        update_stmt = update(User).where(
            User.access_status.in_(["waiting", "waiting_list"])
        ).values(
            access_status="full",
            early_access_granted_at=now
        )
        
        await session.execute(update_stmt)
        await session.commit()
        
        print(f"\n✅ Successfully upgraded {count} users to full access!")
        print("\nNext steps:")
        print("1. Send welcome emails to these users")
        print("2. Update your email list to mark them as active users")
        print("3. Consider sending them onboarding materials")


async def list_all_users_by_access():
    """List all users grouped by access status."""
    async with AsyncSessionLocal() as session:
        stmt = select(User).order_by(User.created_at.desc())
        result = await session.execute(stmt)
        users = result.scalars().all()
        
        # Group by access status
        by_status = {
            "waiting": [],
            "full": [],
            "other": []
        }
        
        for user in users:
            if user.access_status in ["waiting", "waiting_list"]:
                by_status["waiting"].append(user)
            elif user.access_status == "full":
                by_status["full"].append(user)
            else:
                by_status["other"].append(user)
        
        print("\n📊 User Access Status Summary")
        print("=" * 60)
        print(f"Total Users: {len(users)}")
        print(f"  - Waiting List: {len(by_status['waiting'])}")
        print(f"  - Full Access: {len(by_status['full'])}")
        print(f"  - Other: {len(by_status['other'])}")
        print("=" * 60)
        
        if by_status["waiting"]:
            print("\n🕐 Waiting List Users:")
            for user in by_status["waiting"]:
                print(f"  {user.email} - {user.user_kind} - joined {user.joined_waiting_list_at or user.created_at}")
        
        if by_status["full"]:
            print("\n✅ Full Access Users:")
            for user in by_status["full"]:
                print(f"  {user.email} - {user.user_kind}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage user access levels")
    parser.add_argument("--list", action="store_true", help="List all users by access status")
    parser.add_argument("--upgrade", action="store_true", help="Upgrade waiting list users to full access")
    
    args = parser.parse_args()
    
    if args.list:
        asyncio.run(list_all_users_by_access())
    elif args.upgrade:
        asyncio.run(upgrade_waitlist_users())
    else:
        # Default: show list first, then ask if they want to upgrade
        asyncio.run(list_all_users_by_access())
        print("\n" + "=" * 60)
        print("Run with --upgrade to upgrade waiting list users")
        print("=" * 60)
