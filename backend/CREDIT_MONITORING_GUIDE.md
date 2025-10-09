# Credit Monitoring Guide for Developers

## Quick Reference

### 🔥 Most Useful Queries

#### 1. See All Users' Current Balance
```sql
SELECT 
    u.email,
    cb.current_balance,
    cb.current_month_consumed,
    cb.total_consumed
FROM user_credit_balances cb
JOIN users u ON u.id = cb.user_id
ORDER BY cb.current_month_consumed DESC;
```

#### 2. Recent Activity (Last 50 Events)
```sql
SELECT 
    u.email,
    ce.action_type,
    ce.credits_charged,
    ce.description,
    ce.created_at
FROM credit_usage_events ce
JOIN users u ON u.id = ce.user_id
ORDER BY ce.created_at DESC
LIMIT 50;
```

#### 3. Check Specific User
```sql
-- Replace email
SELECT 
    ce.created_at,
    ce.action_type,
    ce.credits_charged,
    ce.description,
    ce.input_tokens,
    ce.output_tokens,
    ce.model_used
FROM credit_usage_events ce
JOIN users u ON u.id = ce.user_id
WHERE u.email = 'user@example.com'
ORDER BY ce.created_at DESC
LIMIT 20;
```

#### 4. Usage by Action Type (Last 30 Days)
```sql
SELECT 
    action_type,
    COUNT(*) as events,
    ROUND(SUM(credits_charged)::numeric, 2) as total_credits,
    ROUND(AVG(credits_charged)::numeric, 4) as avg_per_event
FROM credit_usage_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY action_type
ORDER BY total_credits DESC;
```

#### 5. Top 10 Credit Consumers
```sql
SELECT 
    u.email,
    COUNT(ce.id) as events,
    ROUND(SUM(ce.credits_charged)::numeric, 2) as total_credits
FROM credit_usage_events ce
JOIN users u ON u.id = ce.user_id
WHERE ce.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email
ORDER BY total_credits DESC
LIMIT 10;
```

## Admin API Endpoints (Requires Admin Token)

### 1. Overview Dashboard
```bash
GET /api/v1/admin/credits/overview?days=30
```

**Response:**
```json
{
  "period_days": 30,
  "total_events": 1250,
  "total_credits": 145.32,
  "total_api_cost_dollars": 14.53,
  "active_users": 45,
  "by_action_type": [
    {
      "action_type": "ai_chat_message",
      "event_count": 890,
      "total_credits": 125.60
    }
  ]
}
```

### 2. All Users' Balances
```bash
GET /api/v1/admin/credits/users?limit=50&sort_by=consumed
```

**Response:**
```json
{
  "users": [
    {
      "email": "user@example.com",
      "full_name": "John Doe",
      "current_balance": 85.23,
      "monthly_allowance": 100,
      "current_month_consumed": 14.77,
      "total_consumed": 145.32,
      "next_reset_at": "2025-02-09T16:00:00"
    }
  ],
  "count": 50
}
```

### 3. Specific User Details
```bash
GET /api/v1/admin/credits/user/user@example.com?days=30
```

**Response:**
```json
{
  "user": {
    "email": "user@example.com",
    "full_name": "John Doe",
    "demo_mode": false
  },
  "balance": {
    "current_balance": 85.23,
    "current_month_consumed": 14.77
  },
  "recent_events": [
    {
      "timestamp": "2025-01-09T15:30:00",
      "action_type": "ai_chat_message",
      "credits": 0.142,
      "description": "AI chat message",
      "input_tokens": 1000,
      "output_tokens": 500,
      "model": "claude-3-5-sonnet"
    }
  ],
  "by_action_type": [...]
}
```

### 4. Top Consumers
```bash
GET /api/v1/admin/credits/top-consumers?days=30&limit=20
```

### 5. Daily Trend
```bash
GET /api/v1/admin/credits/daily-trend?days=30
```

**Response:**
```json
{
  "daily_trend": [
    {
      "date": "2025-01-09",
      "events": 45,
      "total_credits": 6.23,
      "unique_users": 12
    }
  ]
}
```

## Using cURL (with Admin Token)

```bash
# Get your admin token first
TOKEN="your_admin_token_here"

# Overview
curl http://localhost:8000/api/v1/admin/credits/overview?days=7 \
  -H "Authorization: Bearer $TOKEN"

# Specific user
curl http://localhost:8000/api/v1/admin/credits/user/user@example.com \
  -H "Authorization: Bearer $TOKEN"

# Top consumers
curl http://localhost:8000/api/v1/admin/credits/top-consumers?limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

## Using Python (for Scripts)

```python
import asyncio
from sqlalchemy import select
from app.core.database import get_async_session
from app.models.credit_usage import CreditUsageEvent, UserCreditBalance
from app.models.user import User

