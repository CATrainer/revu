# Demo Mode System - Development Document

**Status:** 🟡 IN PROGRESS  
**Priority:** 🔴 CRITICAL - Product Launch Feature  
**Start Date:** 2025-01-07  
**Target:** Production-Ready Demo Experience

---

## 🎯 **Mission Statement**

Build a rich, realistic demo mode that simulates the full creator experience across YouTube, Instagram, and TikTok. Users should feel like they're managing a real creator account with hundreds of daily interactions.

**Quality Bar:** Must feel indistinguishable from real platform connections.

---

## 📋 **Development Checklist**

### **Phase 1: Infrastructure Setup** ✅ / ⏳ / ❌

- [✅] Create demo-simulator service structure
- [⏳] Set up FastAPI application skeleton
- [✅] Configure Claude API integration
- [✅] Database schema for demo profiles
- [✅] Redis for caching/queuing
- [✅] Celery tasks setup
- [ ] Docker configuration

### **Phase 2: Core Models & Services**

- [✅] DemoProfile model (user config)
- [✅] DemoContent model (videos/posts)
- [✅] DemoInteraction model (comments/DMs)
- [✅] ContentGenerator service (AI-powered)
- [✅] PersonaGenerator service (realistic authors)
- [⏳] SimulationEngine service (orchestration)

### **Phase 3: Platform Simulators**

- [ ] YouTubeSimulator (videos, comments, community posts)
- [ ] InstagramSimulator (posts, stories, comments, DMs)
- [ ] TikTokSimulator (videos, comments, DMs)
- [ ] Engagement pattern algorithms
- [ ] Realistic timing distributions

### **Phase 4: AI Content Generation**

- [ ] Video title generator (niche-aware)
- [ ] Comment generator (sentiment-based)
- [ ] DM generator (type-specific)
- [ ] Author persona generator
- [ ] Content quality validation
- [ ] Variation engine (avoid repetition)

### **Phase 5: Main App Integration**

- [ ] Demo mode flag in User model
- [ ] Platform abstraction layer
- [ ] Demo API client
- [ ] Webhook receiver for demo events
- [ ] UI toggle for demo/real mode
- [ ] Demo profile configuration modal

### **Phase 6: Simulation Scheduling**

- [ ] Content upload scheduler
- [ ] Comment flow scheduler
- [ ] DM arrival scheduler
- [ ] Engagement wave patterns
- [ ] Viral scenario support

### **Phase 7: Testing & Validation**

- [ ] Unit tests for generators
- [ ] Integration tests for simulators
- [ ] End-to-end demo flow test
- [ ] Performance testing
- [ ] Cost monitoring

### **Phase 8: Documentation & Deployment**

- [ ] API documentation
- [ ] Railway deployment guide
- [ ] Environment configuration
- [ ] Cost estimation guide
- [ ] Troubleshooting guide

---

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────┐
│                  Repruv Main App                        │
│  ┌────────────────────────────────────────────┐        │
│  │  PlatformService (Abstraction Layer)       │        │
│  │  - Checks user.demo_mode                   │        │
│  │  - Routes to DemoClient OR RealAPIClient   │        │
│  └────────────────┬───────────────────────────┘        │
│                   │                                      │
│          ┌────────▼────────┐                           │
│          │   Demo Mode?    │                           │
│          └────────┬────────┘                           │
│                   │                                      │
│         ┌─────────┴─────────┐                          │
│         │                   │                          │
│    Real Mode           Demo Mode                       │
│         │                   │                          │
│         │            ┌──────▼──────────────────┐      │
│         │            │  DemoAPIClient           │      │
│         │            │  - HTTP to demo-service  │      │
│         │            └──────┬──────────────────┘      │
└─────────┼───────────────────┼───────────────────────┘
          │                   │
          │                   │ HTTPS
          │                   │
    ┌─────▼─────┐      ┌──────▼────────────────────────┐
    │   Real    │      │  Demo Simulator Service        │
    │ Platform  │      │  (Separate Railway Deploy)     │
    │   APIs    │      │                                │
    └───────────┘      │  ┌─────────────────────────┐  │
                       │  │ FastAPI Application     │  │
                       │  │ - Profile Management    │  │
                       │  │ - Content Generation    │  │
                       │  │ - Event Simulation      │  │
                       │  └─────────────────────────┘  │
                       │                                │
                       │  ┌─────────────────────────┐  │
                       │  │ Claude API Integration  │  │
                       │  │ - Title generation      │  │
                       │  │ - Comment generation    │  │
                       │  │ - DM generation         │  │
                       │  │ - Persona creation      │  │
                       │  └─────────────────────────┘  │
                       │                                │
                       │  ┌─────────────────────────┐  │
                       │  │ Celery Beat             │  │
                       │  │ - Upload content        │  │
                       │  │ - Generate comments     │  │
                       │  │ - Send DMs              │  │
                       │  │ - Simulate engagement   │  │
                       │  └─────────────────────────┘  │
                       │                                │
                       │  ┌─────────────────────────┐  │
                       │  │ PostgreSQL              │  │
                       │  │ - Demo profiles         │  │
                       │  │ - Generated content     │  │
                       │  │ - Interaction queue     │  │
                       │  └─────────────────────────┘  │
                       │                                │
                       │  ┌─────────────────────────┐  │
                       │  │ Redis                   │  │
                       │  │ - Generation cache      │  │
                       │  │ - Rate limiting         │  │
                       │  │ - Task queue            │  │
                       │  └─────────────────────────┘  │
                       └────────────────────────────────┘
