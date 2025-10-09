# Credit Tracking Integration Example

## Example: Integrating into Chat Endpoint

Here's how to add credit tracking to your existing Claude chat endpoint:

### Before (chat.py - line ~895):
```python
response = client.messages.create(
    model=model,
    max_tokens=int(os.getenv("CLAUDE_MAX_TOKENS", "1024")),
    system=system_prompt,
    messages=conversation_history,
    stream=True,
    temperature=0.7,
)
```

### After (with credit tracking):
```python
# At top of file, add imports:
from app.utils.credit_tracking import track_ai_usage
from app.models.credit_usage import ActionType

# In the streaming response function:
response = client.messages.create(
    model=model,
    max_tokens=int(os.getenv("CLAUDE_MAX_TOKENS", "1024")),
    system=system_prompt,
    messages=conversation_history,
    stream=True,
    temperature=0.7,
)

# Track token usage after streaming completes
total_input_tokens = 0
total_output_tokens = 0

async def generate():
    nonlocal total_input_tokens, total_output_tokens
    
    for event in response:
        # ... existing streaming logic ...
        
        # Capture usage from events
        if hasattr(event, 'usage'):
            if hasattr(event.usage, 'input_tokens'):
                total_input_tokens = event.usage.input_tokens
            if hasattr(event.usage, 'output_tokens'):
                total_output_tokens = event.usage.output_tokens
    
    # After streaming completes, track credit usage
    if total_input_tokens > 0 or total_output_tokens > 0:
        await track_ai_usage(
            user_id=current_user.id,
            action_type=ActionType.AI_CHAT_MESSAGE,
            input_tokens=total_input_tokens,
            output_tokens=total_output_tokens,
            model=model,
            description=f"AI chat message",
            resource_id=str(request.session_id),
            resource_type="chat_session"
        )

return StreamingResponse(generate(), media_type="text/event-stream")
```

## Example: Workflow Execution Celery Task

### Before:
```python
@celery_app.task(name="execute_workflow")
async def execute_workflow_task(workflow_id: str, user_id: str):
    # ... workflow execution logic ...
    return {"status": "completed"}
```

### After:
```python
from app.utils.credit_tracking import track_compute_usage, get_task_credit_cost
from app.models.credit_usage import ActionType
from uuid import UUID

@celery_app.task(name="execute_workflow")
async def execute_workflow_task(workflow_id: str, user_id: str):
    # ... workflow execution logic ...
    
    # Track at the end
    await track_compute_usage(
        user_id=UUID(user_id),
        action_type=ActionType.WORKFLOW_EXECUTION,
        credits=get_task_credit_cost("workflow_execution"),  # 0.001 credits
        description="Automated workflow execution",
        resource_id=workflow_id,
        resource_type="workflow"
    )
    
    return {"status": "completed"}
```

## Example: YouTube Sync Operation

```python
from app.utils.credit_tracking import track_compute_usage
from app.models.credit_usage import ActionType

async def sync_youtube_data(connection_id: str, user_id: UUID, db: AsyncSession):
    # ... YouTube API calls and processing ...
    videos_synced = 50
    comments_synced = 200
    
    # Track credit usage
    await track_compute_usage(
        user_id=user_id,
        action_type=ActionType.YOUTUBE_SYNC,
        credits=0.005,  # 0.5% of a credit (from predefined config)
        description=f"Synced {videos_synced} videos, {comments_synced} comments",
        resource_id=connection_id,
        resource_type="youtube_connection",
        metadata={
            "videos_synced": videos_synced,
            "comments_synced": comments_synced
        }
    )
```

## Example: Analytics Generation

```python
from app.utils.credit_tracking import track_credits
from app.models.credit_usage import ActionType

@track_credits(
    action_type=ActionType.ANALYTICS_GENERATION,
    manual_credits=0.002,
    description="Generate analytics dashboard data"
)
async def generate_analytics_report(user_id: UUID, timeframe: str):
    # Function automatically tracked when it runs
    # Just add the decorator and it handles everything
    
    # ... analytics generation logic ...
    
    return report_data
```

## Quick Start Integration Steps

1. **Identify where to add tracking** - Look for:
   - AI API calls (Claude, GPT-4)
   - Celery tasks
   - External API calls (YouTube, etc.)
   - Compute-intensive operations

2. **Choose tracking method:**
   - AI operations → `track_ai_usage()`
   - Compute operations → `track_compute_usage()`
   - Simple functions → `@track_credits` decorator

3. **Add tracking code** - Always async, always after the operation completes

4. **Test** - Verify tracking happens in background (check Celery logs)

## Common Patterns

### Pattern 1: AI with Streaming
```python
# Accumulate tokens during stream
tokens_used = {"input": 0, "output": 0}

async def stream_generator():
    for chunk in ai_response:
        # ... yield chunks ...
        if hasattr(chunk, 'usage'):
            tokens_used["input"] = chunk.usage.input_tokens
            tokens_used["output"] = chunk.usage.output_tokens
    
    # Track after stream completes
    if tokens_used["input"] > 0:
        await track_ai_usage(user_id, ActionType.AI_CHAT_MESSAGE, ...)
```

### Pattern 2: Bulk Operations
```python
# Track once for entire bulk operation
async def bulk_process_comments(user_id: UUID, comment_ids: List[str]):
    for comment_id in comment_ids:
        # ... process each comment ...
        pass
    
    # Single tracking call for the batch
    await track_compute_usage(
        user_id=user_id,
        action_type=ActionType.BULK_OPERATION,
        credits=0.01,  # 1% of credit for bulk op
        description=f"Bulk processed {len(comment_ids)} comments"
    )
```

### Pattern 3: Conditional AI Usage
```python
async def smart_response(user_id: UUID, message: str):
    # Check if AI is needed
    if needs_ai_response(message):
        response = await call_claude_api(message)
        
        # Track AI usage
        await track_ai_usage(
            user_id=user_id,
            action_type=ActionType.AI_COMMENT_RESPONSE,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            model="claude-3-5-sonnet"
        )
    else:
        # Template response - no cost
        response = get_template_response(message)
```

## Testing Credit Tracking

### Verify It's Working:
```sql
-- Check recent events
SELECT 
    u.email,
    ce.action_type,
    ce.credits_charged,
    ce.description,
    ce.created_at
FROM credit_usage_events ce
JOIN users u ON u.id = ce.user_id
ORDER BY ce.created_at DESC
LIMIT 20;

-- Check user balance
SELECT 
    u.email,
    cb.current_balance,
    cb.current_month_consumed
FROM user_credit_balances cb
JOIN users u ON u.id = cb.user_id;
```

### Debug Issues:
```python
# Add logging to verify tracking
import logging
logger = logging.getLogger(__name__)

logger.info(f"Tracking credit usage for user {user_id}: {credits} credits")
await track_compute_usage(...)
logger.info("Credit tracking queued successfully")
```

## Performance Notes

- All tracking is **async via Celery** - won't slow down your API
- Failed tracking won't break your app (try/catch in tasks)
- Database writes are batched by Celery queue
- Balance lookups can be cached if needed (future optimization)

## Next Steps

1. Run the migration: `python -m alembic upgrade head` or execute the SQL file
2. Add tracking to your most expensive operations first (AI calls)
3. Monitor for a week to validate cost calculations
4. Adjust costs in `credit_action_costs` table if needed
5. Eventually expose to users via UI
