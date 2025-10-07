# Railway Deployment Guide - Demo Simulator Service

**Date:** 2025-01-07  
**Service:** Demo Simulator for Repruv  
**Critical:** This is a separate deployment from the main app

---

## 🚀 **Overview**

The demo simulator runs as a **separate Railway service** from the main Repruv backend. It needs:
- Its own web server
- Its own Celery worker
- Its own Celery beat scheduler
- Shared PostgreSQL database (same as main app)
- Shared Redis (same as main app)

**Total Railway Services Needed:**
1. Main App Web (existing)
2. Main App Celery Worker (existing)
3. Main App Celery Beat (existing)
4. **Demo Simulator Web** (NEW)
5. **Demo Simulator Worker** (NEW)
6. **Demo Simulator Beat** (NEW)

---

## 📋 **Step 1: Create Demo Simulator Web Service**

### **1.1 Create New Service**
```
Railway Dashboard → New → Deploy from GitHub Repo
Select: CATrainer/revu repository
Service Name: demo-simulator-web
```

### **1.2 Set Root Directory**
```
Settings → Service Settings → Root Directory
Set to: demo-simulator
```

### **1.3 Configure Build**
```
Settings → Build → Custom Dockerfile
Dockerfile Path: demo-simulator/Dockerfile
```

### **1.4 Set Start Command**
```
Settings → Deploy → Custom Start Command
python run.py
```

This script automatically runs migrations then starts the server.

### **1.5 Environment Variables**
Add these in Settings → Variables:

```bash
# API Keys
CLAUDE_API_KEY=sk-ant-api03-... # Your Claude API key

# Main App Integration
MAIN_APP_URL=https://your-main-app.railway.app # Main Repruv API URL
MAIN_APP_WEBHOOK_SECRET=generate-random-secret-here

# Database (same as main app)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (same as main app)
REDIS_URL=${{Redis.REDIS_URL}}

# Celery
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}

# Demo Configuration
DEMO_MODE_ENABLED=true
MAX_DEMO_PROFILES_PER_USER=1
MAX_INTERACTIONS_PER_DAY=1000
DEFAULT_COMMENTS_PER_VIDEO=100
DEFAULT_DMS_PER_DAY=20
USE_GENERATION_CACHE=true
MAX_AI_CALLS_PER_HOUR=500

# Application
DEBUG=false
DB_ECHO=false
```

### **1.6 Attach Resources**
```
Settings → Service Connections
→ Connect to PostgreSQL database (same as main app)
→ Connect to Redis (same as main app)
```

---

## 📋 **Step 2: Create Demo Simulator Celery Worker**

### **2.1 Create New Service**
```
Railway Dashboard → New → Deploy from GitHub Repo
Select: CATrainer/revu repository
Service Name: demo-simulator-worker
```

### **2.2 Set Root Directory**
```
Settings → Service Settings → Root Directory
Set to: demo-simulator
```

### **2.3 Set Start Command**
```
Settings → Deploy → Custom Start Command
celery -A app.core.celery_app worker --loglevel=info
```

### **2.4 Environment Variables**
Copy **ALL** environment variables from demo-simulator-web service.

### **2.5 Attach Resources**
Connect to same PostgreSQL and Redis.

---

## 📋 **Step 3: Create Demo Simulator Celery Beat**

### **3.1 Create New Service**
```
Railway Dashboard → New → Deploy from GitHub Repo
Select: CATrainer/revu repository
Service Name: demo-simulator-beat
```

### **3.2 Set Root Directory**
```
Settings → Service Settings → Root Directory
Set to: demo-simulator
```

### **3.3 Set Start Command**
```
Settings → Deploy → Custom Start Command
celery -A app.core.celery_app beat --loglevel=info
```

### **3.4 Environment Variables**
Copy **ALL** environment variables from demo-simulator-web service.

### **3.5 Attach Resources**
Connect to same PostgreSQL and Redis.

---

## 📋 **Step 4: Update Main App Configuration**

### **4.1 Add Environment Variables to Main App**
In your main Repruv backend service, add:

```bash
# Demo Service URLs
DEMO_SERVICE_URL=https://your-demo-simulator-web.railway.app
DEMO_WEBHOOK_SECRET=same-secret-as-demo-service

# Must match what you set in demo-simulator-web
```

### **4.2 Run Database Migration**
On main app service:
```bash
railway run alembic upgrade head
```

This adds the `demo_mode` column to users table.

---

## 📋 **Step 5: Database Tables Auto-Created**

The `run.py` script automatically creates database tables using SQLAlchemy:
1. Runs `Base.metadata.create_all()` on startup
2. Tables are created if they don't exist
3. Safe to run multiple times (idempotent)
4. Then starts the server

**No Alembic migrations needed!** The demo service models are simple and don't require migration history. Tables are created automatically on first deployment.

---