```

---

## 📊 **Database Schema**

### **Demo Simulator Service Tables**

```sql
-- Demo user profiles
CREATE TABLE demo_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,  -- Reference to main app user
    profile_type VARCHAR(20),  -- 'auto' or 'manual'
    niche VARCHAR(50),
    personality VARCHAR(50),
    
    -- YouTube config
    yt_subscribers INT,
    yt_avg_views INT,
    yt_engagement_rate DECIMAL(5,4),
    yt_upload_frequency VARCHAR(20),
    
    -- Instagram config
    ig_followers INT,
    ig_avg_likes INT,
    ig_story_views INT,
    
    -- TikTok config
    tt_followers INT,
    tt_avg_views INT,
    
    -- Activity config
    comment_volume VARCHAR(20),  -- low, medium, high, viral
    dm_frequency VARCHAR(20),    -- low, medium, high
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Generated content (videos/posts)
CREATE TABLE demo_content (
    id UUID PRIMARY KEY,
    profile_id UUID REFERENCES demo_profiles(id),
    platform VARCHAR(20),  -- youtube, instagram, tiktok
    content_type VARCHAR(20),  -- video, post, story, reel
    
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    
    -- Engagement metrics
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares INT DEFAULT 0,
    
    published_at TIMESTAMP,
    created_at TIMESTAMP
);

-- Generated interactions (comments/DMs)
CREATE TABLE demo_interactions (
    id UUID PRIMARY KEY,
    profile_id UUID REFERENCES demo_profiles(id),
    content_id UUID REFERENCES demo_content(id),
    
    platform VARCHAR(20),
    interaction_type VARCHAR(20),  -- comment, dm, reply, mention
    
    author_username VARCHAR(100),
    author_display_name VARCHAR(100),
    author_avatar_url TEXT,
    author_verified BOOLEAN,
    author_subscriber_count INT,
    
    content TEXT,
    sentiment VARCHAR(20),  -- positive, negative, neutral
    
    likes INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    
    -- Sending status
    status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    
    created_at TIMESTAMP
);

-- AI generation cache (cost optimization)
CREATE TABLE generation_cache (
    id UUID PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE,
    content_type VARCHAR(50),
    prompt_hash VARCHAR(64),
    generated_content JSONB,
    use_count INT DEFAULT 0,
    created_at TIMESTAMP
);
```

---

## 🎨 **Content Generation Strategy**

### **Niche-Specific Templates**

We'll support these niches with custom content:

1. **Tech Reviews** (gadgets, software, apps)
2. **Gaming** (playthroughs, reviews, tutorials)
3. **Beauty** (makeup, skincare, tutorials)
4. **Fitness** (workouts, nutrition, motivation)
5. **Cooking** (recipes, techniques, reviews)
6. **Travel** (vlogs, guides, tips)
7. **Education** (tutorials, explanations, courses)
8. **Comedy** (sketches, reactions, memes)
9. **Music** (covers, originals, production)
10. **Lifestyle** (vlogs, routines, advice)

### **Comment Sentiment Distribution**

For realistic engagement:
- **Positive:** 65% (love it, great video, subscribed!)
- **Neutral:** 25% (questions, observations, timestamps)
- **Negative:** 10% (criticism, complaints, trolls)

### **DM Type Distribution**

- **Fan Messages:** 40% (compliments, appreciation)
- **Questions:** 30% (support, advice requests)
- **Collaboration:** 15% (brand deals, partnerships)
- **Spam:** 10% (promotions, scams)
- **Criticism:** 5% (complaints, issues)

---

## 💰 **Cost Estimation**

### **Claude API Pricing**
- Input: $3 per million tokens (~$0.003 per 1K tokens)
- Output: $15 per million tokens (~$0.015 per 1K tokens)

### **Daily Demo Profile Cost**

**Assumptions:**
- 3 videos/day (YouTube)
- 2 posts/day (Instagram)  
- 5 videos/day (TikTok)
- 500 comments/day (across all platforms)
- 20 DMs/day

**Calculation:**
```
Content Generation:
- 10 titles/day × 50 tokens × $0.015 = $0.0075
- 10 descriptions × 100 tokens × $0.015 = $0.015

Comment Generation:
- 500 comments × 75 tokens avg × $0.015 = $0.5625

DM Generation:
- 20 DMs × 150 tokens × $0.015 = $0.045

Persona Generation:
- 100 unique authors × 50 tokens × $0.015 = $0.075

