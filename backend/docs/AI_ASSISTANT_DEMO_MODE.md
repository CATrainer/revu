# AI Assistant Demo Mode Integration

## Overview

The AI Assistant now has direct access to demo mode data, enabling full-featured demonstrations of the platform's capabilities with realistic channel data and metrics.

## Implementation

### 1. Demo Profile Context (`_get_demo_profile_context`)

Fetches and formats channel metadata when user is in demo mode:

**Data Sources:**
- Demo service API (if available) - provides channel profile
- Database demo statistics - content pieces, interactions, fans

**Context Provided:**
```
🎬 DEMO MODE - Channel Profile:
Channel: [Channel Name]
Niche: [Content Niche]

Platform Stats:
- YouTube: X subscribers, Y avg views
- Instagram: X followers
- TikTok: X followers

Demo Data Available:
- N content pieces with performance metrics
- M interactions (comments, DMs)
- K fan profiles

⚡ You have full access to this demo data. Use it to showcase features and provide detailed, data-driven insights!
```

### 2. Enhanced Performance Context (`_get_performance_context`)

Updated to work with both demo and real data:

**Demo Mode:**
- Queries `content_pieces` and `content_performance` tables with `is_demo = true`
- Provides platform-specific performance summaries
- Shows top performing content from demo data

**Real Mode:**
- Uses `user_content_performance` table (legacy structure)
- Maintains backward compatibility

**Context Provided:**
```
📊 Recent Content Performance (Demo Data):
- Platform: X videos, Y% avg engagement, Z total views

Top Performing Content:
- "Video Title..." (engagement%, views)

Use this demo data to provide personalized, data-driven recommendations and showcase platform capabilities.
```

### 3. System Prompt Integration

Demo context is automatically injected into the AI system prompt in three locations:

1. **Main `/messages` endpoint** (line 965-968)
2. **Legacy non-streaming path** (line 1062-1065)  
3. **Legacy streaming path** (line 1129-1132)

The context is added before performance metrics and RAG context, ensuring the AI is aware of demo mode status.

## Demo Data Tables

Demo data is marked with `is_demo = true` flag in:

- **content_pieces** - Social media content with metadata
- **content_performance** - Views, engagement, metrics
- **content_insights** - AI-generated performance insights
- **interactions** - Comments, DMs, mentions
- **fans** - Audience profiles

## Usage Example

When a user enables demo mode and asks the AI Assistant:

**User:** "How's my content performing?"

**AI Response (with demo context):**
```
Based on your demo data, you're doing great! Here's what I see:

📊 Your Recent Performance:
- YouTube: 15 videos, 8.5% avg engagement, 750,000 total views
- Instagram: 12 posts, 12.3% engagement
- TikTok: 20 videos, 15.8% engagement

Your top performing video "5 Tips for Better Thumbnails..." 
has 12.5% engagement with 85,000 views - that's excellent!

I can help you analyze specific content, find patterns in what's 
working, or create an action plan to replicate this success.
```

## Benefits

1. **Full Feature Showcase** - AI can reference real metrics and data points
2. **Realistic Demonstrations** - Potential customers see actual AI capabilities
3. **Channel Context** - AI knows the niche, platform stats, and audience size
4. **Data-Driven Insights** - Can analyze performance trends and make recommendations
5. **Seamless Experience** - Demo mode is transparent to the AI, it just works

## Configuration

**Environment Variables:**
- `DEMO_SERVICE_URL` - Optional URL to demo profile service for rich metadata
- If not configured, falls back to hardcoded demo profile data

**Database Requirements:**
- Demo data must have `is_demo = true` flag set
- Content pieces should have associated performance metrics
- Interactions and fan data should be populated

## Testing

To test the integration:

1. Enable demo mode for a test user
2. Populate demo data via `/demo/content/bulk-create` endpoint
3. Open AI Assistant and ask about content performance
4. Verify AI references demo channel metadata and statistics
5. Test specific queries about content, audience, or strategies

## Future Enhancements

Potential additions:
- **Audience Demographics** - Age, location, interests from demo fan data
- **Engagement Trends** - Time-series analysis of demo content performance  
- **Competitor Context** - Simulated competitor data for benchmarking
- **Revenue Metrics** - Demo monetization data for creator economy insights
- **Automation Triggers** - AI awareness of workflow automations in demo mode
