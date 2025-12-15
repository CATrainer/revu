# Demo Mode Enhancement Plan
**Date:** December 10, 2024  
**Status:** ✅ IMPLEMENTED  
**Objective:** Transform demo mode from user-accessible feature to internal testing tool with rich, realistic data generation

---

## Implementation Summary

### ✅ Phase 1: Remove User-Facing Demo UI
**Files Deleted:**
- `frontend/app/(dashboard)/settings/demo-mode/` - Demo settings page
- `frontend/components/demo/` - DemoOnboarding, DemoBanner components
- `frontend/components/shared/DemoBanner.tsx` - Shared demo banner
- `frontend/contexts/DemoModeContext.tsx` - Demo mode context

**Files Modified:**
- `frontend/app/(dashboard)/settings/page.tsx` - Removed Demo Mode tab
- `frontend/app/(dashboard)/dashboard/page.tsx` - Removed all demo banners and is_demo conditionals

### ✅ Phase 2: Restrict Demo Access
**Already Implemented:**
- `backend/app/core/config.py` - DEMO_ALLOWED_EMAILS whitelist
- `backend/app/api/v1/endpoints/demo.py` - check_demo_access() function

### ✅ Phase 3: Audit App Features
**Created:** `DEMO_DATA_REQUIREMENTS.md` - Comprehensive data requirements document

### ✅ Phase 4: Enhance Demo Service Data Generation
**Files Modified:**
- `demo-simulator/app/models/demo_content.py` - Added rich metadata fields
- `demo-simulator/app/services/simulation_engine.py` - Enhanced create_content() with full metadata
- `demo-simulator/app/services/content_generator.py` - Added generate_video_description()
- `demo-simulator/app/services/webhook_sender.py` - Added new webhook event types

### ✅ Phase 5: Enhance Main App Data Sync
**Files Modified:**
- `backend/app/api/v1/endpoints/demo_webhooks.py` - Full content.published handler, metrics update handler

### ✅ Phase 6: Reply Functionality
**Already Implemented:**
- `demo-simulator/app/api/actions.py` - Reply handling with follow-up generation
- `backend/app/services/demo_action_provider.py` - Demo platform action provider

---

---

## Current Architecture Understanding

### Demo Service (Separate Railway Deployment)
- **Location:** `demo-simulator/` folder
- **Deployment:** Independent Railway service
- **Database:** Uses SQLAlchemy `create_all()` (not Alembic)
- **Purpose:** Generates simulated social media data for testing

### Current Demo Mode Flow
1. User enables demo mode via `/settings/demo-mode`
2. Backend creates demo profile in demo service
3. Demo service generates interactions, content, metrics
4. Frontend displays demo data alongside real data
5. Demo banners/toggles visible to users

### Key Components
**Frontend:**
- `contexts/DemoModeContext.tsx` - Demo state management
- `components/demo/DemoOnboarding.tsx` - Demo setup UI
- `components/demo/DemoBanner.tsx` - Demo mode indicator
- `components/shared/DemoBanner.tsx` - Another demo banner
- `app/(dashboard)/settings/demo-mode/page.tsx` - Demo settings page
- `app/(dashboard)/dashboard/page.tsx` - Shows demo banners

**Backend:**
- `app/api/v1/endpoints/demo.py` - Demo enable/disable endpoints
- `app/tasks/demo_operations.py` - Background demo tasks
- `app/models/user.py` - Demo mode fields on User model

**Demo Simulator:**
- `demo-simulator/app/main.py` - Main service
- `demo-simulator/app/services/simulation_engine.py` - Data generation
- `demo-simulator/app/tasks/` - Scheduled tasks

---

## Requirements

### 1. Remove All User-Facing Demo Mode UI
**Goal:** Demo mode should be invisible to users - no toggles, banners, or settings

**Frontend Changes:**
- ❌ Remove `/settings/demo-mode` page entirely
- ❌ Remove "Demo Mode" tab from settings
- ❌ Remove all demo banners from dashboard
- ❌ Remove `DemoModeContext` and `useDemoMode` hook
- ❌ Remove `DemoOnboarding` component
- ❌ Remove all `DemoBanner` components
- ❌ Remove demo mode checks in UI (e.g., `hasDemoAccess` conditionals)

