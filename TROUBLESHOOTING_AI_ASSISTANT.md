# Troubleshooting AI Assistant 404 Error

## Problem
Getting a 404 error when trying to use the AI assistant in the monetization project workspace.

## Root Cause Analysis

The AI assistant chat is part of the **Project Workspace** (`/monetization/project/[id]`), not a standalone page. The 404 error likely means:

### 1. No Active Project Exists
**Symptom:** Trying to access `/monetization/project/[id]` but no project has been created yet.

**Solution:**
1. Go to `/monetization/choose-opportunity`
2. Select either:
   - **Templates tab**: Choose a pre-built opportunity template, OR
   - **AI Suggestions tab**: Start AI analysis and select a custom-generated opportunity
3. Click "Select This Opportunity" to create a project
4. You'll be redirected to `/monetization/project/[project-id]` where the AI chat is available

### 2. Wrong URL Format
**Expected URL:** `/monetization/project/[uuid]`  
**Example:** `/monetization/project/123e4567-e89b-12d3-a456-426614174000`

If you're trying to access `/ai-assistant` or `/monetization/ai-assistant`, that's the wrong path.

### 3. Project Doesn't Exist or Doesn't Belong to You
The backend checks:
- Project exists in database
- Project belongs to the current user

**Check in browser console:**
```javascript
// Open browser DevTools (F12) and check Network tab
// Look for failed requests to:
// - GET /api/v1/monetization/projects/{id}
// - GET /api/v1/monetization/projects/{id}/messages
```

## Quick Fix Steps

### Step 1: Verify You Have a Project
```bash
# Check if you have any active projects
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/monetization/projects
```

### Step 2: Create a Project (if none exists)
1. Navigate to: `http://localhost:3000/monetization/choose-opportunity`
2. Click "Templates" tab
3. Select any opportunity (e.g., "Premium Community")
4. Click "Select This Opportunity"
5. You'll be redirected to the project workspace with AI chat

### Step 3: Access AI Chat
Once you have a project:
1. Go to `/monetization/project/[your-project-id]`
2. Click the "AI Partner Chat" tab
3. The chat interface should load

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/monetization/projects/{id}` | Load project details |
| `GET /api/v1/monetization/projects/{id}/messages` | Load chat history |
| `POST /api/v1/monetization/projects/{id}/messages` | Send message (streaming response) |

## Common Errors

### Error: "Project not found"
- Project ID in URL doesn't exist
- Project belongs to different user
- **Fix:** Create a new project from choose-opportunity page

### Error: 404 on `/ai-assistant`
- Wrong URL - there's no standalone `/ai-assistant` page for monetization
- **Fix:** Use `/monetization/project/[id]` instead

### Error: "No response body"
- Streaming response failed
- **Fix:** Check backend logs for errors in message sending

## Architecture Notes

The AI assistant is **project-specific**, not a general chatbot:
- Each project has its own chat history
- AI knows about your project's opportunity, plan, and progress
- AI can mark tasks complete, make decisions, and adapt the plan
- Context includes: opportunity details, completed tasks, decisions made

If you want a **general AI assistant** (not project-specific), that's the `/ai-assistant` page which uses a different endpoint (`/api/v1/chat/messages`).

## Next Steps

1. **If you don't have a project:** Go to `/monetization/choose-opportunity` and create one
2. **If you have a project:** Navigate to `/monetization/project/[your-project-id]`
3. **If still getting 404:** Check browser console and network tab for the actual failing request
4. **Share the error details:** What URL are you trying to access? What's the exact error message?
