# Credit Tracking System

## Overview

The credit tracking system monitors and quantifies user resource usage across the Repruv platform. All actions that incur costs (AI API calls, compute, platform features) are tracked and converted to credits.

**Key Principle:** 1 credit = $0.10 of actual cost to us

## System Architecture

### Components

1. **Database Models** (`app/models/credit_usage.py`)
   - `CreditUsageEvent` - Individual usage events with full details
   - `UserCreditBalance` - Cached balance per user for fast lookups
   - `CreditActionCost` - Configuration for base costs per action

2. **Credit Service** (`app/services/credit_service.py`)
   - Core business logic for calculations
   - Balance management
   - Cost calculations (AI tokens + compute + base)

3. **Async Tracking** (`app/tasks/credit_tasks.py`)
   - Celery tasks for background processing
   - Non-blocking - doesn't slow down API requests

4. **Utilities** (`app/utils/credit_tracking.py`)
   - Decorators for easy tracking
   - Helper functions for common scenarios
   - Predefined costs for Celery tasks

5. **API Endpoints** (`app/api/v1/endpoints/credits.py`)
   - Get balance
   - Get usage stats
   - Estimate costs (for future UI)

## Cost Model

### Formula
```
Total Credits = (AI Cost + Base Cost + Compute Cost) × 10
```

Where:
- **AI Cost**: Calculated from actual token usage
  - Claude: $3/M input tokens, $15/M output tokens
  - GPT-4: $2.50/M input tokens, $10/M output tokens
- **Base Cost**: Fixed cost per action type (configured in DB)
- **Compute Cost**: Estimated compute resources (configured in DB)

### Examples

**AI Chat Message (50K input, 10K output tokens):**
```
AI Cost = (50,000/1M × $3) + (10,000/1M × $15) = $0.15 + $0.15 = $0.30
Credits = $0.30 × 10 = 3.0 credits
```

**Workflow Execution (no AI):**
```
Base Cost = $0.0
Compute Cost = $0.0001
Total = $0.0001 × 10 = 0.001 credits (0.1% of a credit)
```

**YouTube Sync:**
```
Base Cost = $0.0001 (API call)
Compute Cost = $0.0004 (processing)
Total = $0.0005 × 10 = 0.005 credits (0.5% of a credit)
```

## Credit Lifecycle

### Monthly Allowance
- All users get **100 free credits per month**
- Credits reset on signup anniversary (30 days after last reset)
- Unused credits don't roll over

### Future Plans
- **Pro Tier**: 100 base + 100 bonus = 200 credits/month
- **Pro+ Tier**: 1,000 credits/month included
- **Credit Purchases**: $20 per 100 additional credits

### Demo Mode
- **Demo mode users are NOT tracked** - completely excluded
- When `user.demo_mode == True`, tracking functions return early
- Demo mode will be removed eventually

## Usage Guide

### 1. Tracking AI Operations

When making AI API calls:

```python
from app.utils.credit_tracking import track_ai_usage
from app.models.credit_usage import ActionType

# After making Claude API call
response = await anthropic.messages.create(...)

await track_ai_usage(
    user_id=current_user.id,
    action_type=ActionType.AI_CHAT_MESSAGE,
    input_tokens=response.usage.input_tokens,
    output_tokens=response.usage.output_tokens,
    model="claude-3-5-sonnet",
    description="AI assistant chat response",
    resource_id=str(session_id),
    resource_type="chat_session"
)
```

### 2. Tracking Compute Operations

For Celery tasks and background jobs:

```python
from app.utils.credit_tracking import track_compute_usage, get_task_credit_cost
from app.models.credit_usage import ActionType

# In a Celery task
@celery_app.task
async def execute_workflow(workflow_id: str, user_id: str):
    # ... workflow execution logic ...
    
    # Track at the end
    await track_compute_usage(
        user_id=UUID(user_id),
        action_type=ActionType.WORKFLOW_EXECUTION,
        credits=get_task_credit_cost("workflow_execution"),  # 0.001 credits
        description="Workflow execution",
        resource_id=workflow_id,
        resource_type="workflow"
    )
```

### 3. Using Decorators (Easy Mode)

For simple functions:

```python
from app.utils.credit_tracking import track_credits
from app.models.credit_usage import ActionType

@track_credits(
    action_type=ActionType.ANALYTICS_GENERATION,
    manual_credits=0.002,
    description="Generate analytics report"
)
async def generate_analytics(user_id: UUID):
    # Function logic
    # Credits automatically tracked in background
    pass
```

### 4. Manual Tracking with Service

For complex scenarios:

