# ChatGPT Feature Parity - Complete Implementation Plan

## Phase 1: Message Controls ✅ IN PROGRESS

### 1.1 Stop Generation
**Status**: Functions added, UI needed
```tsx
// Already implemented:
const stopGeneration = () => {
  if (abortController) abortController.abort();
  setIsGenerating(false);
}

// Need to add:
- Stop button in input area when generating
- Show "Stopped generating" message
- Keyboard shortcut: Escape key
```

### 1.2 Regenerate Response  
**Status**: Function added, UI needed
```tsx
// Already implemented:
const regenerateMessage = async (messageIndex: number) => {
  // Removes message and resends
}

// Need to add:
- Regenerate button on last assistant message
- Show "Regenerating..." indicator
- Keyboard shortcut: Ctrl/Cmd + R
```

### 1.3 Edit Message
**Status**: Functions added, UI needed
```tsx
// Already implemented:
const editMessage = (messageId: string, content: string)
const saveEditedMessage = async (messageId: string)

// Need to add:
- Edit button on user messages
- Inline textarea when editing
- Save/Cancel buttons
- Show "Editing..." state
```

### 1.4 Copy Message
**Status**: Function added, component created ✅
```tsx
// Component: MessageActions.tsx ✅
// Includes: Copy, Edit, Regenerate, More menu
```

## Phase 2: UI Polish

### 2.1 Message Actions Menu
**File**: `frontend/components/ai/MessageActions.tsx` ✅
- Hover-reveal action buttons
- Copy, Edit, Regenerate, More
- Tooltips on all actions
- Dropdown for additional options

### 2.2 Scroll Controls
```tsx
// Need to add:
- Floating "Scroll to bottom" button (when not at bottom)
- Auto-scroll toggle
- Smooth scroll animations
- Jump to latest unread
```

### 2.3 Timestamps
```tsx
// Need to add:
- Timestamp on hover (e.g., "2:45 PM")
- Relative time (e.g., "2 minutes ago")
- Full timestamp in tooltip
```

### 2.4 Loading States
```tsx
// Enhance:
- Better skeleton loaders
- Streaming indicator (animated dots)
- "Thinking..." with animated icon
- Character count during streaming
- Estimated time remaining
```

## Phase 3: Keyboard Shortcuts

### Global Shortcuts
```tsx
const shortcuts = {
  'Ctrl/Cmd + K': 'Focus search/new chat',
  'Ctrl/Cmd + Shift + N': 'New chat',
  'Ctrl/Cmd + Shift + T': 'New thread',
  'Escape': 'Stop generation / Close modal',
  'Ctrl/Cmd + R': 'Regenerate last response',
  'Ctrl/Cmd + E': 'Edit last user message',
  '/': 'Focus message input',
  'Shift + Escape': 'Clear input',
}
```

### Implementation
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    
    if (e.key === 'Escape' && isGenerating) {
      stopGeneration();
    }
    else if (modifier && e.shiftKey && e.key === 'n') {
      prepareNewSession();
    }
    // ... more shortcuts
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isGenerating]);
```

## Phase 4: Session Management

### 4.1 Inline Session Rename
```tsx
// Current: Modal/separate input
// Add: Double-click title to edit inline
// Add: Auto-save on blur
// Add: Enter to save, Escape to cancel
```

### 4.2 Delete Confirmation
```tsx
// Add modal:
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
      <AlertDialogDescription>
        This will delete "{session.title}" and all its messages.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={confirmDelete} className="bg-red-600">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 4.3 Export Conversation
```tsx
const exportChat = (format: 'txt' | 'md' | 'json') => {
  const content = messages.map(m => 
    format === 'md' 
      ? `**${m.role}**: ${m.content}\n\n`
      : `${m.role.toUpperCase()}: ${m.content}\n\n`
  ).join('');
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.title}.${format}`;
  a.click();
};
```

### 4.4 Archive Conversations
```tsx
// Add archived state to sessions
// Hide from main list, show in "Archived" tab
// Easy restore from archive
```

## Phase 5: Advanced Features

### 5.1 Message Reactions
```tsx
interface MessageReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

// Add to messages:
- 👍 👎 reactions
- Save to backend
- Show reaction count
```

### 5.2 Code Block Enhancements
```tsx
// Already have:
- Syntax highlighting ✅
- Copy button ✅

