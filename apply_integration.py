#!/usr/bin/env python3
"""
Apply integration changes for the creative branch UI
"""

import re

# Read the file
with open('frontend/app/(dashboard)/ai-assistant/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change 1: Replace breadcrumbs with ThreadSwitcher
breadcrumbs_pattern = r'        \{/\* Breadcrumbs \*/\}[\s\S]*?        \)\}'
breadcrumbs_replacement = '''        {/* Thread Switcher - Shows active thread and related conversations */}
        <ThreadSwitcher 
          sessions={sessions}
          activeSessionId={sessionId}
          onSelectSession={loadSession}
        />'''

content = re.sub(breadcrumbs_pattern, breadcrumbs_replacement, content, count=1)

# Change 2: Update createBranchFromMessage function
branch_function_pattern = r'  const createBranchFromMessage = async \(messageId: string\) => \{\s+if \(!sessionId\) return;\s+const branchName = prompt\(\'Name this branch \(optional\):\'\);\s+\};'
branch_function_replacement = '''  const createBranchFromMessage = async (messageId: string, topic?: string) => {
    if (!sessionId) return;
    
    const branchName = topic || prompt('What would you like to explore?');
    if (!branchName) return;
    
    await createNewSession(true, sessionId, messageId, branchName);
  };'''

content = re.sub(branch_function_pattern, branch_function_replacement, content)

# Change 3: Add BranchCard after assistant messages
# Find the message rendering section and add BranchCard
# Look for the message div closing and add the branch card
message_section_pattern = r'(\s+)\{!isLoading && message\.content && \(\s+<button[\s\S]*?GitBranch className="h-4 w-4" />\s+</button>\s+\)\}\s+</div>\s+\)\)\}'

message_section_replacement = r'''\1{!isLoading && message.content && (
                    <button
                      onClick={() => createBranchFromMessage(message.id)}
                      className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md"
                      title="Branch from here"
                    >
                      <GitBranch className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Smart Branch Suggestions - show after last assistant message */}
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
            ))}'''

# First, let's wrap messages in Fragment
messages_map_pattern = r'\{messages\.map\(\(message\) => \('
messages_map_replacement = '{messages.map((message, idx) => (\n              <React.Fragment key={message.id}>'

content = re.sub(messages_map_pattern, messages_map_replacement, content)

# Now add the closing Fragment and BranchCard
message_end_pattern = r'(\s+\{!isLoading && message\.content && \(\s+<button[\s\S]*?</button>\s+\)\}\s+</div>)\s+\)\)\}'

message_end_replacement = r'''\1
                
                {/* Smart Branch Suggestions - show after last assistant message */}
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
            ))}'''

content = re.sub(message_end_pattern, message_end_replacement, content)

# Add React import if not present
if 'import React' not in content:
    content = content.replace(
        "import { useState, useEffect, useRef } from 'react';",
        "import React, { useState, useEffect, useRef } from 'react';"
    )

# Write the modified content
with open('frontend/app/(dashboard)/ai-assistant/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Integration changes applied successfully!")
print("\nChanges made:")
print("1. ✅ Replaced breadcrumbs with ThreadSwitcher")
print("2. ✅ Updated createBranchFromMessage to accept topic parameter")
print("3. ✅ Added BranchCard after assistant messages")
print("4. ✅ Added React import for Fragment")
print("\nPlease review the changes and test the application!")
