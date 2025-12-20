# Interactions System Overhaul - Design Document

## Implementation Status: ✅ Backend Complete, Frontend Partial

**Last Updated:** 2025-12-16

---

## Executive Summary

This document outlines a comprehensive overhaul of the interactions system to provide:
1. **Enriched context** for each interaction (author info, post/video context, conversation history)
2. **Archive lifecycle** with auto-archive, auto-delete, and manual controls
3. **Permanent views** (All, Awaiting Approval, Archive, Sent) plus custom views with natural language filters
4. **Workflow system** with priority-based execution and system workflows (Auto Moderator, Auto Archive)
5. **Improved response generation** with better context, shorter responses, and proper regeneration
6. **Fixed response UI** with stable layout and working send functionality

---

## Phase 1: Enriched Interaction Schema

### Current State Analysis

The current `Interaction` model (`backend/app/models/interaction.py`) already has:
- ✅ `author_name`, `author_username`, `author_profile_url`, `author_avatar_url`
- ✅ `author_follower_count`, `author_is_verified`
- ✅ `parent_content_id`, `parent_content_title`, `parent_content_url`
- ✅ `platform_created_at`, `read_at`, `replied_at`, `responded_at`
- ❌ Missing: `last_activity_at`, `archived_at`, `archive_source`
- ❌ Missing: `parent_content_thumbnail_url`, `parent_content_view_count`
- ❌ Missing: `conversation_history` (for DMs)

### Schema Changes

```python
# Add to Interaction model
class Interaction(Base):
    # ... existing fields ...
    
    # Post/Video Context (enhanced)
    parent_content_thumbnail_url = Column(Text)
    parent_content_view_count = Column(Integer)
    
    # Conversation Context (for DMs)
    conversation_history = Column(JSONB)  # [{sender: 'user'|'creator', content: str, timestamp: str}]
    
    # Activity Tracking
    last_activity_at = Column(DateTime, index=True)  # Updated on any activity
    
    # Archive Lifecycle
    archived_at = Column(DateTime, index=True)
    archive_source = Column(String(20))  # 'auto' | 'manual' | 'workflow'
    
    # Workflow Processing
    processed_by_workflow_id = Column(PGUUID(as_uuid=True), ForeignKey('workflows.id'))
    processed_at = Column(DateTime)
```

### Migration Script

```sql
-- Migration: add_interaction_enrichment_fields
ALTER TABLE interactions ADD COLUMN parent_content_thumbnail_url TEXT;
ALTER TABLE interactions ADD COLUMN parent_content_view_count INTEGER;
ALTER TABLE interactions ADD COLUMN conversation_history JSONB;
ALTER TABLE interactions ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE interactions ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE interactions ADD COLUMN archive_source VARCHAR(20);
ALTER TABLE interactions ADD COLUMN processed_by_workflow_id UUID REFERENCES workflows(id);
ALTER TABLE interactions ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_interactions_last_activity ON interactions(last_activity_at);
CREATE INDEX idx_interactions_archived ON interactions(archived_at) WHERE archived_at IS NOT NULL;
```

---

## Phase 2: Enhanced Data Fetching

### YouTube Comment Enrichment

When syncing YouTube comments, fetch additional data:

```python
class YouTubeInteractionMapper:
    async def map_comment_to_interaction(self, comment, user_id, ...):
        # 1. Fetch commenter's channel details
        channel_info = await self._fetch_channel_info(comment.author_channel_id)
        # Returns: subscriber_count, is_verified, profile_image_url
        
        # 2. Fetch video details (if not already cached)
        video_info = await self._fetch_video_info(comment.video_id)
        # Returns: title, thumbnail_url, view_count, url
        
        interaction = Interaction(
            # ... existing fields ...
            author_follower_count=channel_info.get('subscriber_count'),
            author_is_verified=channel_info.get('is_verified', False),
            author_avatar_url=channel_info.get('profile_image_url'),
            parent_content_thumbnail_url=video_info.get('thumbnail_url'),
            parent_content_view_count=video_info.get('view_count'),
            last_activity_at=datetime.utcnow(),
        )
```

