'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Bell,
  Check,
  CheckCheck,
  TrendingUp,
  Flame,
  Trophy,
  Star,
  Heart,
  AlertTriangle,
  AtSign,
  Handshake,
  DollarSign,
  RefreshCw,
  CheckCircle,
  Sparkles,
  Clock,
  Link as LinkIcon,
  Unlink,
  AlertCircle,
  Mail,
  Clipboard,
  Settings,
  Loader2,
  X,
} from 'lucide-react';
import { useNotifications, type Notification } from '@/contexts/NotificationContext';

// Icon mapping for notification types
const notificationIcons: Record<string, React.ElementType> = {
  engagement_spike: TrendingUp,
  viral_content: Flame,
  content_milestone: Trophy,
  new_superfan: Star,
  superfan_activity: Heart,
  negative_sentiment_spike: AlertTriangle,
  brand_mention: AtSign,
  collab_opportunity: Handshake,
  deal_offer: DollarSign,
  deal_status_change: RefreshCw,
  payment_received: CheckCircle,
  ai_insight: Sparkles,
  posting_reminder: Clock,
  platform_connected: LinkIcon,
  platform_disconnected: Unlink,
  sync_error: AlertCircle,
  agency_invitation: Mail,
  agency_task_assigned: Clipboard,
};

// Color mapping for notification types
const notificationColors: Record<string, string> = {
  engagement_spike: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  viral_content: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  content_milestone: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
  new_superfan: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  superfan_activity: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20',
  negative_sentiment_spike: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  brand_mention: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  collab_opportunity: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
  deal_offer: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  deal_status_change: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
  payment_received: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  ai_insight: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20',
  posting_reminder: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  platform_connected: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  platform_disconnected: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  sync_error: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  agency_invitation: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  agency_task_assigned: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
};

// Priority border colors
const priorityBorders: Record<string, string> = {
  urgent: 'border-l-4 border-l-red-500',
  high: 'border-l-4 border-l-orange-500',
  normal: '',
  low: '',
};

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(activeTab === 'unread');
    }
  }, [isOpen, activeTab, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    await markAllAsRead();
    setMarkingAllRead(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      setIsOpen(false);
    }
  };

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

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  // Group by date
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
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="text-xs h-7"
              >
                {markingAllRead ? (
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
          <TabsList className="w-full grid grid-cols-2 h-10 rounded-none border-b border-gray-200 dark:border-gray-800 bg-transparent">
            <TabsTrigger 
              value="all" 
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-green-600"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="unread" 
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-green-600"
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                </div>
              ) : filteredNotifications.length === 0 ? (
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
                      const Icon = notificationIcons[notification.type] || Bell;
                      const colorClass = notificationColors[notification.type] || 'text-gray-600 bg-gray-50 dark:bg-gray-800';
                      const priorityClass = priorityBorders[notification.priority] || '';

                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            'relative flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer',
                            !notification.is_read && 'bg-green-50/50 dark:bg-green-900/10',
                            priorityClass
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className={cn(
                            'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
                            colorClass
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {notification.action_url ? (
                                  <Link
                                    href={notification.action_url}
                                    className={cn(
                                      'text-sm text-gray-900 dark:text-gray-100 hover:underline',
                                      !notification.is_read && 'font-medium'
                                    )}
                                  >
                                    {notification.title}
                                  </Link>
                                ) : (
                                  <p className={cn(
                                    'text-sm text-gray-900 dark:text-gray-100',
                                    !notification.is_read && 'font-medium'
                                  )}>
                                    {notification.title}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!notification.is_read && (
                                  <span className="h-2 w-2 rounded-full bg-green-500" />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissNotification(notification.id);
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3 text-gray-400" />
                                </button>
                              </div>
                            </div>
                            {notification.message && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
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
            href="/settings?tab=Notifications"
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
