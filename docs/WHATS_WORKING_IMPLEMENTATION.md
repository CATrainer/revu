# "What's Working" Insights Dashboard - Implementation Guide

## Overview

The "What's Working" feature is a comprehensive analytics and insights system that helps content creators understand their performance, discover what resonates with audiences, and create actionable plans for improvement.

## Architecture

### Backend Components

#### 1. Database Models (`backend/app/models/content.py`)

**ContentPiece**
- Stores individual content pieces across platforms (YouTube, Instagram, TikTok)
- Fields: platform, content_type, title, URL, thumbnail, publishing metadata
- Tracks follower count at time of posting for context

**ContentPerformance**
- Performance metrics for each content piece
- Metrics: views, likes, comments, shares, saves, engagement rate
- Video-specific: watch time, retention rate, average view duration
- Calculated fields: performance_score (0-100), percentile_rank, performance_category

**ContentInsight**
- AI-generated insights about content performance
- Types: success_factor, failure_factor, pattern, recommendation
- Impact levels: high, medium, low
- Includes confidence scores and supporting data

**ContentTheme**
- Aggregate performance data by content theme/category
- Automatically calculated metrics for each theme
- Tracks total views, average engagement, performance scores

**ActionPlan**
- User-created or AI-generated action plans
- Links to source content or chat sessions
- Tracks progress, projected vs actual outcomes

**ActionItem**
- Individual tasks within action plans
- Due dates, completion tracking, outcome comparison
- Can link to created content pieces

#### 2. API Endpoints

**Insights Endpoints** (`backend/app/api/v1/endpoints/insights.py`)

```
GET /api/v1/insights/dashboard
- Main dashboard with summary, top performers, themes, platform comparison
- Filters: time_period (7d/30d/90d), platform_filter
- Returns aggregated data with AI insights

GET /api/v1/insights/content/{content_id}
- Detailed view of specific content piece
- Full performance metrics and all insights

GET /api/v1/insights/content
- List content with filters (platform, theme, performance_category)
- Pagination support

GET /api/v1/insights/themes
- All content themes with performance data
```

**Action Plans Endpoints** (`backend/app/api/v1/endpoints/action_plans.py`)

```
POST /api/v1/action-plans
- Create new action plan with items

GET /api/v1/action-plans
- List plans (filter by status)

GET /api/v1/action-plans/{plan_id}
- Get plan details with all action items

PATCH /api/v1/action-plans/{plan_id}
- Update plan (status, outcomes, notes)

DELETE /api/v1/action-plans/{plan_id}
- Delete plan

PATCH /api/v1/action-items/{item_id}/complete
- Mark action item as complete

PATCH /api/v1/action-items/{item_id}/uncomplete
- Mark action item as incomplete
```

**Demo Integration** (`backend/app/api/v1/endpoints/demo.py`)

```
POST /api/v1/demo/content/bulk-create
- Bulk create content from simulator
- Creates ContentPiece, ContentPerformance, ContentInsight records
- Auto-calculates theme aggregates
```

#### 3. Services

**Content Context Service** (`backend/app/services/content_context.py`)

- `get_content_context()` - Provides context for AI chat
- `get_specific_content_context()` - Detailed context about one piece
- `get_general_performance_context()` - Overall performance summary
- `build_chat_system_prompt()` - Enhanced system prompts with content data
- `create_action_plan_from_conversation()` - Generate plans from AI chats

**Insights Generator** (`demo-simulator/app/services/insights_generator.py`)

- `generate_content_titles()` - AI-generated realistic titles
- `generate_content_piece()` - Complete content with metrics and insights
- `generate_content_batch()` - Bulk generation (30-50 pieces)
- Realistic performance distribution (20% top, 60% normal, 20% poor)
- Time-based patterns (optimal posting times, poor times)
- Theme-specific performance characteristics

### Frontend Components

#### 1. Insights Dashboard (`frontend/app/(dashboard)/insights/page.tsx`)

**Features:**
- Summary cards: total content, avg engagement, total views, distribution
- Platform and time period filters
- Four tabs: Top Performers, Needs Attention, Themes, Platform Comparison
- Performance scoring and percentile rankings
- AI insights display with impact levels
- Direct links to content details and AI chat

**Key Interactions:**
- Click content card → view full details
- "Make More Like This" → open AI chat with context
- "Diagnose with AI" → analyze underperforming content
- Theme cards → explore content by category