### Instagram Enrichment

```python
class InstagramInteractionMapper:
    async def map_comment_to_interaction(self, comment, user_id, ...):
        # 1. Fetch user profile
        user_info = await self._fetch_user_profile(comment.username)
        # Returns: follower_count, is_verified, profile_picture_url
        
        # 2. For DMs, fetch conversation thread
        if interaction_type == 'dm':
            conversation = await self._fetch_conversation_thread(thread_id)
            # Returns: [{sender, content, timestamp}, ...]
```

---

## Phase 3: Archive Lifecycle

### User Preferences

Add to user preferences/settings:

```python
class UserPreference(Base):
    # ... existing fields ...
    
    # Archive Settings
    archive_inactive_days = Column(Integer, default=7)  # Days before auto-archive
    archive_delete_days = Column(Integer, default=30)   # Days in archive before deletion
```

### Archive Service

```python
class ArchiveService:
    async def auto_archive_inactive(self, user_id: UUID):
        """Archive interactions with no activity for X days."""
        threshold = datetime.utcnow() - timedelta(days=user_prefs.archive_inactive_days)
        
        await db.execute(
            update(Interaction)
            .where(
                Interaction.user_id == user_id,
                Interaction.archived_at.is_(None),
                Interaction.last_activity_at < threshold
            )
            .values(
                archived_at=datetime.utcnow(),
                archive_source='auto'
            )
        )
    
    async def auto_delete_old_archived(self, user_id: UUID):
        """Delete archived interactions older than Y days."""
        threshold = datetime.utcnow() - timedelta(days=user_prefs.archive_delete_days)
        
        await db.execute(
            delete(Interaction)
            .where(
                Interaction.user_id == user_id,
                Interaction.archived_at.isnot(None),
                Interaction.archived_at < threshold
            )
        )
    
    async def manual_archive(self, interaction_ids: List[UUID]):
        """Manually archive interactions."""
        await db.execute(
            update(Interaction)
            .where(Interaction.id.in_(interaction_ids))
            .values(
                archived_at=datetime.utcnow(),
                archive_source='manual'
            )
        )
    
    async def unarchive(self, interaction_ids: List[UUID]):
        """Restore archived interactions."""
        await db.execute(
            update(Interaction)
            .where(Interaction.id.in_(interaction_ids))
            .values(
                archived_at=None,
                archive_source=None
            )
        )
    
    async def auto_unarchive_on_activity(self, interaction_id: UUID):
        """Automatically unarchive if new activity detected."""
        interaction = await db.get(Interaction, interaction_id)
        if interaction and interaction.archived_at:
            interaction.archived_at = None
            interaction.archive_source = None
            interaction.last_activity_at = datetime.utcnow()
```

### Celery Task for Auto-Archive

```python
@celery_app.task
def run_archive_lifecycle():
    """Run daily to auto-archive and auto-delete."""
    users = get_all_active_users()
    for user in users:
        archive_service.auto_archive_inactive(user.id)
        archive_service.auto_delete_old_archived(user.id)
```

---

## Phase 4: Permanent Views

### View Types

```python
class ViewType(str, Enum):
    SYSTEM = 'system'      # Permanent, cannot be deleted
    CUSTOM = 'custom'      # User-created
    WORKFLOW = 'workflow'  # Auto-created by workflow
```

### System Views (Created on User Registration)

```python
SYSTEM_VIEWS = [
    {
        'name': 'All',
        'icon': '📥',
        'type': 'system',
        'is_system': True,
        'order_index': 0,
        'filters': {
            'exclude_archived': True  # Don't show archived
        },
        'description': 'All non-archived interactions'
    },
    {
        'name': 'Awaiting Approval',
        'icon': '⏳',
        'type': 'system',
        'is_system': True,
        'order_index': 1,
        'filters': {
            'status': ['awaiting_approval']
        },
        'description': 'Responses waiting for your approval'
    },
    {
        'name': 'Archive',
        'icon': '📦',
        'type': 'system',
        'is_system': True,
        'order_index': 2,
        'filters': {
            'archived_only': True
        },
        'description': 'Archived interactions'
    },
    {
        'name': 'Sent',
        'icon': '✅',
        'type': 'system',
        'is_system': True,
        'order_index': 3,
        'filters': {
            'status': ['answered']
        },
        'description': 'History of sent responses'
    }
]
```

