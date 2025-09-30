# 🚀 Quick Start - Deploy ChatGPT+ Features

## TL;DR - 5 Minute Deploy

```bash
# 1. Backend - Run migration
cd backend
alembic upgrade head

# 2. Backend - Restart service
# Kill existing process, then:
uvicorn app.main:app --reload

# 3. Frontend - Deploy (if using Vercel)
cd frontend
git push  # Auto-deploys on Vercel

# 4. Test it works
# Open http://localhost:3000/ai-assistant
# Click "Browse Templates" - should see 15 templates
# Click "AI Preferences" at bottom of sidebar
# Send a message - follow-ups should appear after response
```

## What You're Deploying

### Intelligence Features
- ✅ Smart follow-up suggestions after AI responses
- ✅ Auto-generated conversation summaries (10+ messages)
- ✅ Quality ratings (thumbs up/down/star)
- ✅ Message actions (copy, edit, regenerate)

### Advanced Features
- ✅ 15 pre-built conversation templates
- ✅ User preferences system
- ✅ Custom AI instructions
- ✅ Response style customization
- ✅ Smart usage analysis

## Detailed Steps

### Step 1: Database Migration (2 min)

```bash
cd backend

# Preview what will change
alembic heads

# Run the migrations
alembic upgrade head

# Expected output:
# INFO [alembic] Running upgrade 20250930_1850 -> 20250930_1900
# INFO [alembic] add AI intelligence and social data tables
```

**What this creates:**
- 7 new database tables
- 8 optimized indexes
- 1 PostgreSQL trigger

### Step 2: Restart Backend (1 min)

**Option A - Development:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Option B - Production (Railway):**
```bash
# In Railway dashboard:
# 1. Go to your backend service
# 2. Click "Redeploy"
# 3. Wait for health check to pass
```

**Verify it's working:**
```bash
curl http://localhost:8000/api/v1/chat/templates
# Should return 15 templates

curl http://localhost:8000/api/v1/users/preferences
# Should return default preferences
```

### Step 3: Deploy Frontend (1 min)

**Option A - Vercel (Auto-deploy):**
```bash
cd frontend
git add .
git commit -m "Add ChatGPT+ features"
git push
# Vercel auto-deploys from main branch
```

**Option B - Manual Build:**
```bash
cd frontend
npm run build
npm start
```

**Verify it's working:**
1. Open http://localhost:3000/ai-assistant
2. Look for "Browse Templates" button in sidebar
3. Look for "AI Preferences" at bottom of sidebar
4. Send a test message
5. Should see follow-up suggestions appear

### Step 4: Test Key Features (1 min)

**Test Template Library:**
1. Click "Browse Templates" in sidebar
2. Dialog should open with 15 templates
3. Click "Content Strategy Session"
4. New chat should open automatically
5. Initial prompt should be sent

**Test User Preferences:**
1. Click "AI Preferences" at bottom of sidebar
2. Dialog should open
3. Try changing response style
4. Click "Save Preferences"
5. Should see success message

**Test Intelligence Features:**
1. Send any message to AI
2. Wait for response
3. Should see follow-up suggestions below
4. Click one - should populate input
5. Hover over message - should see action buttons
6. After 10 messages - summary should appear at top

## Troubleshooting

### Migration Fails

**Error:** `relation "content_templates" already exists`

**Solution:**
```bash
# Check current migration state
alembic current

# If already on latest:
alembic downgrade -1
alembic upgrade head
```

### Templates Don't Load

**Error:** `Failed to fetch templates`

**Solution:**
```bash
# Check backend logs
# Templates auto-populate on first request

# Manual fix:
psql $DATABASE_URL
SELECT COUNT(*) FROM content_templates;
# Should return 15

# If 0, restart backend - they'll populate automatically
```

### Preferences Don't Save

**Error:** `Failed to save preferences`

**Solution:**
```bash
# Check table exists
psql $DATABASE_URL
\dt user_ai_preferences

# Check user has permissions
SELECT * FROM user_ai_preferences LIMIT 1;
```

### Follow-ups Don't Appear

