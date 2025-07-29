#!/usr/bin/env python3
"""
Calendly Webhook Setup Script

This script helps you create a webhook subscription with Calendly.
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

CALENDLY_ACCESS_TOKEN = os.getenv('CALENDLY_ACCESS_TOKEN')

def get_current_user():
    """Get current user information from Calendly API"""
    headers = {
        'Authorization': f'Bearer {CALENDLY_ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get('https://api.calendly.com/users/me', headers=headers)
    
    if response.status_code == 200:
        user_data = response.json()
        print("✅ Successfully authenticated with Calendly!")
        print(f"User: {user_data['resource']['name']}")
        print(f"Email: {user_data['resource']['email']}")
        print(f"User URI: {user_data['resource']['uri']}")
        return user_data['resource']
    else:
        print(f"❌ Error getting user info: {response.status_code}")
        print(response.text)
        return None

def create_webhook_subscription(user_uri, webhook_url):
    """Create a webhook subscription"""
    headers = {
        'Authorization': f'Bearer {CALENDLY_ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    data = {
        "url": webhook_url,
        "events": ["invitee.created", "invitee.canceled"],
        "organization": user_uri.replace('/users/', '/organizations/'),  # Convert user URI to org URI
        "scope": "user"  # Change to "organization" if you want org-wide webhooks
    }
    
    response = requests.post('https://api.calendly.com/webhook_subscriptions', 
                           headers=headers, 
                           json=data)
    
    if response.status_code == 201:
        webhook_data = response.json()
        print("✅ Webhook subscription created successfully!")
        print(f"Webhook ID: {webhook_data['resource']['uri']}")
        print(f"URL: {webhook_data['resource']['callback_url']}")
        print(f"Events: {webhook_data['resource']['events']}")
        return webhook_data['resource']
    else:
        print(f"❌ Error creating webhook: {response.status_code}")
        print(response.text)
        return None

def list_webhook_subscriptions():
    """List existing webhook subscriptions"""
    headers = {
        'Authorization': f'Bearer {CALENDLY_ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get('https://api.calendly.com/webhook_subscriptions', headers=headers)
    
    if response.status_code == 200:
        webhooks = response.json()
        print(f"📋 Found {len(webhooks['collection'])} webhook subscriptions:")
        for webhook in webhooks['collection']:
            print(f"  - ID: {webhook['uri']}")
            print(f"    URL: {webhook['callback_url']}")
            print(f"    Events: {webhook['events']}")
            print(f"    Status: {webhook['state']}")
            print()
        return webhooks['collection']
    else:
        print(f"❌ Error listing webhooks: {response.status_code}")
        print(response.text)
        return []

if __name__ == "__main__":
    if not CALENDLY_ACCESS_TOKEN:
        print("❌ Please set CALENDLY_ACCESS_TOKEN in your .env file")
        exit(1)
    
    print("🚀 Calendly Webhook Setup")
    print("=" * 40)
    
    # Get current user
    user = get_current_user()
    if not user:
        exit(1)
    
    print("\n📋 Current webhook subscriptions:")
    print("-" * 40)
    existing_webhooks = list_webhook_subscriptions()
    
    # Ask if user wants to create a new webhook
    webhook_url = input(f"\n🔗 Enter your webhook URL (e.g., https://yourdomain.com/webhooks/calendly): ")
    
    if webhook_url.strip():
        print(f"\n🔨 Creating webhook subscription...")
        webhook = create_webhook_subscription(user['uri'], webhook_url.strip())
        
        if webhook:
            print(f"\n🎉 Setup complete!")
            print(f"Your webhook will receive events at: {webhook_url}")
            print(f"Events subscribed to: invitee.created, invitee.canceled")
    else:
        print("No webhook URL provided. Exiting.")