### Sent Responses Table

```python
class SentResponse(Base):
    """Track all sent responses for the Sent view."""
    
    __tablename__ = "sent_responses"
    
    interaction_id = Column(PGUUID(as_uuid=True), ForeignKey('interactions.id'), nullable=False)
    response_text = Column(Text, nullable=False)
    
    # Response type
    response_type = Column(String(20), nullable=False)  # 'manual' | 'semi_automated' | 'automated'
    
    # If AI-generated
    ai_model = Column(String(50))
    ai_confidence = Column(Float)
    was_edited = Column(Boolean, default=False)
    original_ai_text = Column(Text)  # Before user edits
    
    # Workflow attribution
    workflow_id = Column(PGUUID(as_uuid=True), ForeignKey('workflows.id'))
    
    # Timestamps
    sent_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Platform response
    platform_response_id = Column(String(255))  # ID from platform API
    platform_error = Column(Text)
    
    # Ownership
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Relationships
    interaction = relationship("Interaction")
    workflow = relationship("Workflow")
```

---

## Phase 5: Custom Views with Natural Language Filters

### Natural Language Filter Compilation

```python
class FilterCompiler:
    """Compiles natural language filters to structured JSON."""
    
    async def compile_filter(self, natural_language: str) -> dict:
        """
        Send to AI to parse natural language into structured conditions.
        
        Example input: "Show me DMs from other creators"
        Example output: {
            "interaction_types": ["dm"],
            "author_conditions": {
                "min_followers": 10000,
                "is_verified": true
            }
        }
        """
        prompt = f"""Parse this natural language filter into structured JSON conditions.

Filter: "{natural_language}"

Return JSON with these possible fields:
- platforms: ["youtube", "instagram", "tiktok", "twitter"]
- interaction_types: ["comment", "dm", "mention"]
- keywords: ["word1", "word2"] - words that must appear
- exclude_keywords: ["word1"] - words that must NOT appear
- sentiment: "positive" | "negative" | "neutral"
- author_conditions:
  - min_followers: number
  - max_followers: number
  - is_verified: boolean
  - is_creator: boolean (has significant following)
- content_conditions:
  - contains_question: boolean
  - mentions_brand: boolean
  - is_collaboration_inquiry: boolean
  - is_negative_feedback: boolean
- priority_min: 1-100
- priority_max: 1-100

Only include fields that are relevant to the filter. Return valid JSON only."""

        response = await anthropic_client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return json.loads(response.content[0].text)
```

### View Schema Update

```python
class InteractionView(Base):
    # ... existing fields ...
    
    # Natural language filter
    natural_language_filter = Column(Text)  # Original user input
    compiled_filters = Column(JSONB)        # AI-compiled structured filters
    
    # Compilation metadata
    filter_compiled_at = Column(DateTime)
    filter_compiler_model = Column(String(50))
```

### View Creation Flow

```python
@router.post("/views")
async def create_view(
    name: str,
    natural_language_filter: Optional[str] = None,
    explicit_filters: Optional[dict] = None,
    ...
):
    compiled_filters = {}
    
    # Compile natural language if provided
    if natural_language_filter:
        compiler = FilterCompiler()
        compiled_filters = await compiler.compile_filter(natural_language_filter)
    
    # Merge with explicit filters (explicit takes precedence)
    if explicit_filters:
        compiled_filters.update(explicit_filters)
    
    view = InteractionView(
        name=name,
        natural_language_filter=natural_language_filter,
        compiled_filters=compiled_filters,
        filters=compiled_filters,  # For backward compatibility
        filter_compiled_at=datetime.utcnow(),
        ...
    )
```

---

## Phase 6: Workflow System

### Workflow Model Updates

