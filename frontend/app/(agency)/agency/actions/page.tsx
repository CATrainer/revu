'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  FileCheck,
  Handshake,
  Sparkles,
  MessageSquare,
  CheckCircle,
  Search,
  X,
} from 'lucide-react';
import { dashboardApi } from '@/lib/agency-dashboard-api';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// Category type
type ActionCategory = 'approval' | 'task' | 'deal' | 'message';

// Extended action item
interface ActionItem {
  id: string;
  title: string;
  description?: string;
  category: ActionCategory;
  type: string;
  urgency: 'overdue' | 'due_today' | 'due_this_week' | 'upcoming';
  action_url: string;
  days_overdue?: number;
}

// Sample data for categories (in production, these would come from dedicated APIs)
const sampleApprovals: ActionItem[] = [
  {
    id: 'appr-1',
    title: 'Review content from Sarah Chen',
    description: 'Nike Summer Collection - Instagram post draft',
    category: 'approval',
    type: 'content_approval',
    urgency: 'due_today',
    action_url: '/agency/campaigns/camp-1?tab=content',
  },
  {
    id: 'appr-2',
    title: 'Approve creator contract',
    description: 'Mike Johnson - Adidas partnership agreement',
    category: 'approval',
    type: 'contract_approval',
    urgency: 'due_this_week',
    action_url: '/agency/creators/creator-2?tab=contracts',
  },
];

const sampleDeals: ActionItem[] = [
  {
    id: 'deal-1',
    title: 'Deal expiring soon',
    description: 'Samsung Galaxy Z Fold - Awaiting brand response',
    category: 'deal',
    type: 'deal_expiring',
    urgency: 'due_today',
    action_url: '/agency/pipeline?deal=deal-samsung',
  },
  {
    id: 'deal-2',
    title: 'Follow up required',
    description: 'Apple Watch Series 10 - No response in 5 days',
    category: 'deal',
    type: 'deal_follow_up',
    urgency: 'overdue',
    days_overdue: 5,
    action_url: '/agency/pipeline?deal=deal-apple',
  },
];

const sampleMessages: ActionItem[] = [
  {
    id: 'msg-1',
    title: '3 unread from Nike Brand Manager',
    description: '"Can we discuss the campaign timeline?"',
    category: 'message',
    type: 'brand_message',
    urgency: 'due_today',
    action_url: '/agency/messages?thread=nike',
  },
  {
    id: 'msg-2',
    title: 'Creator question from Sarah Chen',
    description: '"What dimensions for the Instagram post?"',
    category: 'message',
    type: 'creator_message',
    urgency: 'overdue',
    days_overdue: 1,
    action_url: '/agency/messages?thread=sarah',
  },
];

// Urgency styling
const getUrgencyStyles = (urgency: string) => {
  switch (urgency) {
    case 'overdue':
      return {
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        border: 'border-l-4 border-l-red-500',
        icon: 'text-red-500',
      };
    case 'due_today':
      return {
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        border: 'border-l-4 border-l-orange-500',
        icon: 'text-orange-500',
      };
    case 'due_this_week':
      return {
        badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        border: 'border-l-4 border-l-yellow-500',
        icon: 'text-yellow-500',
      };
    default:
      return {
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        border: 'border-l-4 border-l-blue-500',
        icon: 'text-blue-500',
      };
  }
};

// Get icon for action category
const getCategoryIcon = (category: ActionCategory) => {
  switch (category) {
    case 'approval':
      return CheckCircle;
    case 'task':
      return FileCheck;
    case 'deal':
      return Handshake;
    case 'message':
      return MessageSquare;
    default:
      return AlertTriangle;
  }
};

// Get category label
const getCategoryLabel = (category: ActionCategory) => {
  switch (category) {
    case 'approval':
      return 'Approval';
    case 'task':
      return 'Task';
    case 'deal':
      return 'Deal';
    case 'message':
      return 'Message';
    default:
      return 'Action';
  }
};

