# AI Context System

## Overview

The AI Context System is a revolutionary feature that makes Repruv AI significantly more powerful than generic chatbots like ChatGPT. It automatically extracts and maintains personalized context about each user, allowing the AI assistant to provide tailored, relevant advice without users having to repeatedly explain their situation.

## How It Works

### 1. **Automatic Context Extraction**

The system automatically analyzes data from connected platforms (YouTube, TikTok, etc.) to build a comprehensive profile:

- **Channel Information**: Name, subscriber count, primary platform
- **Content Analysis**: Niche detection, content type (Shorts, Long-form), average video length
- **Performance Metrics**: Average views, engagement rates, growth trends
- **Upload Patterns**: Frequency and consistency analysis
- **Topic Extraction**: Identifies top-performing topics and themes
- **Audience Insights**: Demographics and geographic data

### 2. **User-Provided Context**

Users can enhance the automatic context with their own information:

- **Goals**: Content and growth objectives
- **Target Audience**: Ideal viewer descriptions
- **Brand Voice**: Tone and style preferences
- **Custom Notes**: Any additional context

### 3. **Dynamic System Prompts**

The AI assistant uses this context in every conversation, automatically:

```
System Prompt Enhancement:
"User Context: Channel: TechReviews Pro | Niche: Tech Reviews | Content Type: Long-form |
Upload Schedule: 3x per week | Subscribers: 50,000 | Average Views: 25,000 |
Goals: Reach 100K subscribers in 6 months | Target Audience: Tech enthusiasts 18-34 |
Brand Voice: Casual & Educational"
```

## Architecture

### Backend Components

#### Models (`backend/app/models/ai_context.py`)
- `UserAIContext`: SQLAlchemy model storing all context data
- `to_context_string()`: Formats context for AI system prompts

#### Services (`backend/app/services/context_analyzer.py`)
- `ContextAnalyzer`: Core analysis engine
  - `analyze_youtube_context()`: Extracts insights from YouTube data
  - `_detect_niche()`: NLP-based niche detection
  - `_extract_topics()`: Topic modeling from video titles
  - `_parse_duration()`: ISO 8601 duration parsing
  - `update_user_context()`: Updates/creates user context

#### API Endpoints (`backend/app/api/v1/endpoints/context.py`)
- `GET /ai/context`: Retrieve user's AI context
- `POST /ai/context/refresh`: Re-analyze platforms and update context
- `PUT /ai/context`: Update user-provided fields

#### Chat Integration (`backend/app/api/v1/endpoints/chat.py`)
- Modified `_chat_context()` to include AI context
- System prompts automatically enhanced with user context
- Works for both streaming and non-streaming responses

### Frontend Components

#### Context Editor (`frontend/components/ai/ContextEditor.tsx`)
- Visual context management interface
- Auto-detected information display
- Editable user-provided fields
- Refresh from platforms button
- Real-time updates

#### AI Assistant Page (`frontend/app/(dashboard)/ai-assistant/page.tsx`)
- View toggle between Chat and Context
- Context button in sidebar
- Seamless switching between views

### Database Schema

```sql
CREATE TABLE user_ai_context (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id),
    
    -- Auto-detected
    channel_name VARCHAR(255),
    niche VARCHAR(255),
    content_type VARCHAR(100),
    avg_video_length INTEGER,
    upload_frequency VARCHAR(100),
    primary_platform VARCHAR(50),
    subscriber_count INTEGER,
    avg_views INTEGER,
    top_performing_topics JSONB,
    
    -- User-provided
    goals TEXT,
    target_audience TEXT,
    brand_voice VARCHAR(255),
    custom_notes TEXT,
    
    -- Metadata
    last_auto_update TIMESTAMPTZ,
    last_user_edit TIMESTAMPTZ,
    data_sources JSONB
);
```

## Usage Examples

### Example 1: Content Strategy Advice

**Without Context:**
```
User: "Should I make more shorts?"
AI: "Shorts can be great for growth! They're algorithm-friendly..."
```

**With Context:**
```
User: "Should I make more shorts?"
AI: "Given your current focus on long-form tech reviews (avg 15min) and
strong performance (25K avg views), I'd suggest a hybrid approach:
Keep your 3x/week long-form schedule but add 2-3 shorts per week
repurposing your best long-form content. This maintains your brand
while tapping into Shorts algorithm. Your tech enthusiast audience
(18-34) engages well with both formats."
```

### Example 2: Growth Strategy

**Without Context:**
```
User: "How can I grow faster?"
AI: "Focus on consistency, SEO, thumbnails, and engagement..."
```

**With Context:**
```
User: "How can I grow faster?"
AI: "To hit your 100K subscriber goal in 6 months (you're at 50K now),
let's optimize your current 3x/week schedule. Your Tech Reviews niche is
competitive, but your 25K avg views show strong engagement. I recommend:
1. Double down on your top topics: [extracted topics]
2. Optimize posting times for your audience
3. Create a shorts strategy for discovery
4. Collab with channels in 75K-150K range
This could accelerate you to your goal by Q3."
```

## Benefits

### For Users
- **No Repetition**: Never explain your channel again
- **Relevant Advice**: AI understands your specific situation
- **Personalized Strategies**: Tailored to your niche and goals
- **Time Savings**: Faster, more accurate assistance

### Competitive Advantage
- **vs ChatGPT**: Generic vs deeply personalized
- **vs Other Tools**: Automatic vs manual setup
- **Unique Value**: Context improves over time

## Future Enhancements

1. **Multi-Platform Support**: TikTok, Instagram, Twitter analysis
2. **Competitor Analysis**: Compare with similar channels
3. **Trend Detection**: Identify emerging opportunities in niche
4. **Goal Tracking**: Monitor progress toward stated objectives
5. **Context History**: Track how context evolves over time
6. **Smart Suggestions**: Proactive recommendations based on context
7. **A/B Testing Integration**: Use context to suggest test ideas

## Technical Notes

- **Privacy**: All context stored securely, user-controlled
- **Performance**: Context loaded once per session, cached
- **Accuracy**: Improves with more platform data
- **Maintenance**: Auto-refreshes weekly or on-demand
- **Graceful Degradation**: Works even without context

## API Reference

### Get Context
```typescript
GET /api/v1/ai/context
Response: {
  user_id: string;
  channel_name?: string;
  niche?: string;
  // ... all context fields
}
```

### Refresh Context
```typescript
POST /api/v1/ai/context/refresh
Response: { /* updated context */ }
```

### Update Context
```typescript
PUT /api/v1/ai/context
Body: {
  goals?: string;
  target_audience?: string;
  brand_voice?: string;
  custom_notes?: string;
}
Response: { /* updated context */ }
```

## Implementation Checklist

- [x] Database model and migration
- [x] Context analyzer service
- [x] YouTube data extraction
- [x] Niche detection algorithm
- [x] Topic extraction
- [x] API endpoints
- [x] Chat integration
- [x] Frontend context editor
- [x] View switching UI
- [ ] TikTok integration (future)
- [ ] Instagram integration (future)
- [ ] Trend detection (future)

## Conclusion

The AI Context System transforms Repruv AI from a generic chatbot into a personalized content strategy advisor. By automatically maintaining deep context about each user, we provide significantly more value than competitors while requiring minimal user effort.