```python
class Workflow(Base):
    __tablename__ = "workflows"
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Type and Priority
    type = Column(String(20), nullable=False, default='custom')  # 'system' | 'custom'
    priority = Column(Integer, nullable=False, default=100)  # Lower = higher priority
    
    # Status
    status = Column(String(20), nullable=False, default='active')  # 'active' | 'paused' | 'draft'
    is_enabled = Column(Boolean, default=True)
    
    # Trigger Conditions (natural language)
    natural_language_conditions = Column(ARRAY(Text))  # ["Hateful messages", "Spam content"]
    compiled_conditions = Column(JSONB)  # AI-compiled structured conditions
    
    # Platform/Type Filters
    platforms = Column(ARRAY(String(32)))  # ['youtube', 'instagram']
    interaction_types = Column(ARRAY(String(16)))  # ['comment', 'dm', 'mention']
    
    # Action Configuration
    action_type = Column(String(50), nullable=False)
    # 'auto_moderate' - block/delete based on type
    # 'auto_archive' - archive locally
    # 'auto_respond' - send template immediately
    # 'generate_response' - AI generate + awaiting_approval
    
    action_config = Column(JSONB)
    # For auto_respond: {"template": "Thanks for your comment!"}
    # For generate_response: {"tone": "friendly", "max_length": 50}
    
    # Ownership
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id'))
```

### System Workflows

```python
SYSTEM_WORKFLOWS = [
    {
        'name': 'Auto Moderator',
        'type': 'system',
        'priority': 1,  # Highest priority
        'action_type': 'auto_moderate',
        'description': 'Automatically handles harassment, spam, and inappropriate content',
        'natural_language_conditions': [
            'Hateful or abusive messages',
            'Spam or promotional content',
            'Messages with profanity'
        ],
        'action_config': {
            'dm_action': 'block_user',
            'comment_action': 'delete_comment',
            'mention_action': 'block_user'
        }
    },
    {
        'name': 'Auto Archive',
        'type': 'system',
        'priority': 2,
        'action_type': 'auto_archive',
        'description': 'Automatically archives low-value interactions',
        'natural_language_conditions': [
            'Generic thank you messages',
            'Single emoji responses',
            'Messages that don\'t need a response'
        ]
    }
]
```

### Workflow Engine

```python
class WorkflowEngine:
    async def process_interaction(
        self,
        db: AsyncSession,
        interaction: Interaction,
        user_id: UUID
    ) -> Optional[dict]:
        """
        Process an interaction through the workflow system.
        Only ONE workflow runs per interaction (highest priority wins).
        """
        # Skip if already processed
        if interaction.processed_by_workflow_id:
            return None
        
        # Get all active workflows in priority order
        workflows = await db.execute(
            select(Workflow)
            .where(
                Workflow.user_id == user_id,
                Workflow.status == 'active',
                Workflow.is_enabled == True
            )
            .order_by(Workflow.priority.asc())
        )
        
        for workflow in workflows.scalars():
            # Check platform/type filters
            if not self._matches_filters(interaction, workflow):
                continue
            
            # Evaluate natural language conditions
            if not await self._evaluate_conditions(interaction, workflow):
                continue
            
            # Execute action and stop
            result = await self._execute_action(db, interaction, workflow)
            
            # Mark as processed
            interaction.processed_by_workflow_id = workflow.id
            interaction.processed_at = datetime.utcnow()
            
            return result
        
        return None
    
    async def _evaluate_conditions(
        self,
        interaction: Interaction,
        workflow: Workflow
    ) -> bool:
        """Use AI to evaluate if interaction matches workflow conditions."""
        if not workflow.natural_language_conditions:
            return True
        
        prompt = f"""Evaluate if this message matches ALL of these conditions.

Message: "{interaction.content}"
Author: {interaction.author_username}
Platform: {interaction.platform}
Type: {interaction.type}

Conditions to check:
{chr(10).join(f'- {c}' for c in workflow.natural_language_conditions)}

Respond with JSON: {{"matches": true/false, "reason": "brief explanation"}}"""

        response = await anthropic_client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        
        result = json.loads(response.content[0].text)
        return result.get('matches', False)
    
    async def _execute_action(
        self,
        db: AsyncSession,
        interaction: Interaction,
        workflow: Workflow
    ) -> dict:
        """Execute the workflow action."""
        if workflow.action_type == 'auto_moderate':
            return await self._execute_moderation(db, interaction, workflow)
        
        elif workflow.action_type == 'auto_archive':
            interaction.archived_at = datetime.utcnow()
            interaction.archive_source = 'workflow'
            return {'action': 'archived'}
        
        elif workflow.action_type == 'auto_respond':
            template = workflow.action_config.get('template', '')
            return await self._send_response(db, interaction, template, workflow)
        
        elif workflow.action_type == 'generate_response':
            return await self._generate_response(db, interaction, workflow)
```

