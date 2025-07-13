"""Test Supabase connection directly."""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

def test_supabase_connection():
    """Test Supabase connection without async complications."""
    
    print("🔍 Testing Supabase Connection Options\n")
    
    # Get environment variables directly
    supabase_url = os.getenv('SUPABASE_URL', 'Not set')
    database_url = os.getenv('DATABASE_URL', 'Not set')
    
    print(f"SUPABASE_URL: {supabase_url}")
    print(f"DATABASE_URL: {database_url[:50]}...\n")
    
    # Test 1: Simple requests to Supabase
    print("1️⃣ Testing HTTP connection to Supabase:")
    try:
        import requests
        response = requests.get(f"{supabase_url}/rest/v1/", timeout=5)
        print(f"   ✅ Connected! Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    # Test 2: Parse and check database URL
    print("\n2️⃣ Parsing database URL:")
    try:
        from urllib.parse import urlparse
        parsed = urlparse(database_url.replace('postgresql+asyncpg://', 'postgresql://'))
        
        print(f"   Host: {parsed.hostname}")
        print(f"   Port: {parsed.port or 5432}")
        print(f"   Database: {parsed.path.lstrip('/')}")
        print(f"   Username: {parsed.username}")
        
        # Test DNS resolution
        import socket
        try:
            ip = socket.gethostbyname(parsed.hostname)
            print(f"   ✅ DNS resolved to: {ip}")
        except Exception as e:
            print(f"   ❌ DNS resolution failed: {e}")
            
    except Exception as e:
        print(f"   ❌ URL parsing failed: {e}")
    
    # Test 3: Alternative connection methods
    print("\n3️⃣ Alternative connection strings to try:")
    
    project_ref = "vbbtlcwxapbtmqdkexcq"
    password = "[YOUR_PASSWORD]"  # Replace with your actual password
    
    print("\n   Option A - Direct connection:")
    print(f"   postgresql://postgres:{password}@db.{project_ref}.supabase.co:5432/postgres")
    
    print("\n   Option B - Pooler connection (Transaction mode):")
    print(f"   postgresql://postgres.{project_ref}:{password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres")
    
    print("\n   Option C - Pooler connection (Session mode):")
    print(f"   postgresql://postgres.{project_ref}:{password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres")
    
    print("\n4️⃣ Quick fixes to try:")
    print("   1. Go to: https://app.supabase.com/project/vbbtlcwxapbtmqdkexcq/settings/database")
    print("   2. Copy the 'Connection pooler' string (not the direct connection)")
    print("   3. Add '+asyncpg' after 'postgresql' in the URL")
    print("   4. Update your .env file with this new URL")
    
    # Test 4: Check if we can import psycopg2 as alternative
    print("\n5️⃣ Testing alternative database drivers:")
    try:
        import asyncpg
        print("   ✅ asyncpg is installed")
    except:
        print("   ❌ asyncpg not found")
    
    try:
        import psycopg2
        print("   ✅ psycopg2 is installed")
    except:
        print("   ❌ psycopg2 not found")


if __name__ == "__main__":
    test_supabase_connection()