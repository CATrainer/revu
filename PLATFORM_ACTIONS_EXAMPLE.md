# Platform Actions - Usage Examples

This shows how to use the platform-agnostic action service.

**KEY PRINCIPLE:** The same code works for demo AND real platforms!

---

## Example 1: Reply to Interaction Endpoint

```python
# backend/app/api/v1/endpoints/interactions.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.interaction import Interaction
from app.services.platform_actions import get_platform_action_service

router = APIRouter()


@router.post("/interactions/{interaction_id}/reply")
async def reply_to_interaction(
    interaction_id: UUID,
    reply_text: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Reply to any interaction (demo or real platform).
    
    This endpoint works IDENTICALLY for:
    - Demo interactions
    - YouTube comments
    - Instagram comments
    - TikTok comments
    
    The user doesn't need to know which platform they're using!
    """
    
    # 1. Fetch interaction
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction:
        raise HTTPException(404, "Interaction not found")
    
    if interaction.user_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    
    # 2. Get platform action service (singleton)
    platform_service = get_platform_action_service()
    
    # 3. Send reply - THIS WORKS FOR ANY PLATFORM!
    result = await platform_service.send_reply(
        interaction,
        reply_text,
        session
    )
    
    # 4. Return result
    if result["success"]:
        return {
            "status": "success",
            "reply_id": result.get("reply_id"),
            "message": "Reply sent successfully"
        }
    else:
        raise HTTPException(500, f"Failed to send reply: {result.get('error')}")
```

**What happens behind the scenes:**

- **Demo mode:** Calls demo-simulator REST API → Generates follow-up (natural!)
- **YouTube:** Calls Google API → Posts comment reply
- **Instagram:** Calls Meta Graph API → Posts comment reply
- **TikTok:** Calls TikTok API → Posts comment reply

**Your application code doesn't change!** ✅

---

## Example 2: Delete Interaction

```python
@router.delete("/interactions/{interaction_id}")
async def delete_interaction(
    interaction_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete interaction from any platform."""
    
    interaction = await session.get(Interaction, interaction_id)
    
    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(404, "Interaction not found")
    
    # Delete from platform (demo or real)
    platform_service = get_platform_action_service()
    result = await platform_service.delete_interaction(interaction, session)
    
    if result["success"]:
        # Also delete from local database
        await session.delete(interaction)
        await session.commit()
        return {"status": "deleted"}
    else:
        raise HTTPException(500, f"Failed to delete: {result.get('error')}")
```

---

## Example 3: Workflow Auto-Reply

```python
# backend/app/services/workflow_executor.py

async def execute_reply_action(
    interaction: Interaction,
    template: str,
    session: AsyncSession
):
    """
    Execute auto-reply workflow action.
    
    Works identically for demo and real platforms!
    """
    
    # Generate personalized reply
    reply_text = await generate_reply_from_template(template, interaction)
    
    # Send via platform (demo or real)
    platform_service = get_platform_action_service()
    result = await platform_service.send_reply(interaction, reply_text, session)
    
    if result["success"]:
        logger.info(f"✅ Workflow auto-reply sent to {interaction.platform}")
    else:
        logger.error(f"❌ Workflow auto-reply failed: {result.get('error')}")
    
    return result
```

**Testing workflow in demo mode = validating it works in production!**

---

## Example 4: Batch Actions

```python
@router.post("/interactions/bulk-reply")
async def bulk_reply(
    interaction_ids: List[UUID],
    reply_template: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Send the same reply to multiple interactions."""
    
    platform_service = get_platform_action_service()
    
    results = []
    for interaction_id in interaction_ids:
        interaction = await session.get(Interaction, interaction_id)
        
        if interaction and interaction.user_id == current_user.id:
            result = await platform_service.send_reply(
                interaction,
                reply_template,
                session
            )
            results.append({
                "interaction_id": str(interaction_id),
                "success": result["success"]
            })
    
    return {"results": results}
```

**Works for mix of demo and real interactions in same batch!**

---

## Key Benefits

### ✅ **For Development**
- Test features in demo mode
- Know they'll work identically in production
- No mocking needed - real flow end-to-end

### ✅ **For Production**
- Add new platforms without changing application code
- Just implement new `PlatformActionProvider`
- Existing features work automatically

### ✅ **For Maintenance**
- Single place to update action logic
- Easy to add retry logic, rate limiting, etc.
- Clear separation of concerns

---

## Architecture Flow

```
┌─────────────────────────────────────┐
│   Main Application Code             │
│   (Interactions endpoints, workflows)│
│   ↓                                  │
│   platform_service.send_reply()     │  ← SAME CODE FOR ALL
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   PlatformActionService              │
│   (Routes based on is_demo/platform)│
└─────────────────────────────────────┘
            ↓
    ┌───────┴───────┐
    ↓               ↓
┌─────────┐   ┌──────────┐
│  Demo   │   │  YouTube │
│Provider │   │ Provider │
└─────────┘   └──────────┘
    ↓               ↓
┌─────────┐   ┌──────────┐
│Demo API │   │Google API│
└─────────┘   └──────────┘
```

**Application code never knows which provider is being used!**

---

## Adding a New Platform (Easy!)

To add Instagram support:

1. Create `InstagramActionProvider` implementing `PlatformActionProvider`
2. Register it in `PlatformActionService._get_provider()`
3. **That's it!** All existing code works automatically.

No changes needed to:
- ❌ Interactions endpoints
- ❌ Workflow execution
- ❌ Batch operations
- ❌ Any application logic

---

## Testing Strategy

**Demo mode IS your integration test environment:**

1. **Write endpoint** (e.g., bulk delete)
2. **Test in demo mode** → See it work
3. **Deploy to production** → Works with real platforms

**Same code, different provider.** Perfect abstraction! ✅

---

## Configuration

```python
# backend/.env

# Demo service URL
DEMO_SERVICE_URL=http://demo-simulator:8001

# Real platform credentials
YOUTUBE_API_KEY=...
INSTAGRAM_ACCESS_TOKEN=...
```

The service routes automatically based on `interaction.is_demo`.

---

## Error Handling

All providers return consistent format:

```python
{
    "success": bool,
    "reply_id": str,  # Optional
    "error": str,     # Optional
    "fallback": bool  # True if demo service was unavailable
}
```

Your application code handles all platforms the same way!

---

## Summary

**Before:** Application code needs to know about each platform

**After:** Application code calls one method, works everywhere

**Result:** Demo mode validates production behavior perfectly! 🎉
