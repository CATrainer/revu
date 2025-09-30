# Branch UI Integration Guide

All new components are created and ready. Complete these manual steps to integrate them:

## Step 1: Replace Breadcrumbs with ThreadSwitcher

**Location:** `frontend/app/(dashboard)/ai-assistant/page.tsx` around line 537

**Find this:**
```tsx
        {/* Breadcrumbs */}
        {currentSession && getBreadcrumbs(currentSession).length > 1 && (
          <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-3">
            <div className="flex items-center gap-2 text-sm">
              {getBreadcrumbs(currentSession).map((session, idx, arr) => (
                <div key={session.id} className="flex items-center gap-2">
                  <button
                    onClick={() => loadSession(session.id)}
                    className={cn(
                      "hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
                      idx === arr.length - 1 
                        ? "font-semibold text-slate-900 dark:text-slate-100"
                        : "text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {session.branch_name || session.title}
                  </button>
                  {idx < arr.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
```

**Replace with:**
```tsx
        {/* Thread Switcher - Shows active thread and related conversations */}
        <ThreadSwitcher 
          sessions={sessions}
          activeSessionId={sessionId}
          onSelectSession={loadSession}
        />
```

## Step 2: Update createBranchFromMessage Function

**Location:** Around line 113

**Find this:**
```tsx
  const createBranchFromMessage = async (messageId: string) => {
    if (!sessionId) return;
    
    const branchName = prompt('Name this branch (optional):');
  };
```

**Replace with:**
```tsx
  const createBranchFromMessage = async (messageId: string, topic?: string) => {
    if (!sessionId) return;
    
    const branchName = topic || prompt('What would you like to explore?');
    if (!branchName) return;
    
    await createNewSession(true, sessionId, messageId, branchName);
  };
```

## Step 3: Add BranchCard After AI Messages

**Location:** In the messages rendering section, around line 820-835

**Find the section that renders messages and after the closing div for each message (but still inside the map), add:**

After this line (approximately):
```tsx
                  )}
                </div>
              ))}
```

Add this BEFORE the closing of the map (between messages):
```tsx
              {/* Smart Branch Suggestions - only for assistant messages */}
              {messages.map((message, idx) => (
                <div key={message.id}>
                  {/* existing message rendering... */}
                  
                  {/* Add this after each assistant message */}
                  {message.role === 'assistant' && message.content && !isLoading && idx === messages.length - 1 && (
                    <BranchCard
                      suggestions={generateBranchSuggestions(message.content)}
                      onBranch={(topic) => createBranchFromMessage(message.id, topic)}
                      messageId={message.id}
                    />
                  )}
                </div>
              ))}
```

**OR** simpler approach - find where messages are mapped and wrap each message div with a Fragment:

```tsx
{messages.map((message, idx) => (
  <>
    <div className="group relative" key={message.id}>
      {/* existing message content */}
    </div>
    
    {/* Add branch card only for last assistant message */}
    {message.role === 'assistant' && 
     message.content && 
     !isLoading && 
     idx === messages.length - 1 && (
      <BranchCard
        suggestions={generateBranchSuggestions(message.content)}
        onBranch={(topic) => createBranchFromMessage(message.id, topic)}
        messageId={message.id}
      />
    )}
  </>
))}
```

## Step 4: Optional - Remove Old Tree Sidebar (if desired)

If you want to completely replace the tree sidebar with just the thread switcher at the top:

1. Keep the sidebar for "New Chat" and "New Thread" buttons
2. Remove or comment out the SessionTree component
3. Make the sidebar collapsible/hideable

## Testing

After integration:
1. Start a conversation
2. After AI responds, you should see a purple "Explore Further" card with smart suggestions
3. Click any suggestion to create a branch
4. The ThreadSwitcher at the top should show you're in a branch
5. Click "related threads" to see and switch between branches

## Summary of New Features

✅ **BranchCard** - Contextual suggestions after AI responses
✅ **ThreadSwitcher** - Clean navigation showing active thread + related
✅ **Smart Suggestions** - AI-powered topic detection from responses
✅ **Visual Design** - Purple/pink gradients, clean modern UI
✅ **One-click branching** - No more prompts or manual naming
