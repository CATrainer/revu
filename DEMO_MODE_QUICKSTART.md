# Demo Mode - Quick Start for Client Demo

## 🚨 URGENT: For Today's Client Demo

### Step 1: Deploy Backend (5 minutes)

```bash
# Push all changes
git add .
git commit -m "CRITICAL: Fix demo mode data separation and filtering"
git push origin main
```

Railway will auto-deploy. Watch the logs in Railway dashboard.

### Step 2: Run Database Migration (2 minutes)

**Option 1 - Via Supabase SQL Editor (FASTEST):**

1. Go to Supabase Dashboard → SQL Editor
2. Paste and run:

```sql
-- Add demo flags to tables
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_interactions_is_demo ON interactions(is_demo);

ALTER TABLE content_pieces 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_content_pieces_is_demo ON content_pieces(is_demo);
```

**Option 2 - Via Railway Shell:**
```bash
cd backend
alembic upgrade head
```

### Step 3: Test Demo Flow (Before Client Arrives)

#### A. Enable Demo Mode
1. Open your app: https://your-app.vercel.app
2. Login
3. Go to `/settings/demo-mode`
4. Select "Medium Creator" preset
5. Click "Enable Demo Mode"

**If external service fails** (shows error), that's OK! Go to step B.

#### B. Seed Demo Data (Fallback)

Use your API client or browser:

**Via Postman/Insomnia:**
```
POST https://your-backend.railway.app/api/v1/demo/seed-sample-interactions?count=50
Authorization: Bearer YOUR_TOKEN
```

**Via Browser Console (while logged in):**
```javascript
fetch('/api/v1/demo/seed-sample-interactions?count=50', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => r.json()).then(console.log)
```

**Via cURL:**
```bash
curl -X POST 'https://your-backend.railway.app/api/v1/demo/seed-sample-interactions?count=50' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

#### C. Verify Demo Data Shows Up
1. Go to `/interactions` page
2. Should see 50 demo interactions
3. Go to `/analytics` - should show demo data stats
4. All data should have demo context

## 📱 Demo Script for Client

### Show Demo Mode Setup
1. **Navigate to Settings > Demo Mode**
   - "We've built a sophisticated demo environment"
   - "You can test all features without connecting real social accounts"

2. **Configure Profile**
   - "Choose your creator size and niche"
   - "The system generates realistic data matching your profile"

### Show Interactions Management
1. **Navigate to Interactions Page**
   - "Here you see all your social media comments and DMs in one place"
   - "The AI has already analyzed sentiment and priority"
   - Point out:
     - Sentiment indicators (positive/neutral/negative)
     - Priority scores
     - Platform icons
     - Engagement metrics

2. **Filter and Search**
   - "You can filter by platform, sentiment, status"
   - "Search for specific keywords"
   - "Create custom views for different workflows"

### Show Analytics
1. **Navigate to Analytics**
   - "Track your engagement trends"
   - "See which platforms perform best"
   - "Monitor response rates"

### Show Data Separation
1. **Disable Demo Mode** (Settings > Demo Mode > Disable)
   - "When you disable demo mode, all demo data is cleaned up"
   - "Your real data stays completely separate"
   - Show cleanup confirmation with counts

2. **Re-enable** (if time permits)
   - "You can toggle in and out of demo mode anytime"
   - "Perfect for testing features or training team members"

## 🎯 Key Talking Points

1. **Data Separation**: "Demo data never mixes with your real data"
2. **Realistic**: "Demo interactions are AI-generated to match real patterns"
3. **Safe Testing**: "Experiment with workflows and automation safely"
4. **Team Training**: "Train your team without risk to real customer relationships"
5. **Instant Setup**: "Get started immediately, no social account connections needed"

## ⚠️ Troubleshooting

### "Demo mode enable failed"
- **Solution**: Use the seed endpoint (Step 3B above)
- **Tell Client**: "This is a network timeout, we have a backup data source"

### "No interactions showing"
- Check: Is demo mode actually enabled? (Check `/settings/demo-mode`)
- **Solution**: Run seed endpoint again
- Check: Browser might be caching - hard refresh (Ctrl+Shift+R)

### "Data looks wrong after disable/enable"
- **Solution**: Hard refresh browser (Ctrl+Shift+R)
- Data should update within 2-3 seconds

## 🔐 Environment Variables (if needed)

Check these are set in Railway:

```env
DEMO_SERVICE_URL=<optional-if-you-have-it>
DEMO_WEBHOOK_SECRET=<optional-if-you-have-it>
```

If not set, demo enable will require manual seeding (which is fine for demo).

## ✅ Pre-Demo Checklist

- [ ] Backend deployed to Railway
- [ ] Migration ran successfully
- [ ] Test: Enable demo mode works
- [ ] Test: Seed endpoint works (fallback)
- [ ] Test: Interactions show demo data
- [ ] Test: Analytics show demo stats
- [ ] Test: Disable demo mode cleans data
- [ ] Frontend deployed to Vercel
- [ ] Can access app in browser
- [ ] Know your login credentials
- [ ] Have backup seed command ready

## 🎬 Demo Flow (5 minutes)

1. **Intro** (30s): "Let me show you our demo environment..."
2. **Enable Demo** (1m): Configure and enable
3. **Seed Data** (30s): If needed, run seed command
4. **Show Interactions** (2m): Filter, search, demonstrate features
5. **Show Analytics** (1m): Charts, insights
6. **Show Toggle** (30s): Disable, show cleanup, re-enable

---

**Emergency Contact:** If anything breaks during demo, you can manually insert data via SQL:

```sql
INSERT INTO interactions (
  id, platform, type, platform_id, content, author_username,
  sentiment, status, priority_score, user_id, is_demo, created_at
) VALUES (
  gen_random_uuid(), 'youtube', 'comment', 'demo_1',
  'This is a demo comment!', 'demo_user',
  'positive', 'unread', 80, 'YOUR_USER_ID', true, NOW()
);
```

Good luck with the demo! 🚀
