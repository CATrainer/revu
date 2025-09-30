# Backend Requirements for Robust AI Chat

## Critical Changes Needed for ChatGPT-Level Reliability

### 1. Database Schema Updates

Add to `ai_chat_messages` table:
```sql
ALTER TABLE ai_chat_messages 
ADD COLUMN status VARCHAR(20) DEFAULT 'completed',
ADD COLUMN is_streaming BOOLEAN DEFAULT false,
ADD COLUMN last_updated TIMESTAMP DEFAULT NOW();
```

Status values: `generating`, `completed`, `error`, `cancelled`

### 2. Incremental Message Storage

**Current Problem:** Message only saved after full generation completes
**Required:** Save message immediately, update content as it streams

```python
# In chat endpoint - when starting generation:
message = create_message(
    session_id=session_id,
    role='assistant',
    content='',  # Start empty
    status='generating',
    is_streaming=True
)

# During streaming:
for chunk in stream:
    message.content += chunk
    update_message(message.id, content=message.content, last_updated=now())
    yield chunk

# After completion:
update_message(message.id, status='completed', is_streaming=False)
```

### 3. New API Endpoints

#### GET `/api/v1/chat/messages/{session_id}/status`
Check for actively generating messages:
```json
{
  "has_active_generation": true,
  "generating_message_id": "msg_123",
  "last_updated": "2025-09-30T18:45:00Z"
}
```

#### GET `/api/v1/chat/messages/{message_id}/content`
Get current content of a specific message (for resuming):
```json
{
  "id": "msg_123",
  "content": "partial content so far...",
  "status": "generating",
  "last_updated": "2025-09-30T18:45:00Z"
}
```

#### POST `/api/v1/chat/messages/{message_id}/cancel`
Cancel an ongoing generation gracefully

### 4. Background Task Management

Use Celery task to handle generation:
```python
@celery.task
def generate_ai_response(session_id, user_message_id):
    """Generate AI response - continues even if client disconnects"""
    
    # Create assistant message
    assistant_msg = create_message(
        session_id=session_id,
        role='assistant', 
        content='',
        status='generating'
    )
    
    try:
        # Stream and save incrementally
        for chunk in claude_stream(session_id):
            assistant_msg.content += chunk
            db.session.commit()  # Save each chunk
            
        # Mark complete
        assistant_msg.status = 'completed'
        db.session.commit()
        
    except Exception as e:
        assistant_msg.status = 'error'
        assistant_msg.content += f"\n\n[Error: {str(e)}]"
        db.session.commit()
```

### 5. SSE Improvements

Support reconnection with last event ID:
```python
@app.get("/chat/messages/stream")
async def stream_messages(
    session_id: str,
    last_event_id: Optional[str] = None
):
    """Stream messages, resuming from last_event_id if provided"""
    
    if last_event_id:
        # Resume from where client left off
        pass
    
    # Continue streaming...
```

### 6. Polling Endpoint

For clients that lose streaming connection:
```python
@app.get("/chat/messages/{session_id}/poll")
async def poll_messages(
    session_id: str,
    since: Optional[datetime] = None
):
    """Get all messages since timestamp"""
    messages = get_messages_since(session_id, since)
    return {
        "messages": messages,
        "has_more_generating": any(m.status == 'generating' for m in messages)
    }
```

## Implementation Priority

1. **HIGH**: Incremental message storage (fixes refresh issue)
2. **HIGH**: Status tracking in database
3. **MEDIUM**: Status check endpoint
4. **MEDIUM**: Polling endpoint for recovery
5. **LOW**: Celery background tasks (optimization)

## Testing Scenarios

- [ ] Start generation, refresh page → see partial content
- [ ] Start generation, close tab, reopen → generation continued
- [ ] Network interruption during generation → reconnect and resume
- [ ] Multiple concurrent generations in different sessions
- [ ] Cancel generation mid-stream
