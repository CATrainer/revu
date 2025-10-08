# Demo Mode Setup Guide

## Overview
Demo Mode allows users to test Repruv with AI-generated realistic interactions without connecting real social media accounts.

## Architecture
```
┌─────────────┐         ┌─────────────┐         ┌──────────────────┐
│   Frontend  │ ────────▶│   Backend   │ ────────▶│ Demo Simulator   │
│   (Vercel)  │         │  (Railway)  │         │    (Railway)     │
└─────────────┘         └─────────────┘         └──────────────────┘
                               │                         │
                               │◀────── Webhooks ────────┘
                               │
                        ┌──────▼──────┐
                        │  PostgreSQL │
                        └─────────────┘
```

---

## Prerequisites

### 1. Demo-Simulator Service (Railway)
- **Service Name**: `demo-simulator`
- **Start Command**: `celery -A app.core.celery_app worker --beat --loglevel=info`
- **Environment Variables**:
  ```env
  DATABASE_URL=postgresql+asyncpg://...  # Separate demo DB or same as main
  REDIS_URL=redis://...
  
  # OpenAI for content generation
  OPENAI_API_KEY=sk-...
  
  # Webhook to main backend
  MAIN_APP_URL=https://your-backend.railway.app/api/v1
  MAIN_APP_WEBHOOK_SECRET=<generate-random-secret>
  ```

### 2. Backend Service (Railway)
- **Environment Variables to Add**:
  ```env
  # Demo Simulator Connection
  DEMO_SERVICE_URL=https://demo-simulator.railway.app
  DEMO_WEBHOOK_SECRET=<same-as-MAIN_APP_WEBHOOK_SECRET>
  ```

### 3. Deploy Both Services
```bash
# From repo root
git add -A
git commit -m "Add demo mode with visual indicators"
git push

# Railway will auto-deploy both services
```

---

## How It Works

### 1. User Enables Demo Mode
```
User visits /settings/demo-mode
    ↓
Selects niche (e.g., "Tech Reviews")
    ↓
Chooses profile size (Small/Medium/Large Creator)
    ↓
Clicks "Enable Demo Mode"
```

### 2. Profile Creation
```
Frontend → POST /api/v1/demo/enable
    ↓
Backend → POST {DEMO_SERVICE_URL}/profiles
    ↓
Demo Simulator creates DemoProfile
    ↓
Generates initial content (3 videos)
    ↓
Schedules comment & DM generation
```

### 3. Interaction Flow
```
Celery Beat (every 5 min) → generate_comments_batch
    ↓
Creates comments for recent content
    ↓
Schedules them with realistic delays (10s-5min)
    ↓
send_queued_interactions (every 1 min)
    ↓
Sends webhooks to main backend
    ↓
Backend creates Interaction & Fan records
    ↓
User sees interactions in /interactions feed
```

---

## Celery Tasks Schedule

| Task | Interval | Purpose |
|------|----------|---------|
| `upload_content_for_active_profiles` | 24h | Create new videos/posts |
| `generate_comments_batch` | 5min | Generate comments for recent content |
| `generate_dms_batch` | 30min | Generate direct messages |
| `send_queued_interactions` | 1min | Send pending interactions to main app |
| `cleanup_old_demo_data` | 24h | Remove data older than 30 days |

---

## Troubleshooting

### No Interactions Appearing

**Symptoms**: Celery logs show "No content needing comments"

**Causes**:
1. User hasn't enabled demo mode yet
2. DEMO_SERVICE_URL not set in backend
3. Demo-simulator database was reset but user still has `demo_mode=true`

**Solutions**:
```bash
# Check backend env vars
railway variables --service backend | grep DEMO

# Check demo-simulator is running
railway logs --service demo-simulator

# Verify user's demo_mode status
psql $DATABASE_URL -c "SELECT email, demo_mode FROM users WHERE email='user@example.com';"

# Check if DemoProfile exists
psql $DEMO_DATABASE_URL -c "SELECT * FROM demo_profiles WHERE is_active=true;"
```

### Webhooks Not Received

**Symptoms**: Demo-simulator sends webhooks but backend doesn't create interactions

**Check**:
1. DEMO_WEBHOOK_SECRET matches in both services
2. MAIN_APP_URL points to correct backend URL
3. Backend has `/api/v1/webhooks/demo/interaction` endpoint

**Debug**:
```bash
# Demo-simulator logs
railway logs --service demo-simulator | grep "Webhook"

# Backend logs
railway logs --service backend | grep "demo webhook"
```

### Database Type Errors

**If you see**: `operator does not exist: character varying = boolean`

**Fix**: Tables need to be recreated with correct schema
```bash
# Demo-simulator drops/recreates tables on startup
railway restart --service demo-simulator
```

---

## Visual Indicators

### Dashboard Banner (When Active)
```
╔═══════════════════════════════════════════════════════╗
║ ● Demo Mode Active                                    ║
║   Using simulated data from tech reviews.             ║
║   Interactions will arrive shortly.        [Manage]   ║
╚═══════════════════════════════════════════════════════╝
```

### Onboarding CTA (When No Interactions)
```
╔═══════════════════════════════════════════════════════╗
║ ✨ No interactions yet?                                ║
║   Try Demo Mode to see how Repruv works              ║
║                               [Enable Demo Mode]      ║
╚═══════════════════════════════════════════════════════╝
```

---

## Cost Estimation

**Per Active Demo Profile**:
- OpenAI API (GPT-4): ~$8-12/month
  - Content generation: ~50 titles/month
  - Comment generation: ~1000 comments/month
  - DM generation: ~500 DMs/month
- Railway Hosting: ~$5/month (demo-simulator service)

**Total**: ~$10-15/month per demo profile

---

## API Endpoints

### Backend
- `POST /api/v1/demo/enable` - Enable demo mode
- `POST /api/v1/demo/disable` - Disable demo mode
- `GET /api/v1/demo/status` - Get current status
- `POST /api/v1/webhooks/demo/interaction` - Receive demo webhooks

### Demo Simulator
- `POST /profiles` - Create demo profile
- `GET /profiles/{user_id}` - Get profile info
- `DELETE /profiles/{user_id}` - Deactivate profile

---

## Next Steps

1. **Set Environment Variables** in Railway for both services
2. **Deploy** the changes (git push)
3. **Visit** `/settings/demo-mode` in your app
4. **Enable Demo Mode** and wait 1-2 minutes
5. **Check** `/interactions` for incoming demo interactions

## Support

If issues persist:
1. Check Railway logs for both services
2. Verify all env vars are set
3. Ensure PostgreSQL and Redis are attached
4. Restart both services in Railway