// Get category color
const getCategoryColor = (category: ActionCategory) => {
  switch (category) {
    case 'approval':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'task':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'deal':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'message':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

// Urgency label
const getUrgencyLabel = (urgency: string, daysOverdue?: number) => {
  switch (urgency) {
    case 'overdue':
      return daysOverdue ? `${daysOverdue}d overdue` : 'Overdue';
    case 'due_today':
      return 'Due today';
    case 'due_this_week':
      return 'This week';
    default:
      return 'Upcoming';
  }
};

export default function ActionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ActionCategory | 'all'>('all');

  // Fetch task-type action items from API
  const { data: taskItems, isLoading } = useQuery({
    queryKey: ['dashboard-actions'],
    queryFn: () => dashboardApi.getActionRequired(),
  });

  // Convert API items to ActionItem format
  const convertedTasks: ActionItem[] = React.useMemo(() => {
    if (!taskItems) return [];
    return taskItems.map(item => ({
      ...item,
      category: 'task' as ActionCategory,
    }));
  }, [taskItems]);

  // Combine all action items from different categories
  const allItems: ActionItem[] = React.useMemo(() => {
    return [
      ...sampleApprovals,
      ...convertedTasks,
      ...sampleDeals,
      ...sampleMessages,
    ];
  }, [convertedTasks]);

  // Filter by category and search
  const filteredItems = React.useMemo(() => {
    return allItems.filter(item => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [allItems, activeCategory, searchQuery]);

  // Sort by urgency (overdue first, then due_today, etc.)
  const sortedItems = React.useMemo(() => {
    const urgencyOrder = { overdue: 0, due_today: 1, due_this_week: 2, upcoming: 3 };
    return [...filteredItems].sort((a, b) => 
      (urgencyOrder[a.urgency as keyof typeof urgencyOrder] ?? 4) - 
      (urgencyOrder[b.urgency as keyof typeof urgencyOrder] ?? 4)
    );
  }, [filteredItems]);

  // Group by urgency for section headers
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, ActionItem[]> = {
      overdue: [],
      due_today: [],
      due_this_week: [],
      upcoming: [],
    };
    sortedItems.forEach(item => {
      if (groups[item.urgency]) {
        groups[item.urgency].push(item);
      } else {
        groups.upcoming.push(item);
      }
    });
    return groups;
  }, [sortedItems]);

  // Count by category (from all items, not filtered)
  const categoryCounts = {
    approval: allItems.filter(i => i.category === 'approval').length,
    task: allItems.filter(i => i.category === 'task').length,
    deal: allItems.filter(i => i.category === 'deal').length,
    message: allItems.filter(i => i.category === 'message').length,
  };

  // Render a single action item
  const renderActionItem = (item: ActionItem) => {
    const styles = getUrgencyStyles(item.urgency);
    const Icon = getCategoryIcon(item.category);
    
    return (
      <Link
        key={item.id}
        href={item.action_url}
        className={cn(
          "block bg-card rounded-lg shadow-sm hover:shadow-md transition-all group",
          styles.border
        )}
      >
        <div className="p-4 flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            item.urgency === 'overdue' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'
          )}>
            <Icon className={cn("h-5 w-5", styles.icon)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                {item.title}
              </h3>
              <Badge variant="secondary" className={cn("shrink-0 text-xs", getCategoryColor(item.category))}>
                {getCategoryLabel(item.category)}
              </Badge>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground truncate">
                {item.description}
              </p>
            )}
          </div>

          {/* Urgency Badge */}
          <Badge variant="secondary" className={cn("shrink-0", styles.badge)}>
            {getUrgencyLabel(item.urgency, item.days_overdue)}
          </Badge>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
        </div>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Actions Required</h1>
          <p className="text-muted-foreground">Items that need your attention</p>
        </div>
      </div>

      {/* Quick Summary - Category counts (clickable filters) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
            activeCategory === 'all'
              ? "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 ring-2 ring-gray-400 dark:ring-gray-600"
              : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 hover:border-gray-300"
          )}
        >
          <AlertTriangle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{allItems.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">All</p>
          </div>
        </button>
        <button
          onClick={() => setActiveCategory('approval')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
            activeCategory === 'approval'
              ? "bg-purple-100 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600 ring-2 ring-purple-400 dark:ring-purple-600"
              : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-300"
          )}
        >
          <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <div>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{categoryCounts.approval}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">Approvals</p>
          </div>
        </button>
        <button
          onClick={() => setActiveCategory('task')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
            activeCategory === 'task'
              ? "bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400 dark:ring-blue-600"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300"
          )}
        >
          <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{categoryCounts.task}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Tasks</p>
          </div>
        </button>
        <button
          onClick={() => setActiveCategory('deal')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
            activeCategory === 'deal'
              ? "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 ring-2 ring-green-400 dark:ring-green-600"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300"
          )}
        >
          <Handshake className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{categoryCounts.deal}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Deals</p>
          </div>
        </button>
        <button
          onClick={() => setActiveCategory('message')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
            activeCategory === 'message'
              ? "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-400 dark:border-cyan-600 ring-2 ring-cyan-400 dark:ring-cyan-600"
              : "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 hover:border-cyan-300"
          )}
        >
          <MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{categoryCounts.message}</p>
            <p className="text-xs text-cyan-600 dark:text-cyan-400">Messages</p>
          </div>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search actions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Active Filters */}
      {(activeCategory !== 'all' || searchQuery) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing:</span>
          {activeCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {getCategoryLabel(activeCategory)}
              <button onClick={() => setActiveCategory('all')} className="ml-1 hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <span className="text-muted-foreground">({sortedItems.length} items)</span>
        </div>
      )}

      {/* Action Items List */}
      {sortedItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">All caught up!</h3>
            <p className="text-muted-foreground max-w-sm">
              You don&apos;t have any pending actions. New items will appear here when they need your attention.
            </p>
            <Link href="/agency">
              <Button variant="outline" className="mt-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overdue Section */}
          {groupedItems.overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <h2 className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                  Overdue ({groupedItems.overdue.length})
                </h2>
              </div>
              {groupedItems.overdue.map((item) => renderActionItem(item))}
            </div>
          )}

          {/* Due Today Section */}
          {groupedItems.due_today.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
                  Due Today ({groupedItems.due_today.length})
                </h2>
              </div>
              {groupedItems.due_today.map((item) => renderActionItem(item))}
            </div>
          )}

          {/* Due This Week Section */}
          {groupedItems.due_this_week.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <h2 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">
                  Due This Week ({groupedItems.due_this_week.length})
                </h2>
              </div>
              {groupedItems.due_this_week.map((item) => renderActionItem(item))}
            </div>
          )}

          {/* Upcoming Section */}
          {groupedItems.upcoming.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                  Upcoming ({groupedItems.upcoming.length})
                </h2>
              </div>
              {groupedItems.upcoming.map((item) => renderActionItem(item))}
            </div>
          )}
        </div>
      )}

      {/* Helpful Tip */}
      {sortedItems.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border-purple-200 dark:border-purple-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Pro tip
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Tackle overdue items first! Click any item to take action directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