// Add:
- Language label
- Run code button (for safe languages)
- Download snippet
- Line numbers toggle
```

### 5.3 Image/File Support
```tsx
// Future: Upload images to messages
// Display inline
// Download attachments
```

### 5.4 Voice Input
```tsx
// Add microphone button
// Speech-to-text
// Real-time transcription
```

## Phase 6: Error Handling

### 6.1 Retry Failed Messages
```tsx
// On error, show:
- "Failed to send" message
- Retry button
- Edit and retry button
- Discard button

const retryMessage = async (messageId: string) => {
  const msg = messages.find(m => m.id === messageId);
  if (!msg) return;
  
  // Re-send with same content
  await handleSubmit(/* ... */);
};
```

### 6.2 Offline Handling
```tsx
// Detect offline:
useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

// Show banner: "You're offline. Messages will send when reconnected."
```

### 6.3 Rate Limit Messages
```tsx
// When rate limited (429):
- Show friendly message
- Show countdown timer
- Auto-retry when limit resets
```

## Phase 7: Performance Optimizations

### 7.1 Virtual Scrolling
```tsx
// For conversations with 100+ messages:
import { useVirtualizer } from '@tanstack/react-virtual';

// Only render visible messages
// Smooth scrolling for long chats
```

### 7.2 Message Pagination
```tsx
// Load messages in chunks:
- Initial: Last 50 messages
- Scroll up: Load 50 more
- Show "Load earlier messages" button
```

### 7.3 Search Messages
```tsx
// Add search bar:
const [searchQuery, setSearchQuery] = useState('');
const filteredMessages = messages.filter(m => 
  m.content.toLowerCase().includes(searchQuery.toLowerCase())
);

// Highlight matches
// Jump between results
// Keyboard navigation (Cmd+F)
```

## Implementation Priority

### Week 1: Core Controls
1. ✅ Stop generation button
2. ✅ Regenerate response  
3. ✅ Edit message
4. ✅ Copy message
5. ⏳ Message actions component
6. ⏳ Scroll to bottom button

### Week 2: Polish & UX
7. ⏳ Timestamps
8. ⏳ Better loading states
9. ⏳ Keyboard shortcuts
10. ⏳ Inline session rename
11. ⏳ Delete confirmation

### Week 3: Advanced
12. ⏳ Export conversations
13. ⏳ Error retry UI
14. ⏳ Offline handling
15. ⏳ Message search
16. ⏳ Code block enhancements

### Week 4: Performance
17. ⏳ Virtual scrolling
18. ⏳ Message pagination
19. ⏳ Archive conversations
20. ⏳ Message reactions

## Testing Checklist

### Message Controls
- [ ] Can stop generation mid-stream
- [ ] Can regenerate last response
- [ ] Can edit user message and regenerate
- [ ] Can copy any message
- [ ] Actions appear on hover
- [ ] Tooltips work correctly

### Keyboard Shortcuts
- [ ] All shortcuts work
- [ ] Don't conflict with browser shortcuts
- [ ] Work across all browsers
- [ ] Visual feedback for actions

### Error Handling
- [ ] Failed messages show retry option
- [ ] Offline banner appears
- [ ] Rate limit shows countdown
- [ ] Network errors handled gracefully

### Performance
- [ ] Smooth with 100+ messages
- [ ] No lag when typing
- [ ] Fast session switching
- [ ] Efficient re-renders

## Files to Modify

1. ✅ `frontend/components/ai/MessageActions.tsx` (NEW)
2. ⏳ `frontend/app/(dashboard)/ai-assistant/page.tsx` (UPDATE)
3. ⏳ `frontend/components/ai/StopGenerationButton.tsx` (NEW)
4. ⏳ `frontend/components/ai/ScrollToBottomButton.tsx` (NEW)
5. ⏳ `frontend/components/ai/MessageTimestamp.tsx` (NEW)
6. ⏳ `frontend/components/ai/EditMessageForm.tsx` (NEW)
7. ⏳ `frontend/hooks/useKeyboardShortcuts.ts` (NEW)
8. ⏳ `frontend/components/ai/ExportDialog.tsx` (NEW)

## Next Steps

1. **Integrate MessageActions component** into existing message rendering
2. **Add Stop button** in input area with abort controller
3. **Implement scroll-to-bottom** FAB
4. **Add keyboard shortcuts** hook
5. **Create comprehensive demo** video

---

**Current Status**: Phase 1 functions implemented, UI integration needed
**Est. Completion**: 3-4 weeks for full ChatGPT parity
**Priority**: Message controls → Polish → Advanced features
