"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  CheckCheck, 
  Archive, 
  Trash2, 
  Tag,
  MessageSquare,
  Heart,
  MoreVertical,
  Instagram,
  Youtube,
  Twitter,
  RefreshCw
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
  tags?: string[];
  like_count: number;
  reply_count: number;
  created_at: string;
  read_at?: string;
  parent_content_title?: string;
}

interface InteractionListProps {
  viewId: string;
  filters?: any;
  sortBy?: string;
  tab?: string;
  platforms?: string[];
  onInteractionClick?: (id: string) => void;
}

export default function InteractionList({ 
  viewId, 
  filters, 
  sortBy = 'newest',
  tab,
  platforms = [],
  onInteractionClick,
}: InteractionListProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadInteractions();
  }, [viewId, page, sortBy, tab, platforms]);

  const loadInteractions = async () => {
    try {
      setIsLoading(true);
      
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
        sort_by: sortBy,
      });
      
      if (tab) params.append('tab', tab);
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
      alert('Failed to perform bulk action');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/interactions/${id}`, { status: 'read' });
      loadInteractions();
    } catch (error) {
      console.error('Failed to mark as read:', error);
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

  if (isLoading && interactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Interactions Found</h3>
        <p className="text-secondary-dark mb-4">
          No interactions match your filters yet.
        </p>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBulkAction('mark_read')}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark Read
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBulkAction('archive')}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
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
          {total} interactions
        </span>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={loadInteractions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Interaction List */}
      <div className="flex-1 overflow-y-auto">
        {interactions.map((interaction) => {
          const isSelected = selectedIds.has(interaction.id);
          const isUnread = interaction.status === 'unread';
          
          return (
            <div
              key={interaction.id}
              className={cn(
                "border-b px-6 py-4 hover:bg-muted/50 transition-colors",
                isUnread && "bg-blue-50/50 dark:bg-blue-950/20",
                isSelected && "bg-primary/5"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleSelectOne(interaction.id)}
                  className="mt-1"
                />

                {/* Priority Indicator */}
                <div className={cn("mt-1", getPriorityColor(interaction.priority_score))}>
                  <div className="h-2 w-2 rounded-full bg-current" />
                </div>

                {/* Author Avatar */}
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

                {/* Content - Clickable */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onInteractionClick?.(interaction.id)}
                >
                  {/* Header */}
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

                  {/* Parent Content */}
                  {interaction.parent_content_title && (
                    <div className="text-xs text-muted-foreground mb-1">
                      On: {interaction.parent_content_title}
                    </div>
                  )}

                  {/* Message Content */}
                  <p className="text-sm text-primary-dark line-clamp-2 mb-2">
                    {interaction.content}
                  </p>

                  {/* Tags */}
                  {interaction.tags && interaction.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {interaction.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Engagement */}
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

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isUnread && (
                      <DropdownMenuItem onClick={() => handleMarkRead(interaction.id)}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark as Read
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Tag className="h-4 w-4 mr-2" />
                      Add Tag
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
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