---

## Phase 7: Response Generation Improvements

### Context Builder

```python
class ResponseContextBuilder:
    """Builds rich context for AI response generation."""
    
    async def build_context(
        self,
        db: AsyncSession,
        interaction: Interaction,
        user: User
    ) -> dict:
        # Get creator profile
        creator_profile = await self._get_creator_profile(db, user)
        
        # Get post/video context
        content_context = None
        if interaction.parent_content_id:
            content_context = {
                'title': interaction.parent_content_title,
                'url': interaction.parent_content_url,
                'thumbnail': interaction.parent_content_thumbnail_url,
                'view_count': interaction.parent_content_view_count
            }
        
        # Get conversation history (for DMs)
        conversation = interaction.conversation_history or []
        
        # Get author context
        author_context = {
            'username': interaction.author_username,
            'name': interaction.author_name,
            'follower_count': interaction.author_follower_count,
            'is_verified': interaction.author_is_verified
        }
        
        return {
            'creator': creator_profile,
            'content': content_context,
            'conversation': conversation,
            'author': author_context,
            'platform': interaction.platform,
            'type': interaction.type
        }
```

### Response Generator

```python
class ResponseGenerator:
    async def generate_response(
        self,
        interaction: Interaction,
        context: dict,
        previous_response: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """Generate a response with proper context and constraints."""
        
        system_prompt = f"""You are responding on behalf of {context['creator']['name']}, a content creator.

Creator Profile:
- Niche: {context['creator'].get('niche', 'general content')}
- Tone: {context['creator'].get('tone', 'friendly and warm')}
- Style: {context['creator'].get('style', 'casual but professional')}

STRICT RULES:
1. Maximum 1-2 sentences
2. Match the creator's typical tone
3. Be genuine and warm
4. Never be promotional
5. No hashtags
6. Maximum 1 emoji (if appropriate)
7. Sound human, not corporate"""

        user_prompt = f"""Generate a response to this {interaction.type} on {interaction.platform}.

"""
        
        if context.get('content'):
            user_prompt += f"""Post/Video Context:
- Title: {context['content']['title']}
- Views: {context['content'].get('view_count', 'N/A')}

"""
        
        if context.get('conversation'):
            user_prompt += f"""Previous messages in conversation:
{self._format_conversation(context['conversation'])}

"""
        
        user_prompt += f"""Commenter: @{context['author']['username']}
{f"Followers: {context['author']['follower_count']:,}" if context['author'].get('follower_count') else ""}
{f"✓ Verified" if context['author'].get('is_verified') else ""}

Their message:
"{interaction.content}"
"""

        if previous_response:
            user_prompt += f"""

IMPORTANT: Generate a DIFFERENT response than this previous one:
"{previous_response}"
"""
            temperature = min(temperature + 0.2, 1.0)  # Increase temperature for variation

        response = await anthropic_client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=100,  # Keep responses short
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        
        return response.content[0].text.strip()
```

---

## Phase 8: Frontend Changes

### View Tabs Component Update

