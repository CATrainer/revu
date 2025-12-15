'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Activity,
  ArrowRight,
  GitBranch,
  FileUp,
  DollarSign,
  BarChart3,
  Video,
  UserPlus,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import type { ActivityItem } from '@/lib/agency-dashboard-api';

interface RecentActivityWidgetProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

export function RecentActivityWidget({ activities, isLoading = false }: RecentActivityWidgetProps) {
  const [filter, setFilter] = useState<string>('all');
  const [newCount, setNewCount] = useState(0);

  // Get icon for activity type
  const getIcon = (type: string) => {
    switch (type) {
      case 'deal_moved':
        return GitBranch;
      case 'deliverable_uploaded':
        return FileUp;
      case 'invoice_paid':
        return DollarSign;
      case 'report_generated':
        return BarChart3;
      case 'content_posted':
        return Video;
      case 'creator_added':
        return UserPlus;
      case 'comment_added':
        return MessageSquare;
      default:
        return Activity;
    }
  };

  // Get color for activity type
  const getColor = (type: string) => {
    switch (type) {
      case 'deal_moved':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'deliverable_uploaded':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'invoice_paid':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'report_generated':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'content_posted':
        return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20';
      case 'creator_added':
        return 'text-pink-600 bg-pink-50 dark:bg-pink-900/20';
      case 'comment_added':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Group activities by time
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = 'This Week';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(activity);
    return groups;
  }, {} as Record<string, ActivityItem[]>);

  // Filter activities
  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => {
      if (filter === 'deals') return a.type === 'deal_moved';
      if (filter === 'deliverables') return a.type === 'deliverable_uploaded' || a.type === 'content_posted';
      if (filter === 'financial') return a.type === 'invoice_paid';
      if (filter === 'team') return a.type === 'creator_added' || a.type === 'comment_added';
      return true;
    });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-500" />
            Recent Activity
            {newCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-cyan-600 hover:text-cyan-700"
                onClick={() => setNewCount(0)}
              >
                {newCount} new
              </Button>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mt-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'deals', label: 'Deals' },
            { key: 'deliverables', label: 'Deliverables' },
            { key: 'financial', label: 'Financial' },
            { key: 'team', label: 'Team' },
          ].map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-cyan-100 dark:bg-cyan-900/20 p-4 mb-4">
              <Activity className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              Start creating campaigns, managing deals, and working with creators to see activity here.
            </p>
            <Link href="/agency/campaigns/new">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {Object.entries(groupedActivities).map(([group, items]) => {
            const groupItems = items.filter(item => filteredActivities.includes(item));
            if (groupItems.length === 0) return null;

            return (
              <div key={group}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {group}
                </p>
                <div className="space-y-2">
                  {groupItems.map(activity => {
                    const Icon = getIcon(activity.type);
                    const colorClass = getColor(activity.type);

                    return (
                      <Link
                        key={activity.id}
                        href={activity.link_url || '#'}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                      >
                        <div className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          colorClass
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {activity.actor_avatar ? (
                              <img
                                src={activity.actor_avatar}
                                alt={activity.actor_name}
                                className="h-4 w-4 rounded-full"
                              />
                            ) : (
                              <span className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-medium text-gray-500">
                                {activity.actor_name.charAt(0)}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {activity.actor_name}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-2" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
