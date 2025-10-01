# Quick Start Integration Guide

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
cd frontend && npm install remark-math rehype-katex katex
```

### 2. Run Migration
```bash
cd backend && alembic upgrade head
```

### 3. Add Imports to Main Page
Add to `frontend/app/(dashboard)/ai-assistant/page.tsx`:

```typescript
import { FileUpload } from '@/components/ai/FileUpload';
import { SearchBar } from '@/components/ai/SearchBar';
import { ExportDialog } from '@/components/ai/ExportDialog';
import { ShareDialog } from '@/components/ai/ShareDialog';
import { TagManager } from '@/components/ai/TagManager';
import { EnhancedMarkdown } from '@/components/ai/EnhancedMarkdown';
import { MessageEditor } from '@/components/ai/MessageEditor';
import { CommentThread } from '@/components/ai/CommentThread';
import { CollaborationPanel } from '@/components/ai/CollaborationPanel';
import { Star, Archive } from 'lucide-react';
```

### 4. Add State Variables
```typescript
const [attachments, setAttachments] = useState<any[]>([]);
const [userTags, setUserTags] = useState<any[]>([]);
const [searchQuery, setSearchQuery] = useState('');
const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
```

### 5. Add to Sidebar (Search)
```tsx
{!sidebarCollapsed && (
  <SearchBar
    onSearch={(query, filters) => {
      // API call to /api/v1/chat/search
    }}
    onClear={() => setSearchResults(null)}
    availableTags={userTags}
  />
)}
```

### 6. Add to Chat Header (Actions)
```tsx
<div className="flex items-center gap-2">
  <Button size="sm" variant="ghost" onClick={handleToggleStar}>
    <Star className={cn("h-4 w-4", currentSession?.starred && "fill-yellow-400")} />
  </Button>
  
  <TagManager
    sessionId={sessionId!}
    currentTags={currentSession?.tags || []}
    availableTags={userTags}
    onTagsChange={handleTagsChange}
  />
  
  <Button size="sm" variant="ghost" onClick={handleToggleArchive}>
    <Archive className="h-4 w-4" />
  </Button>
  
  <ExportDialog
    sessionId={sessionId!}
    sessionTitle={currentSession?.title || 'Chat'}
    messages={messages}
  />
  
  <ShareDialog
    sessionId={sessionId!}
    sessionTitle={currentSession?.title || 'Chat'}
    onShare={handleShare}
  />
  
  <CollaborationPanel
    sessionId={sessionId!}
    currentUserId={currentUser.id}
    owner={currentUser}
    collaborators={[]}
    onInvite={handleInvite}
    onRemove={handleRemoveCollaborator}
    onUpdatePermission={handleUpdatePermission}
  />
</div>
```

### 7. Add File Upload to Input
```tsx
<FileUpload
  onFilesSelected={setAttachments}
  maxFiles={5}
  maxSize={10}
/>
```

### 8. Replace Markdown Renderer
Find all instances of:
```tsx
<ReactMarkdown>
  {message.content}
</ReactMarkdown>
```

Replace with:
```tsx
<EnhancedMarkdown content={message.content} />
```

### 9. Add Message Editing
```tsx
{editingMessageId === message.id ? (
  <MessageEditor
    messageId={message.id}
    originalContent={message.content}
    onSave={handleEditMessage}
    onCancel={() => setEditingMessageId(null)}
  />
) : (
  <EnhancedMarkdown content={message.content} />
)}
```

### 10. Add Comments
```tsx
<CommentThread
  messageId={message.id}
  comments={message.comments || []}
  currentUserId={currentUser.id}
  onAddComment={handleAddComment}
  onEditComment={handleEditComment}
  onDeleteComment={handleDeleteComment}
/>
```

## 🔧 Handler Functions

Add these to your component:

```typescript
const handleToggleStar = async () => {
  await api.post(`/chat/sessions/${sessionId}/star`, {
    starred: !currentSession?.starred
  });
  loadSessions();
};

const handleToggleArchive = async () => {
  await api.post(`/chat/sessions/${sessionId}/archive`, {
    archived: !currentSession?.archived
  });
  loadSessions();
};

const handleTagsChange = async (tags: any[]) => {
  await api.post(`/chat/sessions/${sessionId}/tags`, {
    tag_ids: tags.map(t => t.id)
  });
  loadSessions();
};

const handleShare = async (settings: any) => {
  const response = await api.post(`/chat/sessions/${sessionId}/share`, settings);
  return response.data.share_url;
};

const handleEditMessage = async (content: string) => {
  await api.put(`/chat/messages/${editingMessageId}`, { content });
  setEditingMessageId(null);
  // Trigger regeneration
  loadSession(sessionId!);
};

const handleAddComment = async (content: string) => {
  await api.post(`/chat/messages/${messageId}/comments`, { content });
  // Reload comments
};
```

## ✅ Test Checklist

- [ ] Search conversations
- [ ] Create and assign tags
- [ ] Star a conversation
- [ ] Archive a conversation
- [ ] Export to markdown
- [ ] Create share link
- [ ] Upload a file
- [ ] Add a comment
- [ ] Edit a message
- [ ] View enhanced markdown (tables, code, math)

## 🎉 Done!

Your AI assistant now has all the features you requested. Deploy and enjoy!
