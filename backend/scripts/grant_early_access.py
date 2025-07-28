#!/usr/bin/env python3
"""
Script to grant early access to users.
Usage: python scripts/grant_early_access.py user@example.com
"""

import sys
import os
from datetime import datetime, timezone

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_db
from app.models.user import User

def grant_early_access(email: str):
    """Grant early access to a user by email."""
    db = next(get_db())
    
    try:
        # Find the user
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User with email '{email}' not found")
            return False
        
        # Grant early access
        user.access_status = 'early_access'
        user.early_access_granted_at = datetime.now(timezone.utc)
        
        db.commit()
        
        print(f"✅ Successfully granted early access to {email}")
        print(f"   Status: {user.access_status}")
        print(f"   Granted at: {user.early_access_granted_at}")
        print(f"   User can now access the dashboard!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error granting early access: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def list_waiting_users():
    """List all users currently on the waiting list."""
    db = next(get_db())
    
    try:
        waiting_users = db.query(User).filter(User.access_status == 'waiting_list').all()
        
        if not waiting_users:
            print("No users currently on the waiting list.")
            return
        
        print(f"📋 Users on waiting list ({len(waiting_users)}):")
        print("-" * 50)
        
        for user in waiting_users:
            demo_status = "✓ Requested" if user.demo_requested else "✗ Not requested"
            print(f"📧 {user.email}")
            print(f"   Name: {user.full_name}")
            print(f"   Joined: {user.joined_waiting_list_at}")
            print(f"   Demo: {demo_status}")
            print()
            
    except Exception as e:
        print(f"❌ Error listing users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Grant early access: python scripts/grant_early_access.py user@example.com")
        print("  List waiting users: python scripts/grant_early_access.py --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_waiting_users()
    else:
        email = sys.argv[1]
        grant_early_access(email)
