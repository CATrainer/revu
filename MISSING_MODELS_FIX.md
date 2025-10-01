# Missing Models Fix

## 🚨 Problem
```
ModuleNotFoundError: No module named 'app.models.chat'
```

**Cause:** The database tables `ai_chat_sessions` and `ai_chat_messages` were created by migrations, but the corresponding Python models didn't exist.

## ✅ Solution

### Created `app/models/chat.py`

**Models added:**
- `ChatSession` - Maps to `ai_chat_sessions` table
- `ChatMessage` - Maps to `ai_chat_messages` table

**ChatSession includes:**
- Basic fields: id, user_id, title, context, status, timestamps
- Branching support: parent_session_id, branch_point_message_id, context_inheritance, branch_name, depth_level
- Enhancement fields: starred, archived, last_message_at
- Relationships: user, messages, tags, shares, collaborators

**ChatMessage includes:**
- Basic fields: id, session_id, user_id, role, content, metadata
- AI fields: tokens_used, model
- Status tracking: status, error, retry_count
- Vector embedding for RAG
- Relationships: session, user, comments, attachments

### Updated Relationships

**User model (`app/models/user.py`):**
- Added `chat_sessions` relationship
- Added `tags` relationship

**ChatSession model:**
- Added `shares` relationship (to SessionShare)
- Added `collaborators` relationship (to SessionCollaborator)

## 📋 Files Created/Modified

### Created:
- `backend/app/models/chat.py` - ChatSession and ChatMessage models

### Modified:
- `backend/app/models/user.py` - Added chat_sessions and tags relationships

## ✅ Result

All models now properly defined with correct relationships:
- ✅ ChatSession model exists
- ✅ ChatMessage model exists
- ✅ All relationships properly configured
- ✅ Bidirectional relationships working

## 🚀 Deploy

```bash
git add .
git commit -m "fix: create missing chat models"
git push
```

Railway deployment should now succeed!
