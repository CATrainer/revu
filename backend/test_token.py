import requests
import os
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("CALENDLY_ACCESS_TOKEN")
print(f"Token loaded: {token[:50]}...")

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

print("Testing token validity...")
response = requests.get('https://api.calendly.com/users/me', headers=headers)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    user_data = response.json()
    print(f"✅ Token is valid!")
    print(f"User: {user_data['resource']['name']}")
    print(f"Email: {user_data['resource']['email']}")
else:
    print("❌ Token is invalid or expired")