Total: ~$0.70/day per demo profile
```

**Monthly:** ~$21/profile  
**With caching/optimization:** ~$10-15/profile/month

---

## 🔐 **Security Considerations**

1. **API Key Protection**
   - Demo service has own Claude API key
   - Never exposed to frontend
   - Rate limiting per demo profile

2. **User Isolation**
   - Demo profiles completely isolated
   - Can't access other users' demo data
   - Automatic cleanup after 30 days inactive

3. **Resource Limits**
   - Max 1 active demo profile per user
   - Max 1000 interactions/day per profile
   - Auto-pause if limits exceeded

4. **Data Validation**
   - All generated content sanitized
   - No PII in generated data
   - Content quality checks

---

## 🚀 **Deployment Architecture**

### **Railway Services**

1. **Main App (Existing)**
   - No changes to deployment
   - Add DEMO_SERVICE_URL env var

2. **Demo Simulator (NEW)**
   - FastAPI web server
   - Celery worker
   - Celery beat scheduler
   - Shared PostgreSQL
   - Shared Redis

### **Environment Variables**

```bash
# Demo Simulator Service
CLAUDE_API_KEY=sk-ant-...
MAIN_APP_URL=https://api.repruv.com
MAIN_APP_WEBHOOK_SECRET=...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
DEMO_MODE_ENABLED=true
MAX_DEMO_PROFILES_PER_USER=1
```

---

## 📝 **Implementation Notes**

### **Patterns to Follow**

1. **Graceful Degradation**
   - If demo service down, show error but don't break app
   - Main app works 100% without demo mode

2. **Idempotency**
   - All webhook events have unique IDs
   - Main app handles duplicate events gracefully

3. **Observability**
   - Comprehensive logging
   - Metrics for generation success/failure
   - Cost tracking per profile

4. **Testing**
   - Mock Claude API in tests
   - Fixture data for common scenarios
   - Performance benchmarks

---

## 📚 **Files to Create**

### **Demo Simulator Service**

```
demo-simulator/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI app
│   ├── core/
│   │   ├── config.py                # Settings
│   │   ├── database.py              # DB setup
│   │   ├── celery_app.py            # Celery config
│   │   └── deps.py                  # Dependencies
│   ├── models/
│   │   ├── demo_profile.py          # Profile model
│   │   ├── demo_content.py          # Content model
│   │   └── demo_interaction.py      # Interaction model
│   ├── services/
│   │   ├── content_generator.py     # AI content gen
│   │   ├── persona_generator.py     # AI persona gen
│   │   ├── simulation_engine.py     # Orchestration
│   │   └── webhook_sender.py        # Send to main app
│   ├── simulators/
│   │   ├── youtube_simulator.py     # YT-specific logic
│   │   ├── instagram_simulator.py   # IG-specific logic
│   │   └── tiktok_simulator.py      # TT-specific logic
│   ├── tasks/
│   │   ├── content_tasks.py         # Upload content
│   │   ├── interaction_tasks.py     # Generate interactions
│   │   └── cleanup_tasks.py         # Maintenance
│   └── api/
│       └── endpoints/
│           ├── profiles.py          # Profile CRUD
│           ├── content.py           # Content endpoints
│           └── simulation.py        # Trigger sim
├── alembic/                         # DB migrations
├── requirements.txt
├── Dockerfile
└── README.md
```

### **Main App Changes**

```
backend/app/
├── models/
│   └── user.py                      # Add demo_mode field
├── services/
│   ├── platform_service.py          # NEW: Abstraction layer
│   └── demo_api_client.py           # NEW: Demo API client
└── api/v1/endpoints/
    ├── demo.py                      # NEW: Demo endpoints
    └── webhooks.py                  # Add demo webhook receiver

frontend/app/(dashboard)/
├── components/
│   └── DemoModeToggle.tsx           # NEW: Toggle component
├── settings/
│   └── demo-config/
│       └── page.tsx                 # NEW: Demo config page
└── dashboard/
    └── page.tsx                     # Add demo mode indicator
```

---

## ✅ **Success Criteria**

1. **Realism:** Demo feels like managing 100K+ subscriber account
2. **Variety:** No repeated content, diverse interactions
3. **Performance:** Events arrive in real-time
4. **Stability:** Zero impact on existing real mode
5. **Cost:** Under $20/month per demo profile
6. **UX:** One-click setup, seamless experience

---

## 🐛 **Testing Checklist**

- [ ] Generate 1000 comments - all unique
- [ ] Simulate 24 hours - timing feels natural
- [ ] Switch demo/real mode - no data leak
- [ ] Delete demo profile - complete cleanup
- [ ] Concurrent demo users - no conflicts
- [ ] Demo service offline - graceful degradation
- [ ] Cost monitoring - stays under budget
- [ ] Webhook delivery - 100% success rate

---

## 📖 **Progress Log**

### 2025-01-07 23:10
- **Status:** Starting development
- **Phase:** Documentation & Planning
- **Next:** Create demo-simulator service structure

---

**End of Dev Doc - Will update as we build**
