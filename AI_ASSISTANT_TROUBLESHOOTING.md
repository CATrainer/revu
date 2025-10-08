# AI Assistant 404 Error - Troubleshooting Guide

## Problem
Users getting **404 error** when trying to use the AI Assistant at `/ai-assistant`.

## Root Cause
The AI Assistant chat endpoints require:
1. **Anthropic API Key** environment variable
2. **Database tables** for chat sessions and messages
3. **Deployed backend code** with chat endpoints

---

## Solution Steps

### 1. Add CLAUDE_API_KEY to Railway

**In Railway Dashboard:**
1. Go to your project: https://railway.app
2. Select the **backend service**
3. Click **Variables** tab
4. Add new variable:
   - **Name:** `CLAUDE_API_KEY`
   - **Value:** Your Anthropic API key (starts with `sk-ant-...`)
5. Click **Deploy** to restart with new variable

**To get an Anthropic API key:**
- Go to https://console.anthropic.com/
- Sign up or login
- Navigate to API Keys section
- Create a new API key
- Copy and paste into Railway

---

### 2. Verify Database Migrations

The chat feature needs these tables:
- `ai_chat_sessions`
- `ai_chat_messages`  
- `ai_chat_branches`

**Option A: Check if tables exist (via Railway CLI or Supabase)**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ai_chat%';
```

**Option B: Run migrations manually on Railway**

If using Railway CLI:
```bash
railway run alembic upgrade head
```

Or add to your Railway deployment script:
- Set build command: `alembic upgrade head && python run.py`

---

### 3. Verify Backend Deployment

**Test the chat endpoint is accessible:**

Open in browser or use curl:
```
https://revu-backend-production.up.railway.app/api/v1/chat/sessions
```

Should return `401 Unauthorized` (needs auth) instead of `404 Not Found`

**Check Railway logs:**
1. Go to Railway dashboard
2. Select backend service
3. View **Deployments** tab
4. Check latest deployment logs for errors

---

### 4. Frontend Environment Variables

Verify your frontend `.env.local` or Vercel environment variables:

```env
NEXT_PUBLIC_API_URL=https://revu-backend-production.up.railway.app/api/v1
```

---

## Required Environment Variables on Railway

Your backend service needs:

### Core
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret
- `REDIS_URL` - Redis connection string

### AI Features
- `CLAUDE_API_KEY` - Anthropic Claude API key (⚠️ **Required for AI Assistant**)
- `OPENAI_API_KEY` - OpenAI API key (if using GPT features)

### Email (Optional)
- `RESEND_API_KEY` - For sending emails

---

## Testing After Fix

### 1. Test Backend Directly

Using curl or Postman (with your auth token):

```bash
# Get sessions
curl -X GET "https://revu-backend-production.up.railway.app/api/v1/chat/sessions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create session
curl -X POST "https://revu-backend-production.up.railway.app/api/v1/chat/sessions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Chat", "mode": "general"}'
```

### 2. Test Frontend

1. Sign in to your deployed app
2. Navigate to `/ai-assistant`
3. Try sending a message
4. Should work without 404 errors

---

## Common Errors & Solutions

### Error: "404 Not Found"
**Cause:** Backend deployment doesn't include chat endpoints OR migrations not run
**Fix:** Redeploy backend from latest main branch, run migrations

### Error: "500 Internal Server Error" with "CLAUDE_API_KEY not found"
**Cause:** Missing API key environment variable  
**Fix:** Add `CLAUDE_API_KEY` to Railway variables

### Error: "Table 'ai_chat_sessions' does not exist"
**Cause:** Database migrations not applied
**Fix:** Run `alembic upgrade head` on Railway

### Error: Chat loads but messages don't stream
**Cause:** Claude API key invalid or quota exceeded
**Fix:** Check Anthropic console for API key status and usage

---

## Verification Checklist

- [ ] `CLAUDE_API_KEY` added to Railway environment variables
- [ ] Backend redeployed after adding env variable
- [ ] Database migrations run successfully
- [ ] Can access `/api/v1/chat/sessions` endpoint (gets 401, not 404)
- [ ] Railway logs show no errors about missing CLAUDE_API_KEY
- [ ] Frontend can load AI Assistant page without 404
- [ ] Can create new chat session
- [ ] Can send messages and receive responses

---

## Quick Fix Command Summary

```bash
# 1. Add environment variable (Railway dashboard or CLI)
railway variables set CLAUDE_API_KEY=sk-ant-your-key-here

# 2. Run migrations
railway run alembic upgrade head

# 3. Restart service
railway up
```

---

## Still Having Issues?

**Check Railway Logs:**
```bash
railway logs --service backend
```

**Check Database Connection:**
```bash
railway run python -c "from app.core.database import engine; print('DB OK')"
```

**Verify API Key Works:**
```bash
railway run python -c "import os; from anthropic import Anthropic; print('Key OK' if os.getenv('CLAUDE_API_KEY') else 'Missing')"
```

---

## Migration Files for Chat Feature

These migrations create the chat tables:
- `20250905_1200-add_social_monitoring_and_ai_chat.py` (initial)
- `20250930_1430-add_chat_branching.py` (branches)
- `20251001_1100_enhance_ai_assistant.py` (enhancements)

If they haven't run, your database won't have the required tables.
