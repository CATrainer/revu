# Railway Deployment Guide for Demo Simulator

## 🔴 CRITICAL: You Need 3 Services

The demo simulator requires **3 separate Railway services** to function properly:

### 1. Demo Simulator Web (FastAPI)
**Start Command:** `python run.py`

**Environment Variables:**
```
CLAUDE_API_KEY=your-key
MAIN_APP_URL=https://revu-backend-production.up.railway.app
MAIN_APP_WEBHOOK_SECRET=your-secret
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### 2. Demo Simulator Worker (Celery Worker) ⚠️ MISSING
**Start Command:** `celery -A app.core.celery_app worker --loglevel=info --concurrency=2`

**Environment Variables:** (same as Web service)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CLAUDE_API_KEY=your-key
MAIN_APP_URL=https://revu-backend-production.up.railway.app
```

**What it does:**
- Generates comments for content
- Generates DMs
- Sends interactions to main app via webhooks

### 3. Demo Simulator Beat (Celery Beat Scheduler) ⚠️ MISSING
**Start Command:** `celery -A app.core.celery_app beat --loglevel=info`

**Environment Variables:** (same as Web service)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**What it does:**
- Schedules periodic tasks:
  - Generate comments every 5 minutes
  - Generate DMs every 30 minutes
  - Send interactions every 1 minute

---

## 🚀 Quick Setup in Railway

### Option A: Create Multiple Services (Recommended)

1. **Keep existing service as "Web"**
   - Make sure it's running `python run.py`

2. **Create new service "Demo Worker"**
   - Same repo, same branch
   - Set start command: `celery -A app.core.celery_app worker --loglevel=info --concurrency=2`
   - Copy all environment variables from Web service
   - **MUST** connect to same Redis and Database

3. **Create new service "Demo Beat"**
   - Same repo, same branch
   - Set start command: `celery -A app.core.celery_app beat --loglevel=info`
   - Copy all environment variables from Web service
   - **MUST** connect to same Redis and Database

### Option B: Use Procfile (If Railway Supports)

If your Railway plan supports Procfile, the included `Procfile` will automatically start all 3 processes:
```
web: python run.py
worker: celery -A app.core.celery_app worker --loglevel=info --concurrency=2
beat: celery -A app.core.celery_app beat --loglevel=info
```

---

## 🔍 Verify It's Working

After deploying all 3 services:

### Check Worker Logs:
```
[INFO/MainProcess] Connected to redis://...
[INFO/MainProcess] celery@... ready
[INFO/MainProcess] Task app.tasks.interaction_tasks.generate_comments_batch received
```

### Check Beat Logs:
```
[INFO/Beat] beat: Starting...
[INFO/Beat] Scheduler: Sending due task generate-comments
[INFO/Beat] Scheduler: Sending due task send-interactions
```

### Check Web Logs (after 1-5 minutes):
```
INFO: HTTP Request: POST https://revu-backend-production.up.railway.app/api/v1/webhooks/demo
```

---

## 📊 Current Status

✅ **Web service** - Running  
❌ **Worker service** - NOT deployed (this is why no interactions are generated)  
❌ **Beat service** - NOT deployed (this is why tasks aren't scheduled)

---

## ⚠️ Why Interactions Aren't Appearing

**Problem:** Only the web service is running. The worker and beat processes that generate and send interactions are not deployed.

**Solution:** Deploy the worker and beat services as separate Railway services (or use Procfile if supported).

---

## 🎯 Expected Behavior After Fix

1. User enables demo mode → Profile created
2. **Beat** schedules tasks every 1-5 minutes
3. **Worker** generates interactions (comments/DMs)
4. **Worker** sends webhooks to main app
5. **Main app** creates interaction records
6. **User sees interactions in UI**

Currently, steps 2-4 aren't happening because worker/beat aren't deployed!