#### 2. Content Detail View (`frontend/app/(dashboard)/insights/content/[id]/page.tsx`)

**Sections:**
- Header: title, platform, performance badge, publish date
- Thumbnail and summary
- Detailed metrics grid
- Performance score card (0-100)
- "Why It Worked" insights (success factors)
- "Areas for Improvement" insights (failure factors)
- Action buttons: AI chat, compare content, create plan

**Metrics Displayed:**
- Core: views, impressions, likes, comments, shares, saves
- Engagement: engagement rate, retention rate
- Growth: followers gained, profile visits
- Recent: 24h velocity metrics

#### 3. Action Plans (`frontend/app/(dashboard)/action-plans/page.tsx`)

**Features:**
- Tabs: Active, Completed, All Plans
- Plan cards with progress bars and status badges
- Completion tracking (X/Y items)
- Due date warnings (color-coded urgency)
- Detailed plan view dialog

**Plan Detail Dialog:**
- Full action item list with checkboxes
- Toggle completion status
- View due dates and estimated hours
- Track projected vs actual outcomes
- Edit and AI chat integration

## Data Flow

### 1. Content Creation Flow

```
Demo Simulator
  ↓
Generate realistic content (30-50 pieces)
  ↓
POST /api/v1/demo/content/bulk-create
  ↓
Create ContentPiece records
  ↓
Create ContentPerformance records
  ↓
Create ContentInsight records
  ↓
Calculate ContentTheme aggregates
```

### 2. Dashboard View Flow

```
User visits /dashboard/insights
  ↓
Fetch dashboard data with filters
  ↓
Aggregate performance metrics
  ↓
Query top performers & underperformers
  ↓
Calculate theme performance
  ↓
Compare platforms
  ↓
Return formatted data with insights
```

### 3. AI Chat Integration Flow

```
User clicks "Make More Like This"
  ↓
get_content_context(content_id)
  ↓
Build enhanced system prompt
  ↓
Include performance data & insights
  ↓
Start chat session with context
  ↓
AI provides specific recommendations
  ↓
Optionally create action plan
```

### 4. Action Plan Execution Flow

```
AI suggests action plan
  ↓
User approves
  ↓
Create ActionPlan + ActionItems
  ↓
User views in /dashboard/action-plans
  ↓
Complete items (check boxes)
  ↓
Link to created content
  ↓
Track actual vs projected outcomes
  ↓
Mark plan complete
```

## Performance Scoring Algorithm

Content performance is scored relative to the creator's own content:

1. **Collect metrics**: views, engagement rate, retention, etc.
2. **Calculate percentile**: where this content ranks among all creator's content
3. **Assign score**: 0-100 based on multiple factors
4. **Categorize**:
   - Overperforming: score > 75
   - Normal: score 40-75
   - Underperforming: score < 40

## AI Insight Generation

The simulator generates realistic insights based on:

### Success Factors
- **Timing**: Posted at optimal times (Thu 2pm = best)
- **Theme**: Educational content outperforms entertainment
- **Engagement**: High comment/like ratio indicates quality
- **Retention**: >50% retention = strong content

### Failure Factors
- **Poor timing**: Posted late night or early morning
- **Low retention**: <30% suggests weak hook
- **Low engagement**: <2% indicates poor value proposition
- **Topic mismatch**: Content doesn't match audience interests

## Simulator Configuration

### Content Distribution
- 20% overperforming (2-4x normal views, 1.5-2.5x engagement)
- 60% normal (0.8-1.3x normal views, 0.9-1.1x engagement)
- 20% underperforming (0.2-0.5x normal views, 0.4-0.7x engagement)

### Realistic Patterns
- **Optimal posting times**: Mon/Wed/Thu 2-7pm, Sat 10am-3pm
- **Poor times**: Late night (11pm-5am), Sunday evenings
- **Platform differences**: TikTok higher volume, YouTube higher retention
- **Theme performance**: Tutorials > Tips > Reviews > Vlogs

## Testing the Feature

### 1. Enable Demo Mode
```bash
# Enable demo mode for a user
POST /api/v1/demo/enable
{
  "profile_type": "auto",
  "niche": "tech_reviews"
}
```

### 2. Generate Content
The simulator automatically generates 30-50 content pieces with realistic:
- Titles (AI-generated)
- Performance metrics
- AI insights
- Theme distribution
- Platform distribution