## ✅ **Step 6: Verify Deployment**

### **6.1 Check Service Health**
Visit: `https://your-demo-simulator-web.railway.app/`

Should return:
```json
{
  "service": "Repruv Demo Simulator",
  "version": "1.0.0",
  "status": "operational"
}
```

### **6.2 Check Celery Worker Logs**
```
Railway Dashboard → demo-simulator-worker → Logs
```

Should see:
```
[tasks]
  . app.tasks.content_tasks.upload_content_for_active_profiles
  . app.tasks.interaction_tasks.generate_comments_batch
  . app.tasks.interaction_tasks.generate_dms_batch
  . app.tasks.interaction_tasks.send_queued_interactions
```

### **6.3 Check Celery Beat Logs**
```
Railway Dashboard → demo-simulator-beat → Logs
```

Should see scheduled tasks running.

---

## 🔧 **Troubleshooting**

### **Issue: ImportError in Celery**
**Solution:** Ensure ROOT_DIRECTORY is set to `demo-simulator` for all services.

### **Issue: Database connection failed**
**Solution:** Verify PostgreSQL is attached to all 3 demo services.

### **Issue: Redis connection failed**
**Solution:** 
1. Attach Redis to all services
2. Verify REDIS_URL is set
3. Check if using single-DB Redis (set REDIS_USE_DB_INDEXING=false if needed)

### **Issue: Webhooks not received by main app**
**Solution:**
1. Check MAIN_APP_URL is correct (https://your-main-app.railway.app)
2. Verify MAIN_APP_WEBHOOK_SECRET matches on both services
3. Check main app logs for webhook errors

### **Issue: Claude API errors**
**Solution:**
1. Verify CLAUDE_API_KEY is valid
2. Check you have credits in your Anthropic account
3. Monitor rate limits

---

## 💰 **Cost Estimation**

### **Railway Costs**
- Demo Simulator Web: ~$5/month
- Demo Simulator Worker: ~$5/month  
- Demo Simulator Beat: ~$5/month
- **Total:** ~$15/month for demo infrastructure

### **Claude API Costs**
- Per demo profile: ~$10-15/month
- Depends on activity level and cache hit rate

### **Total Monthly Cost**
- 1 demo profile: ~$25-30/month
- 5 demo profiles: ~$65-90/month

---

## 🔐 **Security Checklist**

- [ ] CLAUDE_API_KEY is kept secret
- [ ] MAIN_APP_WEBHOOK_SECRET is strong (32+ characters)
- [ ] Same secret on both main app and demo service
- [ ] PostgreSQL and Redis have access control
- [ ] HTTPS enabled on all services
- [ ] Debug mode disabled (DEBUG=false)

---

## 📊 **Monitoring**

### **Key Metrics to Watch**
1. **Celery Task Success Rate** - Should be >95%
2. **Webhook Delivery Rate** - Should be 100%
3. **Claude API Call Count** - Track costs
4. **Database Connection Pool** - Monitor for exhaustion
5. **Redis Memory Usage** - Cache can grow

### **Alerts to Set Up**
- Celery worker down
- Beat scheduler stopped
- High Claude API costs (>$50/day)
- Webhook failures
- Database errors

---

## 🚀 **Deployment Checklist**

Before going live:

- [ ] All 3 demo services deployed and running
- [ ] Database tables created
- [ ] Main app has DEMO_SERVICE_URL configured
- [ ] Main app migration run (demo_mode column added)
- [ ] Webhook secret matches on both sides
- [ ] Claude API key configured and has credits
- [ ] Test: Create demo profile via UI
- [ ] Test: See demo content generated
- [ ] Test: Interactions appear in main app
- [ ] Test: Workflows trigger on demo interactions
- [ ] Test: Analytics track demo data

---

## 📝 **Quick Reference**

### **Service URLs**
```
Main App: https://your-main-app.railway.app
Demo Simulator: https://your-demo-simulator-web.railway.app
```

### **Test Demo Profile Creation**
```bash
curl -X POST https://your-demo-simulator-web.railway.app/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "uuid-here",
    "profile_type": "auto",
    "niche": "tech_reviews"
  }'
```

### **Check Demo Status**
```bash
curl https://your-demo-simulator-web.railway.app/profiles/uuid-here
```

---

## ✅ **Success Criteria**

Demo mode is working when:
1. ✅ User can enable demo mode from UI
2. ✅ Demo profile created in simulator
3. ✅ Content generated every 4 hours
4. ✅ Comments generated every 5 minutes
5. ✅ DMs generated every 30 minutes
6. ✅ Interactions sent to main app via webhook
7. ✅ Interactions appear in /interactions view
8. ✅ Workflows trigger on demo interactions
9. ✅ Analytics show demo data
10. ✅ User can disable demo mode

---

**Deployment complete! Demo mode is now production-ready.** 🎉
