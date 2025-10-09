# "What's Working" Insights - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you test the complete "What's Working" insights feature end-to-end.

## Step 1: Run Database Migration

```bash
cd backend
alembic upgrade head
```

This creates the new tables:
- `content_pieces` - Social media content
- `content_performance` - Performance metrics
- `content_insights` - AI-generated insights
- `content_themes` - Theme aggregates
- `action_plans` - Goal tracking
- `action_items` - Individual tasks

## Step 2: Start the Services

### Backend
```bash
cd backend
python run.py
```

### Demo Simulator (if using demo mode)
```bash
cd demo-simulator
python run.py
```

### Frontend
```bash
cd frontend
npm run dev
```

## Step 3: Enable Demo Mode & Generate Content

### Option A: Via API
```bash
curl -X POST http://localhost:8000/api/v1/demo/enable \
  -H "Content-Type: application/json" \
  -d '{
    "profile_type": "auto",
    "niche": "tech_reviews",
    "yt_subscribers": 100000,
    "ig_followers": 50000,
    "tt_followers": 200000
  }'
```

### Option B: Via Frontend
1. Navigate to Settings → Demo Mode
2. Click "Enable Demo Mode"
3. Select your niche and preferences

The simulator will automatically generate 30-50 realistic content pieces with:
- Performance metrics
- AI-generated insights
- Theme categorization
- Realistic distribution (20% top, 60% normal, 20% poor)

## Step 4: Explore the Dashboard

### Main Insights Dashboard
Navigate to: `http://localhost:3000/dashboard/insights`

**What you'll see:**
- **Summary Cards**: Total content, avg engagement, total views, performance distribution
- **Top Performers Tab**: Your 5 best pieces with AI insights explaining why they worked
- **Needs Attention Tab**: Underperforming content with improvement suggestions
- **Themes Tab**: Performance breakdown by content category
- **Platform Comparison**: YouTube vs Instagram vs TikTok performance

### Filters
- **Time Period**: 7 days, 30 days, 90 days
- **Platform**: All, YouTube, Instagram, TikTok

## Step 5: View Content Details

Click on any content piece to see:

1. **Full Performance Metrics**
   - Views, likes, comments, shares
   - Engagement rate, retention rate
   - Followers gained, profile visits

2. **Performance Score**
   - 0-100 score relative to your content
   - Percentile ranking

3. **AI Insights - "Why It Worked"**
   - High/medium/low impact factors
   - Timing analysis
   - Theme performance
   - Engagement quality

4. **Areas for Improvement**
   - Factors that limited performance
   - Specific recommendations

## Step 6: Interact with AI

Click **"Make More Like This"** or **"Diagnose with AI"** to:

1. Open AI chat with pre-loaded context about the content
2. Ask specific questions like:
   - "What made this video perform so well?"
   - "How can I replicate this success?"
   - "What should I post next?"

3. Get data-driven recommendations
4. Create action plans from conversations

## Step 7: Create an Action Plan

### From AI Chat
During conversation, the AI will suggest action plans. Example:

**AI**: "Based on this analysis, I recommend:
1. Post similar tutorial content on Thursdays at 2pm
2. Create 4 videos in the next month
3. Focus on 5-8 minute duration

Would you like me to create an action plan to track this?"

**You**: "Yes, create the plan"

### Manually
Navigate to: `http://localhost:3000/dashboard/action-plans`

Click **"New Action Plan"**

## Step 8: Track Your Progress

In the Action Plans page:

1. **View Active Plans**
   - See progress bars
   - Check upcoming due dates
   - View completion status

2. **Complete Action Items**
   - Click checkboxes to mark tasks done
   - Add actual outcomes
   - Link to content you created

3. **Track Results**
   - Compare projected vs actual outcomes
   - Mark plans as complete
   - Review what worked

## Complete User Flow Example

