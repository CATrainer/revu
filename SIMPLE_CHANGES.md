# Simple Manual Changes Needed

Make these 3 quick edits to `frontend/app/(dashboard)/ai-assistant/page.tsx`:

---

## Change 1: Update the imports (line 4)
**Find:**
```tsx
import { useState, useEffect, useRef } from 'react';
```

**Replace with:**
```tsx
import React, { useState, useEffect, useRef } from 'react';
```

---

## Change 2: Update createBranchFromMessage function (around line 113-117)

**Find:**
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

---

## Change 3: Replace breadcrumbs section (around line 537-561)

**Find this entire block:**
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
        {/* Thread Switcher */}
        <ThreadSwitcher 
          sessions={sessions}
          activeSessionId={sessionId}
          onSelectSession={loadSession}
        />
```

---

## Change 4: Add BranchCard in messages section (around line 834)

**Find:**
```tsx
              {messages.map((message) => (
```

**Replace with:**
```tsx
              {messages.map((message, idx) => (
                <React.Fragment key={message.id}>
```

**Then find the closing of the map (around line 835):**
```tsx
                </div>
              ))}
```

**Replace with:**
```tsx
                </div>
                
                {/* Smart Branch Suggestions */}
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
              </React.Fragment>
            ))}
```

---

**That's it!** These 4 changes will give you the beautiful new branching UI.

**To verify:** After making changes, the AI should show purple "Explore Further" cards with smart suggestions after each response, and you'll see a clean thread switcher at the top instead of breadcrumbs.
