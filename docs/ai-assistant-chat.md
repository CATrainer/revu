# AI Assistant Chat Feature

## Overview
The AI Assistant chat feature provides a conversational AI interface powered by Anthropic's Claude API. It enables content creators to ask questions, get creative ideas, and receive guidance on content strategy, audience growth, and social media management.

## Features

### 🎯 Core Functionality
- **Real-time streaming responses** - Messages stream in character by character for a natural conversation flow
- **Session management** - Each chat session is persisted with conversation history
- **Context awareness** - Claude maintains conversation context across messages
- **Beautiful UI** - Modern chat interface with message bubbles, avatars, and smooth animations

### 💡 User Experience
- **Typing indicators** - Visual feedback while AI is thinking
- **Error handling** - Graceful error messages with retry capability
- **Auto-scroll** - Automatically scrolls to show new messages
- **Keyboard shortcuts** - Press Enter to send, Shift+Enter for new line
- **Quick prompts** - Pre-defined example questions to get started quickly

### 🎨 Interface Features
- Empty state with suggested prompts
- User messages aligned right with primary color
- AI messages aligned left with accent color
- Avatar indicators for user and AI
- Responsive design for mobile and desktop
- Auto-expanding textarea input

## Technical Implementation

### Backend (`/api/v1/chat`)

#### Endpoints

**POST `/chat/sessions`** - Create new chat session
```json
{
  "title": "New Chat",
  "mode": "general"
}
```

**GET `/chat/sessions`** - List user's chat sessions
- Supports pagination
- Returns session metadata and message counts

**POST `/chat/messages`** - Send message and get AI response
```json
{
  "session_id": "uuid",
  "content": "Your message here"
}
```
- Supports streaming responses via Server-Sent Events (SSE)
- Uses Claude's streaming API for real-time responses

**GET `/chat/messages/{session_id}`** - Retrieve message history
- Paginated message retrieval
- Includes role, content, and timestamps

**DELETE `/chat/sessions/{session_id}`** - Delete chat session
- Removes session and all associated messages

#### Claude Integration
- Uses `Anthropic` client from `anthropic` package
- Model: `claude-3-5-sonnet-latest` (configurable via env)
- Temperature: 0.7 for creative yet coherent responses
- Max tokens: 1024 (configurable)
- System prompt: "You are Repruv AI, a helpful assistant for content creators and influencers..."

#### Database Schema
```sql
-- Chat sessions
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  context_tags TEXT[],
  system_prompt JSONB,
  mode TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ
);

-- Chat messages
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES ai_chat_sessions(id),
  user_id UUID REFERENCES users(id),
  role TEXT, -- 'user' or 'assistant'
  content TEXT,
  tokens INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ
);
```

### Frontend (`/ai-assistant`)

#### Component Structure
```
AIAssistantPage
├── Header (title + description)
├── Card (main chat container)
│   ├── CardContent (messages area)
│   │   ├── Empty state with quick prompts
│   │   └── Message list with streaming updates
│   ├── Error display
│   └── Input area (textarea + send button)
```

#### State Management
- `messages` - Array of message objects
- `input` - Current textarea value
- `isLoading` - Loading state for API calls
- `sessionId` - Current chat session ID
- `error` - Error message display

#### Streaming Implementation
Uses native `fetch` with `ReadableStream` to handle Server-Sent Events:
```typescript
const response = await fetch('/chat/messages?stream=true', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ... },
  body: JSON.stringify({ session_id, content })
});

const reader = response.body?.getReader();
// Process streaming data and update UI in real-time
```

## Configuration

### Environment Variables

#### Backend
```bash
# Claude API Configuration
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-latest  # Optional, defaults to this
CLAUDE_MAX_TOKENS=1024  # Optional, defaults to 1024

# Rate Limiting (optional)
CLAUDE_CB_THRESHOLD=5  # Circuit breaker threshold
CLAUDE_CB_COOLDOWN=60  # Circuit breaker cooldown in seconds
```

#### Frontend
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url/api/v1
```

## Usage Examples

### Starting a Conversation
1. Navigate to `/ai-assistant` in the dashboard
2. Click a suggested prompt or type your own message
3. Press Enter to send (Shift+Enter for multi-line)
4. Watch the AI response stream in real-time

### Example Prompts
- "Why has my subscriber count gone down?"
- "Can you help me come up with a viral video idea?"
- "What are the best times to post on social media?"
- "How can I improve engagement with my audience?"
- "What content trends should I follow in 2025?"
- "Help me write a compelling video description"

## Best Practices

### For Users
- Be specific in your questions for better responses
- Use the conversation history - Claude remembers context
- Try different phrasings if you don't get the answer you need
- Use Shift+Enter for multi-line messages

### For Developers
- Always handle streaming errors gracefully
- Implement proper rate limiting to prevent abuse
- Monitor Claude API costs via usage logs
- Consider implementing message persistence across page reloads
- Add analytics to track popular queries and user engagement

## Performance Considerations

### Backend
- Rate limiting: 120 messages per minute per user
- Circuit breaker: Protects against API failures
- Message history limited to last 20 messages for context
- Token estimation for cost tracking

### Frontend
- Debounced auto-scroll for smooth UX
- Efficient state updates during streaming
- Lazy loading for long message histories
- Optimistic UI updates for instant feedback

## Future Enhancements

### Planned Features
- [ ] Voice input and text-to-speech output
- [ ] Code syntax highlighting in messages
- [ ] Image and file attachment support
- [ ] Export conversation to PDF/TXT
- [ ] Conversation search and filtering
- [ ] Multi-language support
- [ ] Custom AI personas for different use cases
- [ ] Integration with user's analytics data for personalized insights

### Technical Improvements
- [ ] WebSocket support for real-time collaboration
- [ ] Redis caching for conversation history
- [ ] Message editing and regeneration
- [ ] Conversation branching and forking
- [ ] A/B testing different AI prompts
- [ ] Fine-tuned models based on user feedback

## Troubleshooting

### Common Issues

**"Failed to initialize chat session"**
- Check that user is authenticated
- Verify database connection
- Check backend logs for errors

**"Failed to send message"**
- Verify CLAUDE_API_KEY is set correctly
- Check network connectivity
- Ensure session_id is valid
- Review rate limiting logs

**Streaming stops mid-response**
- Check Claude API quota and limits
- Verify network stability
- Review browser console for errors
- Check backend timeout settings

**No response from AI**
- Verify Claude API key is valid
- Check if circuit breaker is open
- Review error logs in database
- Ensure anthropic package is installed

## Security Considerations

- All endpoints require authentication
- Rate limiting prevents abuse
- Messages are tied to user sessions
- SQL injection protection via parameterized queries
- No PII or sensitive data stored in messages
- HTTPS required for production
- API keys stored securely in environment variables

## Monitoring

### Key Metrics to Track
- Message latency (stored in `ai_chat_messages.latency_ms`)
- Token usage (stored in `ai_chat_messages.tokens`)
- Error rates (logged via error handling)
- Session duration and message counts
- User engagement (messages per session)
- Claude API costs via `api_usage_log` table

## Support

For issues or questions:
- Check backend logs at `/var/log/repruv/`
- Review database tables: `ai_chat_sessions`, `ai_chat_messages`
- Monitor Claude API status: https://status.anthropic.com/
- Contact development team for assistance
