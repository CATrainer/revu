"""Diagnose Supabase connection issues."""

import os
import subprocess
import platform
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def run_command(cmd):
    """Run a command and return output."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        else:
            result = subprocess.run(cmd.split(), capture_output=True, text=True)
        return result.stdout, result.stderr
    except Exception as e:
        return None, str(e)

def diagnose_connection():
    """Diagnose connection issues."""
    
    print("🔍 Diagnosing Supabase Connection\n")
    
    # Get the Supabase project reference
    supabase_url = os.getenv('SUPABASE_URL', '')
    project_ref = supabase_url.split('//')[1].split('.')[0] if '//' in supabase_url else 'unknown'
    
    print(f"Project Reference: {project_ref}\n")
    
    # Test 1: Ping test
    print("1️⃣ Testing basic connectivity:")
    hosts = [
        f"{project_ref}.supabase.co",
        f"db.{project_ref}.supabase.co",
        "supabase.co",
        "8.8.8.8",  # Google DNS to test general internet
    ]
    
    for host in hosts:
        print(f"\n   Pinging {host}:")
        stdout, stderr = run_command(f"ping -n 1 {host}" if platform.system() == "Windows" else f"ping -c 1 {host}")
        if stdout and "Reply from" in stdout or "bytes from" in stdout:
            print(f"   ✅ Reachable")
        else:
            print(f"   ❌ Not reachable")
            if stderr:
                print(f"      Error: {stderr.strip()}")
    
    # Test 2: DNS lookup
    print("\n2️⃣ Testing DNS resolution:")
    
    # Using nslookup
    for host in [f"db.{project_ref}.supabase.co", f"{project_ref}.supabase.co"]:
        print(f"\n   nslookup {host}:")
        stdout, stderr = run_command(f"nslookup {host}")
        if stdout:
            lines = stdout.split('\n')
            for line in lines:
                if "Address" in line and "#" not in line:  # Skip the DNS server address
                    print(f"   ✅ Resolved: {line.strip()}")
        else:
            print(f"   ❌ Failed to resolve")
    
    # Test 3: Port connectivity
    print("\n3️⃣ Testing port connectivity:")
    
    # Try Python socket connection
    import socket
    
    test_connections = [
        (f"db.{project_ref}.supabase.co", 5432, "PostgreSQL Direct"),
        (f"db.{project_ref}.supabase.co", 6543, "PostgreSQL Pooler"),
        ("aws-0-us-west-1.pooler.supabase.com", 6543, "Pooler Service"),
        (f"{project_ref}.supabase.co", 443, "HTTPS API"),
    ]
    
    for host, port, desc in test_connections:
        print(f"\n   Testing {desc} ({host}:{port}):")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        try:
            # Try to resolve first
            ip = socket.gethostbyname(host)
            print(f"   Resolved to: {ip}")
            
            # Try to connect
            result = sock.connect_ex((ip, port))
            if result == 0:
                print(f"   ✅ Port {port} is open")
            else:
                print(f"   ❌ Port {port} is closed or filtered")
        except socket.gaierror:
            print(f"   ❌ Cannot resolve hostname")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        finally:
            sock.close()
    
    # Test 4: Check Windows hosts file
    print("\n4️⃣ Checking hosts file:")
    hosts_path = r"C:\Windows\System32\drivers\etc\hosts"
    try:
        with open(hosts_path, 'r') as f:
            content = f.read()
            if "supabase" in content.lower():
                print("   ⚠️  Found Supabase entries in hosts file - this might cause issues")
            else:
                print("   ✅ No Supabase entries in hosts file")
    except:
        print("   ⚠️  Could not read hosts file")
    
    # Test 5: Get current DNS servers
    print("\n5️⃣ Current DNS configuration:")
    stdout, stderr = run_command("ipconfig /all" if platform.system() == "Windows" else "cat /etc/resolv.conf")
    if stdout:
        for line in stdout.split('\n'):
            if "DNS Server" in line or "nameserver" in line:
                print(f"   {line.strip()}")
    
    # Recommendations
    print("\n💡 Recommendations based on common issues:\n")
    
    print("If DNS resolution is failing:")
    print("1. Try changing your DNS servers to Google (8.8.8.8) or Cloudflare (1.1.1.1)")
    print("   - Windows: Network Settings → Change adapter options → Properties → IPv4 → DNS")
    print("\n2. Flush DNS cache:")
    print("   - Run as admin: ipconfig /flushdns")
    print("\n3. Check if you're behind a corporate firewall/proxy:")
    print("   - Some companies block port 5432")
    print("   - Try using mobile hotspot to test")
    print("\n4. Try the direct IP (temporary fix):")
    print("   - Replace hostname with IP in DATABASE_URL")
    print("   - Note: This is not recommended for production")


if __name__ == "__main__":
    diagnose_connection()