```
1. User opens /dashboard/insights
   ↓
2. Sees "10 minute tutorial on React Hooks" performed amazingly
   ↓
3. Clicks to view full details
   ↓
4. Sees insights: "Perfect timing (Thu 2pm)", "Tutorial content", "High retention (65%)"
   ↓
5. Clicks "Make More Like This"
   ↓
6. AI chat opens with content context
   ↓
7. User: "How can I replicate this?"
   ↓
8. AI: Provides specific strategy (post times, topics, duration)
   ↓
9. AI suggests creating action plan
   ↓
10. User approves, plan created with 4 action items
    ↓
11. User goes to /dashboard/action-plans
    ↓
12. Sees plan: "Create 4 tutorial videos this month"
    ↓
13. Completes first item: "Record tutorial on hooks"
    ↓
14. Links to new content piece
    ↓
15. Tracks actual vs projected views
    ↓
16. Learns and refines strategy
```

## Testing Checklist

- [ ] Database migration ran successfully
- [ ] Demo mode enabled
- [ ] Content generated (30-50 pieces)
- [ ] Dashboard loads with data
- [ ] Top performers show AI insights
- [ ] Content detail page shows full metrics
- [ ] Platform comparison displays correctly
- [ ] Themes show aggregate data
- [ ] AI chat can be opened from content
- [ ] Action plans can be created
- [ ] Action items can be checked off
- [ ] Progress updates when items completed

## Sample Test Scenarios

### Scenario 1: Top Performer Analysis
1. Go to Top Performers tab
2. Find content with 90+ score
3. View full details
4. Read "Why It Worked" insights
5. Note factors: timing, theme, engagement
6. Click "Make More Like This"
7. Ask AI for specific next steps

### Scenario 2: Fix Underperforming Content
1. Go to Needs Attention tab
2. Find content with <40 score
3. View insights about what went wrong
4. Click "Diagnose with AI"
5. Get improvement recommendations
6. Create action plan to improve

### Scenario 3: Theme Analysis
1. Go to Themes tab
2. Find highest performing theme
3. See average engagement and score
4. Note which themes work best
5. Plan more content in top themes

### Scenario 4: Complete Action Plan Flow
1. Create new action plan
2. Add 3-5 action items with due dates
3. Go to action-plans page
4. Check off first item
5. See progress bar update
6. Complete all items
7. Mark plan as complete
8. Review results

## Expected Performance

With simulated data, you should see:

**Distribution**
- ~6 overperforming pieces (20%)
- ~20 normal pieces (60%)
- ~6 underperforming pieces (20%)

**Insights**
- 3-5 insights per top performer
- 2-3 insights per underperformer
- Mix of timing, theme, engagement, retention factors

**Themes**
- Tutorial content: highest performance
- Tips & Tricks: high engagement
- Vlogs: lower performance
- Reviews: moderate performance

**Platform Trends**
- YouTube: Higher retention rates
- Instagram: Higher engagement rates
- TikTok: Higher volume, shorter duration

## Troubleshooting

### No data showing
```bash
# Check if content was created
psql -d your_db -c "SELECT COUNT(*) FROM content_pieces;"

# If 0, regenerate content via demo mode
```

### Insights not displaying
```bash
# Check insights exist
psql -d your_db -c "SELECT COUNT(*) FROM content_insights;"

# Should have 3-5 per overperforming piece
```

### Action plans not updating
- Check browser console for errors
- Verify API endpoints return 200
- Ensure WebSocket connections if using real-time

## Next Steps

Once you've tested with simulated data:

1. **Connect Real APIs**
   - Integrate YouTube Data API
   - Connect Instagram Graph API
   - Add TikTok API

2. **Automate Sync**
   - Set up Celery tasks to fetch new content
   - Update metrics daily
   - Regenerate insights periodically

3. **Enhance AI**
   - Add more sophisticated insight generation
   - Implement predictive analytics
   - Create automated action plans

4. **User Feedback**
   - Collect feedback on insights accuracy
   - A/B test different recommendation strategies
   - Refine scoring algorithms

## Support

For issues or questions:
- Check `docs/WHATS_WORKING_IMPLEMENTATION.md` for technical details
- Review API responses in browser DevTools
- Check backend logs for errors
- Verify database records were created

---

**Built with:** FastAPI, PostgreSQL, Next.js, Claude AI, Shadcn/ui
