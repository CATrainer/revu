# Deployment Issues & Fixes Needed

**Date:** 2025-10-01  
**Status:** Action Required

---

## 🔴 Critical Issues

### 1. Railway Database Migrations Not Run

**Problem:**
- Frontend calling `/api/v1/chat/tags` returns **500 Internal Server Error**
- This endpoint queries the `tags` table
- `tags` table was created in migration `20251001_1100_enhance_ai_assistant.py`
- **Railway database doesn't have the tags table yet**

**Solution:**
Run Alembic migrations on Railway:

```bash
# SSH into Railway container or run via Railway CLI
alembic upgrade head
```

**Migrations to Run:**
1. `20251001_1100_enhance_ai_assistant.py` - Creates tags table
2. `20251001_2100_add_trial_tracking.py` - Adds trial fields to users
3. `20251001_2101_update_response_templates.py` - Updates response_templates

---

### 2. Frontend 404 Error on /api/v1/system/status

**Problem:**
- Frontend tries to call: `https://www.repruv.co.uk/api/v1/system/status`
- Returns 404 because there's no API on the frontend domain
- Should be calling: `https://revu-backend-production.up.railway.app/api/v1/system/status`

**Root Cause:**
- Some code is making a direct fetch/axios call with a relative URL
- Not using the configured `api` client from `lib/api.ts`

**Solution:**
Find where this call is made and ensure it uses the `api` client:
```typescript
// ❌ DON'T DO THIS
fetch('/api/v1/system/status')

// ✅ DO THIS
import { api } from '@/lib/api';
api.get('/system/status')
```

**Search for:**
- Any `fetch('/api/` calls
- Any `axios.get('/api/` calls without using the api client
- Check layout files and middleware

---

### 3. CORS Error (Secondary Issue)

**Problem:**
```
Access to XMLHttpRequest at 'https://revu-backend-production.up.railway.app/api/v1/chat/tags' 
from origin 'https://www.repruv.co.uk' has been blocked by CORS policy
```

**Analysis:**
- CORS is **already configured** in `backend/app/main.py`
- `www.repruv.co.uk` is in the allowed origins list
- CORS error appears **after** the 500 error
- This is likely a symptom, not the root cause

**Why CORS appears:**
When a request fails (500 error), browsers don't include CORS headers in the error response, making it look like a CORS issue. Fix the 500 error first.

**If CORS persists after fixing 500:**
1. Check Railway backend logs to confirm CORS middleware is running
2. Verify environment variables on Railway
3. May need to restart Railway service after migration

---

## ✅ What's Already Fixed

1. ✅ Missing FastAPI imports in `users.py` (pushed)
2. ✅ Missing shadcn/ui components (checkbox, switch) (pushed)
3. ✅ Missing ThreadSwitcher import (pushed)
4. ✅ Alembic migrations created and committed
5. ✅ CORS configured in backend

---

## 🎯 Action Plan

### Step 1: Run Database Migrations on Railway ⏳

**Via Railway Dashboard:**
1. Go to Railway project
2. Select the backend service
3. Open "Settings" > "Deploy"
4. Add a custom start command or one-time job:
   ```bash
   alembic upgrade head && python run.py
   ```

**OR Via Railway CLI:**
```bash
railway run alembic upgrade head
```

---

### Step 2: Find and Fix Direct API Calls ⏳

Search frontend for:
```bash
cd frontend
grep -r "fetch('/api" . --include="*.tsx" --include="*.ts"
grep -r 'fetch("/api' . --include="*.tsx" --include="*.ts"
grep -r "axios.get('/api" . --include="*.tsx" --include="*.ts"
```

Replace with api client imports.

---

### Step 3: Verify Deployment ⏳

After migrations:
1. Check Railway logs for successful migration
2. Test `/api/v1/chat/tags` endpoint directly
3. Verify frontend can load tags
4. Check for any remaining CORS errors

---

## 📋 Checklist

- [ ] Run Alembic migrations on Railway
- [ ] Find source of `/api/v1/system/status` direct call
- [ ] Fix to use api client
- [ ] Verify tags endpoint works
- [ ] Test AI Assistant page loads
- [ ] Confirm no 500 errors
- [ ] Confirm no CORS errors

---

## 🔍 Debug Commands

**Check if tags table exists:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'tags';
```

**Check current migration:**
```bash
alembic current
```

**Check migration history:**
```bash
alembic history
```

---

## 📞 Support

If issues persist:
1. Check Railway logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure Redis is connected and accessible
4. Check Supabase database connection

---

**Priority:** 🔴 High - Blocking AI Assistant functionality
