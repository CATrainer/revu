#!/usr/bin/env python3
"""
Development Calendly Webhook Setup

Use this when testing locally with ngrok.
First run: ngrok http 8000
Then update WEBHOOK_URL below with your ngrok URL.
"""

import requests
import json

# Your Calendly access token
CALENDLY_ACCESS_TOKEN = "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzUzNzkzNDY0LCJqdGkiOiI4YWM2YTQ5OC0xNWIyLTQzNjktOTc5YS00NTgzYTU3NjFmYmQiLCJ1c2VyX3V1aWQiOiJjN2MwOTUwNS01YTZjLTQwMzgtOWU4MS05NmFlMDQwMTg0ZjkifQ.wlIkDMyroxdC6Ojedn4lrB7p3z8bOj3m-RlYGtIswhER7Acqm9Zk84z5hMtT-yqE_sQ0_WT3nZSNtWLM19b12g"

# IMPORTANT: Update this with your ngrok URL when testing locally
WEBHOOK_URL = "https://your-ngrok-url.ngrok.io/webhooks/calendly"

def setup_development_webhook():
    print("🔧 Setting up Development Calendly Webhook")
    print("=" * 50)
    
    if "your-ngrok-url" in WEBHOOK_URL:
        print("❌ Please update WEBHOOK_URL with your actual ngrok URL first!")
        print("   Run: ngrok http 8000")
        print("   Then update WEBHOOK_URL in this script")
        return
    
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
    
    data = {
        "url": WEBHOOK_URL,
        "events": ["invitee.created", "invitee.canceled"],
        "organization": user_uri.replace('/users/', '/organizations/'),
        "scope": "user"
    }
    
    response = requests.post('https://api.calendly.com/webhook_subscriptions', 
                           headers=headers, 
                           json=data)
    
    if response.status_code == 201:
        webhook_data = response.json()
        print("✅ Development webhook created successfully!")
        print(f"   Webhook ID: {webhook_data['resource']['uri']}")
        print(f"   URL: {webhook_data['resource']['callback_url']}")
        print(f"   Events: {webhook_data['resource']['events']}")
        print(f"   Status: {webhook_data['resource']['state']}")
        
        print(f"\n🎉 Setup Complete!")
        print(f"Your development webhook is now active for local testing.")
        
    else:
        print(f"❌ Error creating webhook: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    setup_development_webhook()
