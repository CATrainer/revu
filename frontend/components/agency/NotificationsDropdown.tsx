'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Bell,
  Check,
  CheckCheck,
  FileUp,
  Clock,
  AlertTriangle,
  DollarSign,
  GitBranch,
  MessageSquare,
  TrendingUp,
  Settings,
  Loader2,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/agency-dashboard-api';

// Mock notifications for demonstration
const mockNotifications: Notification[] = [
  {
    id: '1',
    user_id: '1',
    type: 'deliverable_uploaded',
    title: 'Script uploaded',
    description: '@creator1 uploaded script for Brand X campaign',
    link_url: '/agency/campaigns/1',
    is_read: false,
    is_actioned: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
  {
    id: '2',
    user_id: '1',
    type: 'deliverable_due',
    title: 'Script due tomorrow',
    description: 'Brand Y campaign script is due in 24 hours',
    link_url: '/agency/campaigns/2',
    is_read: false,
    is_actioned: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
  },
  {
    id: '3',
    user_id: '1',
    type: 'invoice_paid',
    title: 'Invoice paid',
    description: 'Brand Z paid invoice #2024-045 for 7,500',
    link_url: '/agency/finance/invoices/1',
    is_read: false,
    is_actioned: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: '4',
    user_id: '1',
    type: 'deal_moved',
    title: 'Deal moved to Booked',
    description: 'Brand A deal moved from Negotiating to Booked',
    link_url: '/agency/pipeline/1',
    is_read: true,
    is_actioned: false,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
  },
  {
    id: '5',
    user_id: '1',
    type: 'mention',
    title: 'Peter mentioned you',
    description: 'Peter mentioned you in Brand B campaign notes',
    link_url: '/agency/campaigns/3',
    is_read: true,
    is_actioned: false,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: '6',
    user_id: '1',
    type: 'performance_milestone',
    title: 'Campaign hit 1M views!',
    description: 'Brand X campaign exceeded 1 million views',
    link_url: '/agency/campaigns/1',
    is_read: true,
    is_actioned: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
];

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mentions'>('all');

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const hasUnread = unreadCount > 0;

  // Get icon for notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'deliverable_uploaded':
        return FileUp;
      case 'deliverable_due':
      case 'deliverable_overdue':
        return Clock;
      case 'invoice_paid':
        return DollarSign;
      case 'invoice_overdue':
        return AlertTriangle;
      case 'deal_moved':
      case 'deal_stagnant':
        return GitBranch;
      case 'mention':
      case 'comment':
        return MessageSquare;
      case 'performance_milestone':
        return TrendingUp;
      default:
        return Bell;
    }
  };

  // Get icon color for notification type
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'deliverable_uploaded':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'deliverable_due':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'deliverable_overdue':
      case 'invoice_overdue':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'invoice_paid':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'deal_moved':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'deal_stagnant':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'mention':
      case 'comment':
        return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20';
      case 'performance_milestone':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
    setIsLoading(false);
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.is_read;
    if (activeTab === 'mentions') return n.type === 'mention' || n.type === 'comment';
    return true;
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = 'Older';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={isLoading}
                className="text-xs h-7"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread' | 'mentions')}>
          <TabsList className="w-full grid grid-cols-3 h-10 rounded-none border-b border-gray-200 dark:border-gray-800 bg-transparent">
            <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-green-600">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-green-600">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="mentions" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-green-600">
              Mentions
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <div className="max-h-[400px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                Object.entries(groupedNotifications).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {group}
                      </span>
                    </div>
                    {items.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const colorClass = getNotificationColor(notification.type);

                      return (
                        <Link
                          key={notification.id}
                          href={notification.link_url || '#'}
                          onClick={() => markAsRead(notification.id)}
                          className={cn(
                            'flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                            !notification.is_read && 'bg-green-50/50 dark:bg-green-900/10'
                          )}
                        >
                          <div className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            colorClass
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                'text-sm text-gray-900 dark:text-gray-100',
                                !notification.is_read && 'font-medium'
                              )}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {notification.description}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <Link
            href="/agency/settings/notifications"
            className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Settings className="h-4 w-4" />
            Notification Settings
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