**Check:**
1. Is CLAUDE_API_KEY set in backend?
2. Check browser console for errors
3. Check network tab - should see POST to /followups
4. Check backend logs for Claude API errors

**Fallback:**
- If Claude API fails, fallback suggestions still appear
- Check that `FollowUpSuggestions.tsx` component is imported

## Environment Variables

### Backend (.env)

**Required:**
```bash
CLAUDE_API_KEY=sk-ant-...  # For AI responses
DATABASE_URL=postgresql://...  # Your database
```

**Optional (already set):**
```bash
CLAUDE_MODEL=claude-3-5-sonnet-latest
CLAUDE_MAX_TOKENS=1024
```

### Frontend (.env.local)

**Required:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1  # Dev
# or
NEXT_PUBLIC_API_URL=https://api.repruv.com/api/v1  # Prod
```

## Monitoring After Deploy

### Key Metrics to Watch

**First Hour:**
- [ ] No 500 errors in backend logs
- [ ] Templates endpoint returns 200
- [ ] Preferences endpoint returns 200
- [ ] Users can create new chats from templates
- [ ] Follow-ups generate successfully

**First Day:**
- [ ] Template usage count increases
- [ ] Users set custom preferences
- [ ] Quality ratings submitted
- [ ] Summaries generate at 10+ messages

**First Week:**
- [ ] Track most popular templates
- [ ] Monitor Claude API costs
- [ ] Check database performance
- [ ] Gather user feedback

### Log Locations

**Backend Logs:**
```bash
# Development
# Terminal output from uvicorn

# Railway Production
# Dashboard → Deployments → Logs
```

**Frontend Logs:**
```bash
# Development
# Browser console

# Vercel Production
# Dashboard → Deployments → Function Logs
```

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Test endpoints
curl http://localhost:8000/api/v1/chat/templates
curl http://localhost:8000/api/v1/users/preferences

# Database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM content_templates;"
```

## Rollback Plan

If something goes wrong:

### Rollback Backend

```bash
cd backend

# Rollback migration
alembic downgrade -1

# Revert code
git checkout HEAD~1 -- app/api/v1/endpoints/

# Restart
uvicorn app.main:app --reload
```

### Rollback Frontend

```bash
cd frontend

# Revert code
git revert HEAD

# Push
git push

# Vercel auto-deploys old version
```

## Success Indicators

✅ **Deployed Successfully If:**
- Templates button visible in sidebar
- Clicking it opens dialog with 15 templates
- Preferences button visible at bottom of sidebar
- Follow-up suggestions appear after AI responses
- Hovering messages shows action buttons
- Summary appears after 10 messages
- All animations smooth
- No console errors
- Mobile responsive works

## Post-Deploy Tasks

### Immediate (Day 1):
1. [ ] Announce new features to users
2. [ ] Monitor error rates
3. [ ] Check Claude API usage
4. [ ] Verify database performance
5. [ ] Gather initial feedback

### Short-Term (Week 1):
1. [ ] Analyze template usage
2. [ ] Track quality ratings
3. [ ] Monitor user preferences adoption
4. [ ] Check summary generation rate
5. [ ] Optimize based on metrics

### Long-Term (Month 1):
1. [ ] Add more templates based on usage
2. [ ] Enhance preferences UI
3. [ ] Begin Phase 3 (social data sync)
4. [ ] Team collaboration features
5. [ ] Export conversations

## Support

**Documentation:**
- `IMPLEMENTATION_SUMMARY.md` - Complete overview
- `PHASE1_COMPLETE.md` - Intelligence features
- `PHASE2_COMPLETE.md` - Advanced features
- `DEPLOYMENT_READY.md` - Deployment guide

**API Documentation:**
- OpenAPI/Swagger: `http://localhost:8000/docs`
- All endpoints documented with examples

**Getting Help:**
- Check backend logs first
- Check browser console for frontend errors
- Review documentation files
- Test with curl to isolate backend vs frontend

---

**Time to Deploy:** ~5 minutes  
**Risk Level:** LOW (comprehensive error handling)  
**Reversible:** YES (rollback plan included)  
**Impact:** HIGH (transformative user experience)

**Ready to go!** 🚀
