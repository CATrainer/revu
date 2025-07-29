import requests
import os
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("CALENDLY_ACCESS_TOKEN")
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Get user info
print("Getting user information...")
response = requests.get('https://api.calendly.com/users/me', headers=headers)
user_data = response.json()
user_uri = user_data['resource']['uri']
current_org = user_data['resource']['current_organization']

print(f"User URI: {user_uri}")
print(f"Current Organization: {current_org}")

# Get organization info
print("\nGetting organization information...")
response = requests.get(current_org, headers=headers)
if response.status_code == 200:
    org_data = response.json()
    print(f"Organization URI: {org_data['resource']['uri']}")
    print(f"Organization Name: {org_data['resource']['name']}")
else:
    print(f"Failed to get org info: {response.status_code}")
    print(response.text)

# Check existing webhooks
print("\nChecking existing webhooks...")
webhook_params = {
    "organization": current_org,
    "scope": "organization"
}
response = requests.get('https://api.calendly.com/webhook_subscriptions', 
                       headers=headers, 
                       params=webhook_params)
print(f"Webhook list status: {response.status_code}")
if response.status_code == 200:
    webhooks = response.json()['collection']
    print(f"Found {len(webhooks)} existing webhooks")
    for webhook in webhooks:
        print(f"  - {webhook['callback_url']} ({webhook['scope']})")
else:
    print(f"Response: {response.text}")
