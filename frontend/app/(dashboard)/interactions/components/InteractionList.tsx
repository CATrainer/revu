"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCheck, 
  Archive, 
  Trash2, 
  MessageSquare,
  Heart,
  MoreVertical,
  Instagram,
  Youtube,
  Twitter,
  RefreshCw,
  Send,
  RotateCcw,
  Sparkles,
  User,
  Bot,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Simple time ago helper
const formatDistanceToNow = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// View mode types for different permanent views
type ViewMode = 'all' | 'awaiting_approval' | 'archive' | 'sent' | 'custom';

interface Interaction {
  id: string;
  platform: string;
  type: string;
  content: string;
  author_name?: string;
  author_username?: string;
  author_avatar_url?: string;
  author_is_verified: boolean;
  sentiment?: string;
  priority_score: number;
  status: string;
  like_count: number;
  reply_count: number;
  created_at: string;
  parent_content_title?: string;
  // For awaiting approval / sent views
  pending_response?: {
    content: string;
    generated_at: string;
    workflow_name?: string;
  };
  last_response?: {
    content: string;
    sent_at: string;
    response_type: 'manual' | 'semi_automated' | 'automated';
  };
  archived_at?: string;
}

interface InteractionListProps {
  viewId: string;
  viewName?: string;
  filters?: any;
  sortBy?: string;
  tab?: string;
  platforms?: string[];
  onInteractionClick?: (id: string) => void;
}