async def check_user_credits(email: str):
    async with get_async_session() as db:
        # Get user
        result = await db.execute(
            select(User).filter(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"User {email} not found")
            return
        
        # Get balance
        result = await db.execute(
            select(UserCreditBalance).filter(
                UserCreditBalance.user_id == user.id
            )
        )
        balance = result.scalar_one_or_none()
        
        print(f"User: {user.email}")
        print(f"Current Balance: {balance.current_balance}")
        print(f"Month Consumed: {balance.current_month_consumed}")
        print(f"Total Consumed: {balance.total_consumed}")
        
        # Get recent events
        result = await db.execute(
            select(CreditUsageEvent).filter(
                CreditUsageEvent.user_id == user.id
            ).order_by(CreditUsageEvent.created_at.desc()).limit(10)
        )
        events = result.scalars().all()
        
        print("\nRecent Events:")
        for event in events:
            print(f"  {event.created_at}: {event.action_type.value} - {event.credits_charged} credits")

# Run it
asyncio.run(check_user_credits("user@example.com"))
```

## Database Client (TablePlus, pgAdmin, etc.)

Just connect to your database and use the SQL queries above.

**Connection String:**
```
postgresql://user:pass@host:port/database
```

## Monitoring Dashboard Queries

### Health Check
```sql
-- Ensure events are being tracked
SELECT 
    COUNT(*) as events_last_hour,
    COUNT(DISTINCT user_id) as users_last_hour
FROM credit_usage_events
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Cost Validation
```sql
-- Compare our charges to actual API costs
SELECT 
    action_type,
    SUM(credits_charged) as total_credits_charged,
    SUM(api_cost) * 10 as expected_credits_from_api,
    SUM(credits_charged) - (SUM(api_cost) * 10) as difference
FROM credit_usage_events
WHERE created_at > NOW() - INTERVAL '30 days'
    AND api_cost > 0
GROUP BY action_type;
```

### Unusual Activity
```sql
-- Find unusually expensive operations
SELECT 
    u.email,
    ce.action_type,
    ce.credits_charged,
    ce.description,
    ce.created_at
FROM credit_usage_events ce
JOIN users u ON u.id = ce.user_id
WHERE ce.credits_charged > 1.0  -- More than 1 credit
ORDER BY ce.credits_charged DESC
LIMIT 20;
```

### Demo Mode Verification
```sql
-- Should return ZERO rows (demo users shouldn't be tracked)
SELECT COUNT(*) 
FROM credit_usage_events ce
JOIN users u ON u.id = ce.user_id
WHERE u.demo_mode = true;
```

## Excel/Google Sheets Export

```sql
-- Export for spreadsheet analysis
COPY (
    SELECT 
        u.email,
        cb.current_balance,
        cb.current_month_consumed,
        cb.total_consumed,
        cb.next_reset_at
    FROM user_credit_balances cb
    JOIN users u ON u.id = cb.user_id
    ORDER BY cb.current_month_consumed DESC
) TO '/tmp/credit_balances.csv' WITH CSV HEADER;
```

## Quick Debugging

### Check if tracking is working
```sql
-- Should see recent events (within last few minutes if app is active)
SELECT MAX(created_at) as last_event FROM credit_usage_events;
```

### Check if balances are initialized
```sql
-- Should match number of users (minus demo users)
SELECT 
    (SELECT COUNT(*) FROM users WHERE demo_mode = false) as total_users,
    (SELECT COUNT(*) FROM user_credit_balances) as users_with_balance;
```

### Find users without balances
```sql
SELECT u.email
FROM users u
LEFT JOIN user_credit_balances cb ON cb.user_id = u.id
WHERE cb.id IS NULL
    AND u.demo_mode = false;
```

## Setting Up Admin Access

Make yourself an admin:
```sql
UPDATE users 
SET is_admin = true 
WHERE email = 'your@email.com';
```

Then use your regular auth token to access admin endpoints.

## Quick Stats Command

Save this as `check_credits.sql`:
```sql
-- Quick Stats
SELECT 'Total Events' as metric, COUNT(*)::text as value FROM credit_usage_events
UNION ALL
SELECT 'Total Credits Consumed', ROUND(SUM(credits_charged)::numeric, 2)::text FROM credit_usage_events
UNION ALL
SELECT 'Active Users', COUNT(DISTINCT user_id)::text FROM credit_usage_events WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'Users with Balance', COUNT(*)::text FROM user_credit_balances;
```

Run with:
```bash
psql $DATABASE_URL < check_credits.sql
```
