# Demo Mode Data Requirements

## Current Architecture

### Data Flow
```
Demo Simulator (Railway) → Webhook → Main Backend → Production Database
```

1. **Demo Simulator** generates content and interactions
2. **Webhooks** send data to main app (`/api/v1/webhooks/demo`)
3. **Main Backend** receives and stores in production database with `is_demo=True` flag
4. **Frontend** queries same endpoints - demo data is mixed with real data for demo users

### Key Models with `is_demo` Flag
- `Interaction` - Comments, DMs, mentions
- `Fan` - Commenter profiles
- `ContentPiece` - Posts/videos (needs enhancement)
- `ContentPerformance` - Metrics (needs enhancement)

---

## App Features & Data Requirements

### 1. Dashboard (`/dashboard`)
**Current Data Sources:**
- Total followers/subscribers (from platform integrations)
- Engagement rate
- Interactions today
- Active workflows

**Demo Data Needed:**
- ✅ Interactions (already generated)
- ❌ Platform connection simulation (YouTube, Instagram, TikTok)
- ❌ Follower/subscriber counts
- ❌ Engagement metrics

### 2. Interactions (`/interactions`)
**Current Data Sources:**
- Interactions table with filters by platform, status, sentiment

**Demo Data Needed:**
- ✅ Interactions with varied sentiments
- ✅ Author profiles (username, avatar, verified status)
- ✅ Parent content context (title, URL)
- ❌ Reply functionality (creator replies to demo comments)
- ❌ Thread continuation (demo user replies back)

### 3. Insights (`/insights`)
**Current Data Sources:**
- ContentPiece with performance metrics
- ContentInsight for AI-generated insights
- ContentTheme for topic analysis

**Demo Data Needed:**
- ❌ ContentPiece records with full metadata
- ❌ ContentPerformance with realistic metrics
- ❌ ContentInsight with AI-generated analysis
- ❌ Historical data for trend analysis

### 4. AI Assistant (`/ai-assistant`)
**Current Data Sources:**
- Chat sessions with AI
- Context from user's content and interactions

**Demo Data Needed:**
- ✅ Interactions provide context
- ❌ Content pieces for richer context
- ❌ Performance data for analytics questions

### 5. Monetization (`/monetization`)
**Current Data Sources:**
- Brand deals, sponsorships
- Revenue tracking

**Demo Data Needed:**
- ❌ Demo brand deals (optional - lower priority)
- ❌ Revenue simulation (optional)

### 6. Analytics
**Current Data Sources:**
- Platform-specific analytics
- Aggregated metrics

**Demo Data Needed:**
- ❌ Historical metrics data
- ❌ Trend data over time
- ❌ Platform-specific analytics

---

## Priority Data Enhancements

### P0 - Critical (Must Have)
1. **Content Pieces** - Full content records with metadata
2. **Content Performance** - Views, likes, comments, engagement
3. **Reply Functionality** - Creator can reply to demo interactions
4. **Reply Follow-ups** - Demo users respond to creator replies

### P1 - Important (Should Have)
1. **Platform Connection Simulation** - Show as "connected" with metrics
2. **Historical Data** - Content from past 30-90 days
3. **Varied Interaction Types** - Comments, DMs, mentions
4. **Engagement Waves** - Realistic timing of new interactions

### P2 - Nice to Have
1. **Analytics Trends** - Historical charts
2. **AI Insights** - Generated insights about content
3. **Fan CRM Data** - Superfans, engagement scores

---

## Implementation Plan

### Phase 1: Enhance Content Generation
**Demo Simulator Changes:**
- Generate `DemoContent` with full metadata
- Include thumbnail URLs, descriptions, hashtags
- Create realistic publishing schedule (past 30 days)

**Webhook Enhancement:**
- Add `content.created` event with full data
- Main app creates `ContentPiece` records

### Phase 2: Add Content Performance
**Demo Simulator Changes:**
- Generate performance metrics for each content
- Realistic view/engagement curves
- Platform-specific metrics

**Webhook Enhancement:**
- Add `content.performance_updated` event
- Main app creates/updates `ContentPerformance` records

### Phase 3: Reply Functionality
**Main App Changes:**
- When user replies to demo interaction, notify demo service
- Demo service generates contextual follow-up

**Demo Simulator Changes:**
- Add `/reply-received` endpoint
- Generate follow-up interactions based on context

### Phase 4: Platform Connection Simulation
**Main App Changes:**
- For demo users, return simulated platform data
- Dashboard metrics endpoint returns demo profile stats

---

## Data Generation Specifications

### Content Pieces (per platform)
- **YouTube:** 15-25 videos over 60 days
- **Instagram:** 30-50 posts over 60 days  
- **TikTok:** 40-60 videos over 60 days

### Content Metadata
```json
{
  "title": "AI-generated based on niche",
  "description": "Longer description with hashtags",
  "thumbnail_url": "Placeholder or generated",
  "duration_seconds": 180-900 for YouTube, 15-60 for TikTok,
  "hashtags": ["#relevant", "#niche", "#tags"],
  "published_at": "Distributed over past 60 days",
  "theme": "Tutorial | Review | Storytime | Tips | etc."
}
```

### Content Performance
```json
{
  "views": "Based on profile subscriber count",
  "likes": "2-8% of views",
  "comments_count": "0.5-2% of views",
  "shares": "0.1-0.5% of views",
  "engagement_rate": "Calculated",
  "watch_time_minutes": "For video content",
  "retention_rate": "40-70%"
}
```

### Interaction Types
- **Comments:** 70% of interactions
- **DMs:** 20% of interactions (future)
- **Mentions:** 10% of interactions (future)

### Interaction Categories
- Product questions: 25%
- Fan appreciation: 30%
- Collaboration requests: 15%
- Technical questions: 15%
- Negative/complaints: 10%
- Spam: 5%

---

## Webhook Event Types

### Current
- `interaction.created` ✅

### To Add
- `content.created` - New content piece
- `content.performance_updated` - Metrics update
- `reply.followup` - Demo user responds to creator reply
- `profile.updated` - Demo profile stats changed

---

## Database Considerations

### Demo Data Isolation
All demo data MUST have `is_demo=True`:
- Prevents mixing with real user data
- Allows easy cleanup if needed
- Enables demo-specific queries

### Cleanup Strategy
When demo mode is disabled:
- Keep data for 7 days (in case re-enabled)
- Background job cleans up old demo data
- Or: immediately delete all `is_demo=True` records for user

---

## Testing Checklist

### Content Generation
- [ ] Content pieces created with full metadata
- [ ] Thumbnails display correctly
- [ ] Published dates are realistic
- [ ] Platform-specific fields populated

### Performance Metrics
- [ ] Views/likes/comments realistic
- [ ] Engagement rates calculated
- [ ] Historical trends visible
- [ ] Analytics charts populated

### Interactions
- [ ] Varied sentiments and categories
- [ ] Author profiles complete
- [ ] Parent content linked
- [ ] Reply functionality works
- [ ] Follow-up replies generated

### Dashboard
- [ ] Metrics display correctly
- [ ] Platform connections show as connected
- [ ] Follower counts display
- [ ] Engagement rate calculated