export default function InteractionList({ 
  viewId, 
  viewName,
  filters, 
  sortBy = 'newest',
  tab,
  platforms = [],
  onInteractionClick,
}: InteractionListProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Determine view mode based on view name
  const getViewMode = (): ViewMode => {
    const name = viewName?.toLowerCase() || '';
    if (name === 'all') return 'all';
    if (name === 'awaiting approval') return 'awaiting_approval';
    if (name === 'archive') return 'archive';
    if (name === 'sent') return 'sent';
    return 'custom';
  };

  const viewMode = getViewMode();

  useEffect(() => {
    loadInteractions();
  }, [viewId, page, sortBy, tab, platforms]);

  const loadInteractions = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
        sort_by: sortBy,
      });
      
      if (tab) {
        params.append('tab', tab);
      }
      
      if (platforms.length > 0) {
        platforms.forEach(p => params.append('platforms', p));
      }
      
      const response = await api.get(
        `/interactions/by-view/${viewId}?${params.toString()}`
      );
      
      setInteractions(response.data.interactions || []);
      setTotal(response.data.total || 0);
      setHasMore(response.data.has_more || false);
    } catch (error) {
      console.error('Failed to load interactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === interactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(interactions.map(i => i.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;
    
    try {
      await api.post('/interactions/bulk-action', {
        interaction_ids: Array.from(selectedIds),
        action,
      });
      
      setSelectedIds(new Set());
      loadInteractions();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.post(`/interactions/${id}/archive`);
      loadInteractions();
    } catch (error) {
      console.error('Failed to archive:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/interactions/${id}/unarchive`);
      loadInteractions();
    } catch (error) {
      console.error('Failed to restore:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this?')) return;
    try {
      await api.delete(`/interactions/${id}`);
      loadInteractions();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleQuickApprove = async (id: string) => {
    setSendingIds(prev => new Set(prev).add(id));
    try {
      await api.post(`/interactions/${id}/approve-response`);
      loadInteractions();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-gray-400';
  };

  const getResponseTypeBadge = (type: 'manual' | 'semi_automated' | 'automated') => {
    switch (type) {
      case 'automated':
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
            <Bot className="h-3 w-3" />
            Auto
          </Badge>
        );
      case 'semi_automated':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1">
            <Sparkles className="h-3 w-3" />
            AI Assisted
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 gap-1">
            <User className="h-3 w-3" />
            Manual
          </Badge>
        );
    }
  };

  // Get bulk actions based on view mode
  const getBulkActions = () => {
    switch (viewMode) {
      case 'archive':
        return (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBulkAction('unarchive')}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Forever
            </Button>
          </>
        );
      case 'awaiting_approval':
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleBulkAction('approve_all')}
          >
            <Send className="h-4 w-4 mr-2" />
            Approve All
          </Button>
        );
      default:
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleBulkAction('archive')}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        );
    }
  };

  // Get dropdown actions based on view mode
  const getDropdownActions = (interaction: Interaction) => {
    switch (viewMode) {
      case 'archive':
        return (
          <>
            <DropdownMenuItem onClick={() => handleRestore(interaction.id)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(interaction.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Forever
            </DropdownMenuItem>
          </>
        );
      case 'awaiting_approval':
        return (
          <>
            <DropdownMenuItem onClick={() => handleQuickApprove(interaction.id)}>
              <Send className="h-4 w-4 mr-2" />
              Approve & Send
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInteractionClick?.(interaction.id)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Edit Response
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleArchive(interaction.id)}>
              <Archive className="h-4 w-4 mr-2" />
              Dismiss
            </DropdownMenuItem>
          </>
        );
      case 'sent':
        return (
          <>
            <DropdownMenuItem onClick={() => onInteractionClick?.(interaction.id)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              View Conversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleArchive(interaction.id)}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </>
        );
      default:
        return (
          <>
            <DropdownMenuItem onClick={() => handleArchive(interaction.id)}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(interaction.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        );
    }
  };

  // Render interaction card based on view mode
  const renderInteractionCard = (interaction: Interaction) => {
    const isSelected = selectedIds.has(interaction.id);
    const isSending = sendingIds.has(interaction.id);

    switch (viewMode) {
      case 'awaiting_approval':
        return renderAwaitingApprovalCard(interaction, isSelected, isSending);
      case 'archive':
        return renderArchiveCard(interaction, isSelected);
      case 'sent':
        return renderSentCard(interaction, isSelected);
      default:
        return renderDefaultCard(interaction, isSelected);
    }
  };

  // Awaiting Approval: Show incoming + proposed response with quick approve
  const renderAwaitingApprovalCard = (interaction: Interaction, isSelected: boolean, isSending: boolean) => (
    <div
      key={interaction.id}
      className={cn(
        "border-b px-6 py-5 hover:bg-muted/50 transition-all",
        isSelected && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => handleSelectOne(interaction.id)}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          {/* Incoming Message */}
          <div className="flex items-start gap-3 mb-4">
            {interaction.author_avatar_url ? (
              <img
                src={interaction.author_avatar_url}
                alt={interaction.author_name || 'User'}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs font-medium">
                  {(interaction.author_name || interaction.author_username || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {interaction.author_name || interaction.author_username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(interaction.created_at))}
                </span>
                {getPlatformIcon(interaction.platform)}
              </div>
              <div className="bg-muted/50 rounded-lg rounded-tl-none p-3 text-sm">
                {interaction.content}
              </div>
            </div>
          </div>

          {/* Proposed Response */}
          {interaction.pending_response && (
            <div className="flex items-start gap-3 ml-8">
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-3 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                    <Clock className="h-3 w-3" />
                    Pending Approval
                  </Badge>
                  {interaction.pending_response.workflow_name && (
                    <span className="text-xs text-muted-foreground">
                      via {interaction.pending_response.workflow_name}
                    </span>
                  )}
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg rounded-tl-none p-3 text-sm">
                  {interaction.pending_response.content}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Approve Button */}
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => handleQuickApprove(interaction.id)}
            disabled={isSending}
            className="gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onInteractionClick?.(interaction.id)}
            className="text-xs"
          >
            Edit
          </Button>
        </div>
      </div>
    </div>
  );

  // Archive: Show last message only with restore/delete
  const renderArchiveCard = (interaction: Interaction, isSelected: boolean) => {
    const lastMessage = interaction.last_response?.content || interaction.content;
    const isOutgoing = !!interaction.last_response;

    return (
      <div
        key={interaction.id}
        className={cn(
          "border-b px-6 py-4 hover:bg-muted/50 transition-colors opacity-75 hover:opacity-100",
          isSelected && "bg-primary/5 opacity-100"
        )}
      >
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => handleSelectOne(interaction.id)}
            className="mt-1"
          />

          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onInteractionClick?.(interaction.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              {isOutgoing ? (
                <Badge variant="outline" className="text-xs">You replied</Badge>
              ) : (
                <span className="font-medium text-sm">
                  {interaction.author_name || interaction.author_username}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(interaction.archived_at || interaction.created_at))}
              </span>
              {getPlatformIcon(interaction.platform)}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {lastMessage}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRestore(interaction.id)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {getDropdownActions(interaction)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  // Sent: Show last outgoing message with response type indicator
  const renderSentCard = (interaction: Interaction, isSelected: boolean) => (
    <div
      key={interaction.id}
      className={cn(
        "border-b px-6 py-4 hover:bg-muted/50 transition-colors",
        isSelected && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => handleSelectOne(interaction.id)}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          {/* Original message preview */}
          <div 
            className="cursor-pointer"
            onClick={() => onInteractionClick?.(interaction.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">
                Replied to {interaction.author_name || interaction.author_username}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(interaction.last_response?.sent_at || interaction.created_at))}
              </span>
              {getPlatformIcon(interaction.platform)}
            </div>

            {/* Your response */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">Your Response</span>
                  {interaction.last_response && getResponseTypeBadge(interaction.last_response.response_type)}
                </div>
                <p className="text-sm text-primary-dark line-clamp-2">
                  {interaction.last_response?.content || 'Response sent'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {getDropdownActions(interaction)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // Default: Standard interaction card for All view and custom views
  const renderDefaultCard = (interaction: Interaction, isSelected: boolean) => (
    <div
      key={interaction.id}
      className={cn(
        "border-b px-6 py-4 hover:bg-muted/50 transition-colors",
        isSelected && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => handleSelectOne(interaction.id)}
          className="mt-1"
        />

        <div className={cn("mt-1", getPriorityColor(interaction.priority_score))}>
          <div className="h-2 w-2 rounded-full bg-current" />
        </div>

        {interaction.author_avatar_url ? (
          <img
            src={interaction.author_avatar_url}
            alt={interaction.author_name || 'User'}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-medium">
              {(interaction.author_name || interaction.author_username || '?')[0].toUpperCase()}
            </span>
          </div>
        )}

        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onInteractionClick?.(interaction.id)}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {interaction.author_name || interaction.author_username}
            </span>
            {interaction.author_is_verified && (
              <CheckCheck className="h-4 w-4 text-blue-500" />
            )}
            <span className="text-xs text-muted-foreground">
              @{interaction.author_username}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(interaction.created_at))}
            </span>
            <div className="ml-2">
              {getPlatformIcon(interaction.platform)}
            </div>
          </div>

          {interaction.parent_content_title && (
            <div className="text-xs text-muted-foreground mb-1">
              On: {interaction.parent_content_title}
            </div>
          )}

          <p className="text-sm text-primary-dark line-clamp-2 mb-2">
            {interaction.content}
          </p>

          <div className="flex items-center gap-4 mt-2">
            {interaction.like_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="h-3 w-3" />
                {interaction.like_count}
              </span>
            )}
            {interaction.reply_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {interaction.reply_count}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {getDropdownActions(interaction)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // Empty state varies by view
  const getEmptyState = () => {
    switch (viewMode) {
      case 'awaiting_approval':
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />,
          title: "All Caught Up!",
          description: "No responses waiting for your approval."
        };
      case 'archive':
        return {
          icon: <Archive className="h-16 w-16 text-muted-foreground mb-4" />,
          title: "Archive Empty",
          description: "Archived conversations will appear here."
        };
      case 'sent':
        return {
          icon: <Send className="h-16 w-16 text-muted-foreground mb-4" />,
          title: "No Sent Responses",
          description: "Responses you've sent will appear here."
        };
      default:
        return {
          icon: <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />,
          title: "No Interactions Found",
          description: "No interactions match your filters yet."
        };
    }
  };

  if (isLoading && interactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (interactions.length === 0) {
    const emptyState = getEmptyState();
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        {emptyState.icon}
        <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
        <p className="text-muted-foreground mb-4">{emptyState.description}</p>
        <Button onClick={loadInteractions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary text-primary-foreground px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            {getBulkActions()}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center gap-4 bg-muted/30">
        <Checkbox
          checked={selectedIds.size === interactions.length && interactions.length > 0}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          {total} {viewMode === 'awaiting_approval' ? 'pending' : viewMode === 'sent' ? 'sent' : 'interactions'}
        </span>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={loadInteractions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Interaction List */}
      <div className="flex-1 overflow-y-auto">
        {interactions.map(renderInteractionCard)}
      </div>

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="border-t px-6 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