**Backend Changes:**
- ✅ Keep demo enable/disable endpoints (for internal use)
- ✅ Keep demo mode fields in User model
- ✅ Keep demo service integration
- ❌ Remove `has_access` logic from demo status endpoint

### 2. Restrict Demo Mode to demo@repruv.co.uk
**Goal:** Only our internal demo account can use demo mode

**Implementation:**
```python
# In backend/app/api/v1/endpoints/demo.py
DEMO_ALLOWED_EMAILS = ["demo@repruv.co.uk"]

def check_demo_access(user: User):
    if user.email not in DEMO_ALLOWED_EMAILS:
        raise HTTPException(
            status_code=403,
            detail="Demo mode is restricted to internal testing accounts"
        )
```

**Apply to:**
- `/api/v1/demo/enable` endpoint
- `/api/v1/demo/disable` endpoint
- `/api/v1/demo/status` endpoint (still accessible but returns restricted message)

### 3. Enhance Demo Data Generation
**Goal:** Demo mode should fully simulate real platform integrations with rich, deep data

#### 3.1 Content Generation (Posts/Videos)
**Current:** Basic interaction generation  
**Needed:** Full content pieces with metadata

**Demo Simulator Changes:**
```python
# demo-simulator/app/models/demo_content.py
class DemoContent(Base):
    __tablename__ = "demo_content"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("demo_profiles.user_id"))
    platform = Column(String)  # youtube, instagram, tiktok
    content_type = Column(String)  # video, post, reel, short
    
    # Content metadata
    title = Column(String)
    description = Column(Text)
    thumbnail_url = Column(String)
    video_url = Column(String)
    duration_seconds = Column(Integer)
    
    # Metrics
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    
    # Engagement over time
    hourly_views = Column(JSONB)  # {"hour_0": 1000, "hour_1": 1500, ...}
    daily_views = Column(JSONB)   # {"day_0": 50000, "day_1": 45000, ...}
    
    # Platform-specific
    youtube_watch_time_minutes = Column(Integer)
    youtube_avg_view_duration = Column(Float)
    youtube_ctr = Column(Float)  # Click-through rate
    
    instagram_reach = Column(Integer)
    instagram_impressions = Column(Integer)
    instagram_saves = Column(Integer)
    
    tiktok_completion_rate = Column(Float)
    tiktok_average_watch_time = Column(Float)
    
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Content Generation Strategy:**
- Generate 20-50 pieces of content per platform
- Vary content age (1 day old to 6 months old)
- Realistic view/engagement curves
- Platform-appropriate metadata

#### 3.2 Interaction Generation Enhancement
**Current:** Basic comments  
**Needed:** Rich interactions with context

**Enhancements:**
```python
# demo-simulator/app/models/demo_interaction.py
class DemoInteraction(Base):
    # ... existing fields ...
    
    # New fields for rich interactions
    parent_content_id = Column(String, ForeignKey("demo_content.id"))
    parent_content_title = Column(String)
    parent_content_thumbnail = Column(String)
    
    # Commenter profile
    commenter_avatar_url = Column(String)
    commenter_subscriber_count = Column(Integer)
    commenter_verified = Column(Boolean, default=False)
    
    # Engagement metrics
    comment_likes = Column(Integer, default=0)
    comment_replies_count = Column(Integer, default=0)
    
    # Sentiment & categorization
    sentiment = Column(String)  # positive, negative, neutral, question
    category = Column(String)  # product_question, collaboration, fan_mail, etc.
    
    # Reply tracking
    has_creator_reply = Column(Boolean, default=False)
    creator_reply_text = Column(Text)
    creator_replied_at = Column(DateTime)
