#!/usr/bin/env python3
"""
Production Calendly Webhook Setup

Run this to create the production webhook pointing to Railway.
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Your Calendly access token
CALENDLY_ACCESS_TOKEN = os.getenv("CALENDLY_ACCESS_TOKEN")

# Production webhook URL
WEBHOOK_URL = "https://revu-backend-production.up.railway.app/webhooks/calendly"

def setup_production_webhook():
    print("🚀 Setting up Production Calendly Webhook")
    print("=" * 50)
    
    # Debug: Check if token is loaded
    if not CALENDLY_ACCESS_TOKEN:
        print("❌ Error: Token not loaded from .env file!")
        print("Make sure your .env file is in the same directory as this script.")
        return
    
    print(f"📋 Using token: {CALENDLY_ACCESS_TOKEN[:20]}...")
    
    # Get current user
    headers = {
        'Authorization': f'Bearer {CALENDLY_ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    print("1. Getting user information...")
    response = requests.get('https://api.calendly.com/users/me', headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error getting user info: {response.status_code}")
        print(response.text)
        return
    
    user_data = response.json()
    user_uri = user_data['resource']['uri']
    print(f"✅ User: {user_data['resource']['name']}")
    
    # Check existing webhooks
    print("\n2. Checking existing webhooks...")
    response = requests.get('https://api.calendly.com/webhook_subscriptions', headers=headers)
    
    if response.status_code == 200:
        existing_webhooks = response.json()['collection']
        print(f"📋 Found {len(existing_webhooks)} existing webhooks")
        
        # Check if webhook already exists for this URL
        for webhook in existing_webhooks:
            if webhook['callback_url'] == WEBHOOK_URL:
                print(f"⚠️  Webhook already exists for {WEBHOOK_URL}")
                print(f"   ID: {webhook['uri']}")
                return
    
    # Create webhook
    print(f"\n3. Creating webhook for {WEBHOOK_URL}...")
    
    # Try organization scope first (more common)
    data = {
        "url": WEBHOOK_URL,
        "events": ["invitee.created", "invitee.canceled"],
        "organization": user_uri.replace('/users/', '/organizations/'),
        "scope": "organization"
    }
    
    print("   Attempting organization scope webhook...")
    response = requests.post('https://api.calendly.com/webhook_subscriptions', 
                           headers=headers, 
                           json=data)
    
    if response.status_code != 201:
        print(f"   Organization scope failed ({response.status_code}), trying user scope...")
        
        # Fallback to user scope
        data = {
            "url": WEBHOOK_URL,
            "events": ["invitee.created", "invitee.canceled"],
            "organization": user_uri.replace('/users/', '/organizations/'),
            "user": user_uri,
            "scope": "user"
        }
        
        response = requests.post('https://api.calendly.com/webhook_subscriptions', 
                               headers=headers, 
                               json=data)
    
    if response.status_code == 201:
        webhook_data = response.json()
        print("✅ Production webhook created successfully!")
        print(f"   Webhook ID: {webhook_data['resource']['uri']}")
        print(f"   URL: {webhook_data['resource']['callback_url']}")
        print(f"   Events: {webhook_data['resource']['events']}")
        print(f"   Status: {webhook_data['resource']['state']}")
        
        print(f"\n🎉 Setup Complete!")
        print(f"Your production webhook is now active.")
        print(f"When users book demos, your Railway backend will be notified automatically.")
        
    else:
        print(f"❌ Error creating webhook: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    setup_production_webhook()