```python
from app.services.credit_service import CreditService
from app.models.credit_usage import ActionType

async def my_function(db: AsyncSession, user_id: UUID):
    service = CreditService(db)
    
    # Track with full control
    event = await service.track_usage(
        user_id=user_id,
        action_type=ActionType.EXTERNAL_API_CALL,
        description="Custom operation",
        manual_credits=0.005,
        metadata={"custom_field": "value"}
    )
```

## Action Types

Defined in `ActionType` enum:

### AI Operations
- `AI_CHAT_MESSAGE` - Chat assistant messages
- `AI_COMMENT_RESPONSE` - Auto-generated comment responses
- `AI_SENTIMENT_ANALYSIS` - Sentiment analysis
- `AI_CONTENT_SUGGESTION` - Content suggestions

### Automation
- `WORKFLOW_EXECUTION` - Workflow runs
- `SCHEDULED_TASK` - Scheduled task execution
- `BULK_OPERATION` - Bulk operations

### Platform Features
- `YOUTUBE_SYNC` - YouTube data sync
- `COMMENT_FETCH` - Fetch comments
- `VIDEO_ANALYSIS` - Video analysis
- `ANALYTICS_GENERATION` - Analytics generation

### External
- `EXTERNAL_API_CALL` - General external API calls

## Database Schema

### credit_usage_events
```sql
id, user_id, action_type, description,
credits_charged, base_cost, api_cost, compute_cost,
input_tokens, output_tokens, model_used,
resource_id, resource_type, metadata,
created_at
```

### user_credit_balances
```sql
id, user_id,
current_balance, total_earned, total_consumed,
monthly_allowance, month_start_balance, current_month_consumed,
last_reset_at, next_reset_at,
is_unlimited, low_balance_notified,
created_at, updated_at
```

### credit_action_costs
```sql
id, action_type,
base_cost_dollars, compute_cost_dollars,
description, is_active,
created_at, updated_at
```

## Integration Checklist

To integrate credit tracking into a new feature:

1. [ ] Identify the action type (use existing or add new to enum)
2. [ ] Determine if it's AI, compute, or platform operation
3. [ ] For AI: Track with `track_ai_usage()` after API call
4. [ ] For compute: Track with `track_compute_usage()` with predefined cost
5. [ ] For simple cases: Use `@track_credits` decorator
6. [ ] Ensure demo mode users are excluded (handled automatically)
7. [ ] Test that tracking happens asynchronously (non-blocking)

## Monitoring & Maintenance

### Adjusting Costs

Update costs in database:

```sql
UPDATE credit_action_costs 
SET compute_cost_dollars = 0.001 
WHERE action_type = 'workflow_execution';
```

### Checking User Balance

```sql
SELECT 
    u.email,
    cb.current_balance,
    cb.current_month_consumed,
    cb.next_reset_at
FROM user_credit_balances cb
JOIN users u ON u.id = cb.user_id
WHERE cb.current_balance < 10
ORDER BY cb.current_balance ASC;
```

### Usage Reports

```sql
-- Credits by action type (last 30 days)
SELECT 
    action_type,
    COUNT(*) as event_count,
    SUM(credits_charged) as total_credits,
    AVG(credits_charged) as avg_credits
FROM credit_usage_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY action_type
ORDER BY total_credits DESC;
```

## API Endpoints (Future UI)

### Get Balance
```
GET /api/v1/credits/balance
```

### Get Usage Stats
```
GET /api/v1/credits/usage?days=30
```

### Estimate AI Cost
```
GET /api/v1/credits/estimate-ai-cost?input_tokens=1000&output_tokens=500&model=claude
```

## Performance Considerations

- **Async by default**: All tracking uses Celery tasks (non-blocking)
- **Cached balances**: User balances cached in separate table
- **Indexes**: All lookup queries optimized with indexes
- **Batch writes**: Events batched by Celery queue
- **Redis caching**: Can cache balance lookups (future optimization)

## Future Enhancements

1. **Real-time balance checks** before expensive operations
2. **Credit purchase system** (Stripe integration)
3. **Usage alerts** (email when < 20% remaining)
4. **Usage projections** ("At this rate, you'll run out in X days")
5. **Detailed breakdowns** in user UI (charts, graphs)
6. **Organization-level credits** (share across team)
7. **Credit gifting** (transfer between users)
8. **API rate limiting** based on credit balance

## Testing

The system is designed to run silently in the background. Initial deployment will:
- ✅ Track all usage invisibly
- ✅ Not show anything to users
- ✅ Accumulate data for future analysis
- ✅ Allow us to validate costs before charging

Once validated, we can:
1. Enable UI visibility
2. Implement hard limits
3. Add payment integration
4. Launch pricing tiers