```

**Interaction Types to Generate:**
- Product questions
- Collaboration requests
- Fan appreciation
- Technical questions
- Spam/negative (for filtering demos)
- Brand mentions

#### 3.3 Analytics Data
**Needed:** Complete analytics data for all dashboard features

**Metrics to Generate:**
- **Audience Demographics:**
  - Age ranges (13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+)
  - Gender distribution
  - Top countries/cities
  - Device types (mobile, desktop, tablet)

- **Performance Metrics:**
  - Daily/weekly/monthly views
  - Engagement rate trends
  - Subscriber/follower growth
  - Watch time analytics
  - Traffic sources

- **Content Performance:**
  - Top performing videos/posts
  - Best posting times
  - Content type performance
  - Hashtag performance

### 4. Reply Functionality for Demo Interactions
**Goal:** When user replies to a demo interaction, simulate a realistic follow-up

**Implementation:**

**Backend Endpoint:**
```python
# backend/app/api/v1/endpoints/interactions.py
@router.post("/{interaction_id}/reply")
async def reply_to_interaction(
    interaction_id: str,
    reply: ReplyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    # ... existing reply logic ...
    
    # If user is in demo mode, trigger demo service to generate follow-up
    if current_user.demo_mode and current_user.demo_mode_status == 'enabled':
        await trigger_demo_reply_followup(
            user_id=current_user.id,
            interaction_id=interaction_id,
            reply_text=reply.text
        )
```

**Demo Service Endpoint:**
```python
# demo-simulator/app/api/actions.py
@router.post("/reply-followup")
async def generate_reply_followup(
    user_id: str,
    interaction_id: str,
    reply_text: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Generate a realistic follow-up to creator's reply.
    
    Scenarios:
    - Positive reply → Thank you message (30% chance)
    - Question answered → Appreciation (50% chance)
    - Collaboration request → Follow-up question (70% chance)
    - No follow-up (sometimes people don't respond)
    """
    
    # Get original interaction
    interaction = await get_interaction(interaction_id, db)
    
    # Determine if follow-up should occur
    follow_up_chance = calculate_followup_probability(
        interaction.category,
        reply_text
    )
    
    if random.random() < follow_up_chance:
        # Generate contextual follow-up
        followup_text = generate_contextual_followup(
            original_comment=interaction.text,
            creator_reply=reply_text,
            category=interaction.category
        )
        
        # Create new interaction as reply
        await create_demo_interaction(
            user_id=user_id,
            parent_id=interaction_id,
            text=followup_text,
            commenter_name=interaction.author_name,
            is_reply=True
        )
```

### 5. Scheduled Content & Interaction Generation
**Goal:** Continuously generate new content and interactions to simulate active account

**Demo Simulator Tasks:**
```python
# demo-simulator/app/tasks/content_generator.py
@celery.task
def generate_new_content():
    """
    Run every 6-12 hours to generate new posts/videos.
    Simulates regular upload schedule.
    """
    active_profiles = get_active_demo_profiles()
    
    for profile in active_profiles:
        # Determine if new content should be posted
        if should_post_content(profile):
            content = generate_content_piece(
                profile=profile,
                platform=random.choice(['youtube', 'instagram', 'tiktok'])
            )
            
            # Generate initial engagement
            generate_initial_engagement(content)
            
            # Schedule interaction generation
            schedule_interaction_wave(content)

@celery.task
def generate_interaction_wave():
    """
    Run every 15-30 minutes to generate new interactions.
    Simulates ongoing engagement on recent content.
    """
    recent_content = get_recent_demo_content(hours=72)
    
    for content in recent_content:
        # Generate 1-5 new interactions
        interaction_count = weighted_random(
            content.age_hours,
            content.current_engagement
        )
        
        for _ in range(interaction_count):
            generate_realistic_interaction(content)
```

**Celery Beat Schedule:**
```python
# demo-simulator/app/core/celery_config.py
beat_schedule = {
    'generate-new-content': {
        'task': 'app.tasks.content_generator.generate_new_content',
        'schedule': crontab(hour='*/8'),  # Every 8 hours
    },
    'generate-interaction-wave': {
        'task': 'app.tasks.content_generator.generate_interaction_wave',
        'schedule': crontab(minute='*/20'),  # Every 20 minutes
    },
    'update-content-metrics': {
        'task': 'app.tasks.metrics_updater.update_content_metrics',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    },
}
```

---

## Implementation Phases

### Phase 1: Remove User-Facing UI (2-3 hours)
**Priority:** High  
**Files to Modify:**
1. Delete `frontend/app/(dashboard)/settings/demo-mode/page.tsx`
2. Edit `frontend/app/(dashboard)/settings/page.tsx` - Remove demo mode tab
3. Delete `frontend/contexts/DemoModeContext.tsx`
4. Delete `frontend/components/demo/DemoOnboarding.tsx`
5. Delete `frontend/components/demo/DemoBanner.tsx`
6. Delete `frontend/components/shared/DemoBanner.tsx`
7. Edit `frontend/app/(dashboard)/dashboard/page.tsx` - Remove demo banners
8. Search and remove all `useDemoMode()` calls
9. Search and remove all `hasDemoAccess` checks

### Phase 2: Restrict Access (1 hour)
**Priority:** High  
**Files to Modify:**
1. `backend/app/api/v1/endpoints/demo.py` - Add email whitelist
2. `backend/app/core/config.py` - Add DEMO_ALLOWED_EMAILS setting

### Phase 3: Enhance Content Generation (4-6 hours)
**Priority:** Medium  
**Files to Create/Modify:**
1. `demo-simulator/app/models/demo_content.py` - New model
2. `demo-simulator/app/services/content_generator.py` - Content generation logic
3. `demo-simulator/app/services/metadata_generator.py` - Rich metadata
4. `demo-simulator/app/tasks/content_tasks.py` - Scheduled content generation
5. Update `demo-simulator/app/main.py` - Register new models

### Phase 4: Enhance Interaction Generation (3-4 hours)
**Priority:** Medium  
**Files to Modify:**
1. `demo-simulator/app/models/demo_interaction.py` - Add new fields
2. `demo-simulator/app/services/interaction_generator.py` - Enhanced generation
3. `demo-simulator/app/services/ai_text_generator.py` - Better comment text
4. `demo-simulator/app/tasks/interaction_tasks.py` - Scheduled interactions

### Phase 5: Implement Reply Functionality (2-3 hours)
**Priority:** Medium  
**Files to Create/Modify:**
1. `demo-simulator/app/api/actions.py` - Add reply-followup endpoint
2. `demo-simulator/app/services/reply_generator.py` - Contextual replies
3. `backend/app/api/v1/endpoints/interactions.py` - Trigger demo followups
4. `backend/app/services/demo_service.py` - Demo service client

### Phase 6: Analytics Data Generation (3-4 hours)
**Priority:** Low  
**Files to Create/Modify:**
1. `demo-simulator/app/models/demo_analytics.py` - Analytics models
2. `demo-simulator/app/services/analytics_generator.py` - Generate metrics
3. `demo-simulator/app/tasks/analytics_tasks.py` - Update analytics
4. `backend/app/api/v1/endpoints/analytics.py` - Fetch demo analytics

---

## Testing Plan

### 1. Access Control Testing
- ✅ Verify demo@repruv.co.uk can enable demo mode
- ✅ Verify other accounts get 403 error
- ✅ Verify no demo UI visible to regular users

### 2. Content Generation Testing
- ✅ Enable demo mode for demo@repruv.co.uk
- ✅ Verify content pieces are generated
- ✅ Check content has rich metadata
- ✅ Verify metrics are realistic
- ✅ Check content appears in dashboard

### 3. Interaction Testing
- ✅ Verify interactions are generated
- ✅ Check interactions have context (parent content)
- ✅ Verify interaction categories are diverse
- ✅ Test reply functionality
- ✅ Verify follow-up interactions are generated

### 4. Scheduled Tasks Testing
- ✅ Monitor Celery logs for task execution
- ✅ Verify new content appears over time
- ✅ Verify new interactions appear regularly
- ✅ Check metrics update correctly

### 5. Integration Testing
- ✅ Test all dashboard features with demo data
- ✅ Verify analytics show realistic trends
- ✅ Test comment management with demo interactions
- ✅ Verify AI assistant has context from demo data

---

## Rollback Plan

If issues arise:

1. **Frontend:** Revert commits removing demo UI
2. **Backend:** Revert access restrictions
3. **Demo Service:** Revert to previous version via Railway
4. **Database:** Demo service uses `create_all()` - safe to restart

---

## Success Criteria

✅ No demo mode UI visible to users  
✅ Only demo@repruv.co.uk can access demo mode  
✅ Demo mode generates 20+ content pieces per platform  
✅ Demo mode generates 100+ interactions  
✅ Interactions have rich metadata and context  
✅ Reply functionality triggers realistic follow-ups  
✅ New content/interactions generated on schedule  
✅ All dashboard features work with demo data  
✅ Analytics show realistic, time-based trends  
✅ Demo mode fully simulates real platform integrations  

---

## Notes

- Demo service is deployed separately on Railway
- Demo service uses SQLAlchemy `create_all()`, not Alembic
- Backend communicates with demo service via HTTP
- Demo data stored in separate database (demo service DB)
- Main backend fetches demo data when user in demo mode
- Agency account (testagency@repruv.com) doesn't need demo mode
