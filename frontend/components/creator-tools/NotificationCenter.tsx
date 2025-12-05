'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  MessageSquare,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Calendar,
  Users,
  Settings,
  Loader2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  action_label?: string;
  data?: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  expires_at?: string;
}

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  frequency: 'instant' | 'hourly' | 'daily';
  enabled_types: string[];
}

interface NotificationCenterProps {
  className?: string;
  compact?: boolean;
}

const notificationTypeIcons: Record<string, React.ReactNode> = {
  engagement_spike: <TrendingUp className="h-4 w-4" />,
  new_comment: <MessageSquare className="h-4 w-4" />,
  brand_deal: <DollarSign className="h-4 w-4" />,
  content_alert: <AlertTriangle className="h-4 w-4" />,
  ai_insight: <Sparkles className="h-4 w-4" />,
  calendar_reminder: <Calendar className="h-4 w-4" />,
  superfan_activity: <Users className="h-4 w-4" />,
  system: <Bell className="h-4 w-4" />,
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const priorityBorders: Record<string, string> = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-amber-500',
  urgent: 'border-l-red-500',
};

export function NotificationCenter({ className, compact = false }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/notifications', {
        params: {
          unread_only: filter === 'unread',
          type: typeFilter,
          limit: compact ? 10 : 50,
        },
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Use demo data if API fails
      setNotifications(getDemoNotifications());
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter, compact]);

  const loadPreferences = async () => {
    try {
      const response = await api.get('/creator/notifications/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/creator/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/creator/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      pushToast('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await api.post(`/creator/notifications/${id}/dismiss`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      const response = await api.put('/creator/notifications/preferences', {
        ...preferences,
        ...updates,
      });
      setPreferences(response.data);
      pushToast('Preferences updated', 'success');
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between p-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No notifications
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 cursor-pointer',
                    !notification.is_read && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                >
                  <div className={cn('p-2 rounded-full', priorityColors[notification.priority])}>
                    {notificationTypeIcons[notification.type] || <Bell className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/notifications" className="w-full text-center text-sm text-brand-primary">
              View all notifications
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filter === 'all' ? 'All' : 'Unread'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilter('all')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('unread')}>Unread only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => updatePreferences({ email_enabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Browser push notifications</p>
              </div>
              <Switch
                checked={preferences.push_enabled}
                onCheckedChange={(checked) => updatePreferences({ push_enabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-sm text-muted-foreground">Show notifications in dashboard</p>
              </div>
              <Switch
                checked={preferences.in_app_enabled}
                onCheckedChange={(checked) => updatePreferences({ in_app_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="text-center py-12">
          <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium">No notifications</h3>
          <p className="text-muted-foreground">
            {filter === 'unread' ? "You've read all your notifications!" : 'Nothing here yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                'border-l-4 transition-all hover:shadow-md',
                priorityBorders[notification.priority],
                !notification.is_read && 'bg-blue-50/30 dark:bg-blue-950/10'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-lg flex-shrink-0',
                      priorityColors[notification.priority]
                    )}
                  >
                    {notificationTypeIcons[notification.type] || <Bell className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-primary-dark">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissNotification(notification.id)}
                          title="Dismiss"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </span>
                      {notification.action_url && notification.action_label && (
                        <a
                          href={notification.action_url}
                          className="text-sm text-brand-primary hover:underline font-medium"
                          onClick={() => markAsRead(notification.id)}
                        >
                          {notification.action_label} →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Demo data for fallback
function getDemoNotifications(): Notification[] {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'engagement_spike',
      title: 'Engagement Spike Detected!',
      message: 'Your latest video is getting 3x more comments than average. Time to engage with your audience!',
      priority: 'high',
      action_url: '/interactions',
      action_label: 'View comments',
      is_read: false,
      is_dismissed: false,
      created_at: new Date(now.getTime() - 300000).toISOString(), // 5 mins ago
    },
    {
      id: '2',
      type: 'brand_deal',
      title: 'New Brand Deal Opportunity',
      message: 'TechGadgets Co. is interested in sponsoring your content. Review the offer!',
      priority: 'high',
      action_url: '/deals',
      action_label: 'View deal',
      is_read: false,
      is_dismissed: false,
      created_at: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: '3',
      type: 'superfan_activity',
      title: 'Superfan Alert',
      message: '@TechEnthusiast has commented on 5 of your videos this week. Consider featuring them!',
      priority: 'medium',
      action_url: '/fans',
      action_label: 'View profile',
      is_read: true,
      is_dismissed: false,
      created_at: new Date(now.getTime() - 7200000).toISOString(), // 2 hours ago
    },
    {
      id: '4',
      type: 'ai_insight',
      title: 'Content Performance Insight',
      message: "Videos with 'tutorial' in the title perform 40% better. Consider your next topic!",
      priority: 'low',
      is_read: true,
      is_dismissed: false,
      created_at: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: '5',
      type: 'calendar_reminder',
      title: 'Posting Reminder',
      message: "Best time to post is in 2 hours (6 PM). Your audience is most active then!",
      priority: 'medium',
      action_url: '/calendar',
      action_label: 'Open calendar',
      is_read: false,
      is_dismissed: false,
      created_at: new Date(now.getTime() - 1800000).toISOString(), // 30 mins ago
    },
  ];
}
