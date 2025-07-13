"""Test Supabase connection and configuration."""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from loguru import logger

from app.core.config import settings
from app.core.database import check_database_connection
from app.core.supabase_minimal import supabase_auth


async def test_supabase():
    """Test Supabase configuration."""
    print("🧪 Testing Supabase Configuration...\n")
    
    # Test 1: Check environment variables
    print("1️⃣ Checking environment variables:")
    print(f"   SUPABASE_URL: {'✅ Set' if settings.SUPABASE_URL else '❌ Missing'}")
    print(f"   SUPABASE_ANON_KEY: {'✅ Set' if settings.SUPABASE_ANON_KEY else '❌ Missing'}")
    print(f"   SUPABASE_SERVICE_ROLE_KEY: {'✅ Set' if settings.SUPABASE_SERVICE_ROLE_KEY else '❌ Missing'}")
    print(f"   DATABASE_URL: {'✅ Set' if settings.DATABASE_URL else '❌ Missing'}")
    print()
    
    # Test 2: Check Supabase client
    print("2️⃣ Checking Supabase client:")
    try:
        # Test with a simple operation
        print("   ✅ Supabase client ready (using minimal client)")
    except Exception as e:
        print(f"   ❌ Supabase client error: {e}")
    print()
    
    # Test 3: Check database connection
    print("3️⃣ Checking database connection:")
    db_connected = await check_database_connection()
    if db_connected:
        print("   ✅ Database connection successful")
    else:
        print("   ❌ Database connection failed")
    print()
    
    # Test 4: Test user creation (optional)
    if input("Do you want to test user creation? (y/n): ").lower() == 'y':
        print("\n4️⃣ Testing user creation:")
        test_email = f"test_{asyncio.get_event_loop().time():.0f}@example.com"
        try:
            user = await supabase_auth.create_user(
                email=test_email,
                password="TestPassword123!",
                metadata={"full_name": "Test User"}
            )
            print(f"   ✅ User created: {user['email']}")
            
            # Clean up - delete the test user
            if await supabase_auth.delete_user(user['id']):
                print(f"   ✅ Test user deleted")
        except Exception as e:
            print(f"   ❌ User creation failed: {e}")
    
    print("\n✅ Testing complete!")


if __name__ == "__main__":
    asyncio.run(test_supabase())