### 3. View Dashboard
Navigate to `/dashboard/insights` to see:
- Summary statistics
- Top performers with insights
- Underperforming content
- Theme performance
- Platform comparison

### 4. Explore Content
Click any content piece to view:
- Full performance breakdown
- All AI insights
- Success/failure factors
- Context information

### 5. Create Action Plan
From AI chat or manually:
- Set goals and timeline
- Add action items with due dates
- Track completion
- Compare projected vs actual

## Database Schema

```sql
-- Content Pieces
CREATE TABLE content_pieces (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    platform VARCHAR(32) NOT NULL,
    platform_id VARCHAR(255) UNIQUE NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TIMESTAMP NOT NULL,
    theme VARCHAR(100),
    -- ... additional fields
);

-- Performance Metrics
CREATE TABLE content_performance (
    id UUID PRIMARY KEY,
    content_id UUID UNIQUE REFERENCES content_pieces(id),
    views INTEGER,
    likes INTEGER,
    engagement_rate NUMERIC(5,2),
    performance_score NUMERIC(5,2),
    performance_category VARCHAR(20),
    -- ... additional metrics
);

-- AI Insights
CREATE TABLE content_insights (
    id UUID PRIMARY KEY,
    content_id UUID REFERENCES content_pieces(id),
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact_level VARCHAR(20),
    is_positive BOOLEAN,
    -- ... additional fields
);

-- Action Plans
CREATE TABLE action_plans (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    goal TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    progress_percentage INTEGER DEFAULT 0,
    -- ... additional fields
);

-- Action Items
CREATE TABLE action_items (
    id UUID PRIMARY KEY,
    plan_id UUID REFERENCES action_plans(id),
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP,
    -- ... additional fields
);
```

## API Response Examples

### Dashboard Response
```json
{
  "summary": {
    "total_content": 32,
    "overperforming_count": 6,
    "normal_count": 20,
    "underperforming_count": 6,
    "avg_engagement_rate": 4.2,
    "total_views": 1250000,
    "total_reach": 2100000,
    "engagement_trend": "up"
  },
  "top_performers": [
    {
      "id": "uuid",
      "title": "Complete Guide to...",
      "platform": "youtube",
      "performance": {
        "performance_score": 92.5,
        "percentile_rank": 95,
        "views": 120000,
        "engagement_rate": 7.2
      },
      "insights": [
        {
          "title": "Perfect Timing",
          "description": "Posted Thursday at 2pm...",
          "impact_level": "high",
          "is_positive": true
        }
      ]
    }
  ]
}
```

## Future Enhancements

### Phase 2
- [ ] Real API integrations (YouTube, Instagram, TikTok)
- [ ] Automatic content sync and metric updates
- [ ] Historical trend analysis
- [ ] Competitor comparison
- [ ] Advanced AI recommendations

### Phase 3
- [ ] Revenue tracking per content
- [ ] ROI analysis
- [ ] Content calendar integration
- [ ] Team collaboration features
- [ ] Export reports (PDF, CSV)

### Phase 4
- [ ] Predictive analytics (forecast performance)
- [ ] A/B testing for titles/thumbnails
- [ ] Audience sentiment analysis from comments
- [ ] Automated action plan generation
- [ ] Mobile app support

## Troubleshooting

### Content not showing in dashboard
1. Check user has demo_mode enabled
2. Verify content pieces were created
3. Check performance records exist
4. Ensure published_at dates are within filter range

### Insights not generating
1. Verify ContentInsight records created
2. Check insight categories and types
3. Ensure is_positive field is set correctly

### Action plans not updating
1. Check ActionItem completion endpoint responses
2. Verify plan.progress_percentage recalculation
3. Ensure relationships between plans and items

## Key Files Reference

### Backend
- `backend/app/models/content.py` - Database models
- `backend/app/api/v1/endpoints/insights.py` - Insights API
- `backend/app/api/v1/endpoints/action_plans.py` - Action plans API
- `backend/app/api/v1/endpoints/demo.py` - Demo integration
- `backend/app/services/content_context.py` - AI chat context
- `demo-simulator/app/services/insights_generator.py` - Content generation

### Frontend
- `frontend/app/(dashboard)/insights/page.tsx` - Main dashboard
- `frontend/app/(dashboard)/insights/content/[id]/page.tsx` - Content detail
- `frontend/app/(dashboard)/action-plans/page.tsx` - Action plans

### Documentation
- `docs/WHATS_WORKING_IMPLEMENTATION.md` - This file