```tsx
// Permanent tabs that always show
const PERMANENT_TABS = [
  { id: 'all', label: 'All', icon: Inbox },
  { id: 'awaiting_approval', label: 'Awaiting Approval', icon: Clock },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'sent', label: 'Sent', icon: CheckCircle },
];

function ViewTabs({ customViews, activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-1 border-b px-4 overflow-x-auto">
      {/* Permanent tabs */}
      {PERMANENT_TABS.map(tab => (
        <TabButton
          key={tab.id}
          active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          <tab.icon className="h-4 w-4 mr-2" />
          {tab.label}
        </TabButton>
      ))}
      
      {/* Divider */}
      <div className="h-6 w-px bg-border mx-2" />
      
      {/* Custom views */}
      {customViews.map(view => (
        <TabButton
          key={view.id}
          active={activeTab === view.id}
          onClick={() => onTabChange(view.id)}
        >
          {view.icon} {view.name}
        </TabButton>
      ))}
    </div>
  );
}
```

### Response UI Fixes

```tsx
function InteractionDetailPanel({ interaction }) {
  const [responseText, setResponseText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Single textarea for response - no separate preview
  return (
    <div className="flex flex-col h-full">
      {/* ... conversation display ... */}
      
      {/* Response area - stable layout */}
      <div className="border-t p-4 bg-background">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isGenerating || !responseText}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setResponseText('')}
            disabled={!responseText}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <Textarea
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          placeholder="Type your response..."
          className="min-h-[100px]"
          disabled={isGenerating}
        />
        
        <div className="flex justify-end mt-2">
          <Button
            onClick={handleSend}
            disabled={!responseText.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Order

### Sprint 1: Schema & Archive (Week 1)
1. Create migration for new Interaction fields
2. Create SentResponse table
3. Implement ArchiveService
4. Add archive settings to user preferences
5. Create Celery task for auto-archive/delete

### Sprint 2: Views & Filters (Week 2)
1. Create system views on user registration
2. Implement FilterCompiler for natural language
3. Update view creation/editing endpoints
4. Update frontend ViewTabs component

### Sprint 3: Workflows (Week 3)
1. Update Workflow model with new fields
2. Create system workflows
3. Implement WorkflowEngine with AI evaluation
4. Build workflow management UI

### Sprint 4: Response Generation (Week 4)
1. Implement ResponseContextBuilder
2. Update ResponseGenerator with constraints
3. Fix regeneration to produce different output
4. Update frontend response UI

### Sprint 5: Data Enrichment (Week 5)
1. Update YouTube mapper for channel info
2. Update Instagram mapper for user profiles
3. Implement conversation history for DMs
4. Add background job for enriching existing data

---

## API Endpoints Summary

### New Endpoints
- `POST /interactions/{id}/archive` - Manual archive
- `POST /interactions/{id}/unarchive` - Restore from archive
- `GET /interactions/sent` - List sent responses
- `POST /views/compile-filter` - Compile natural language filter
- `GET /workflows/system` - List system workflows
- `PUT /workflows/{id}/conditions` - Update workflow conditions
- `PUT /workflows/reorder` - Reorder workflow priorities

### Updated Endpoints
- `GET /interactions` - Add `archived` filter parameter
- `POST /interactions/{id}/generate-response` - Accept `previous_response` for regeneration
- `POST /interactions/{id}/respond` - Track in sent_responses table

---

## Database Schema Summary

### New Tables
- `sent_responses` - Track all sent responses

### Modified Tables
- `interactions` - Add enrichment and archive fields
- `interaction_views` - Add natural language filter fields
- `workflows` - Add priority, conditions, action config
- `user_preferences` - Add archive settings (or create if doesn't exist)

---

## Questions for User

1. **Archive UI**: Should the Archive view have different bulk actions (Restore, Delete Permanently) or the same as other views?

2. **Sent View**: Should the Sent view show the original interaction alongside the response, or just the response with a link to the interaction?

3. **Workflow Priority**: Should users be able to reorder system workflows, or are they always fixed at priority 1-2?

4. **Auto Moderator Actions**: For "delete comment" action, should we actually call the platform API to delete, or just hide it locally?

5. **Response Length**: Is 1-2 sentences the right constraint, or should it vary by platform (e.g., longer for DMs)?
