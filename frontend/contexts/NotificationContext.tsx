'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

// =============================================================================
// Types
// =============================================================================

export interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  action_label?: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  is_dismissed: boolean;
  data: Record<string, any>;
  created_at: string;
}

export interface AgencyNotification {
  id: string;
  type: string;
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  link_url?: string;
  icon?: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  is_actioned: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface NotificationPreferences {
  in_app_enabled: boolean;
  email_enabled: boolean;
  email_frequency: 'instant' | 'daily_digest';
  digest_hour: number;
  type_settings: Record<string, { in_app?: boolean; email?: boolean }>;
  muted_entities: Array<{ type: string; id: string }>;
}

export interface NotificationTypeInfo {
  id: string;
  title: string;
  category: string;
  default_in_app: boolean;
  default_email: boolean;
  icon?: string;
}

export interface NotificationCategory {
  id: string;
  name: string;
  types: NotificationTypeInfo[];
}

interface NotificationContextValue {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  notificationTypes: NotificationCategory[];

  // Actions
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  
  // Preferences
  fetchPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  fetchNotificationTypes: () => Promise<void>;
}

// =============================================================================
// Context
// =============================================================================

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// =============================================================================
// Provider
// =============================================================================

interface NotificationProviderProps {
  children: ReactNode;
  isAgency?: boolean;
}

export function NotificationProvider({ children, isAgency = false }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notificationTypes, setNotificationTypes] = useState<NotificationCategory[]>([]);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const baseUrl = isAgency ? '/api/agency/notifications' : '/api/notifications';

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (unreadOnly) params.set('unread_only', 'true');
      
      const response = await fetch(`${baseUrl}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Notification fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  // Refresh unread count only (lightweight)
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/unread-count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.error('Unread count fetch error:', err);
    }
  }, [baseUrl]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${baseUrl}/${id}/read`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to mark as read');
      
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  }, [baseUrl]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/read-all`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to mark all as read');
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  }, [baseUrl]);

  // Dismiss notification
  const dismissNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${baseUrl}/${id}/dismiss`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to dismiss');
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Refresh count in case it was unread
      refreshUnreadCount();
    } catch (err) {
      console.error('Dismiss error:', err);
    }
  }, [baseUrl, refreshUnreadCount]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/preferences`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (err) {
      console.error('Preferences fetch error:', err);
    }
  }, [baseUrl]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch(`${baseUrl}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (err) {
      console.error('Preferences update error:', err);
      throw err;
    }
  }, [baseUrl]);

  // Fetch notification types
  const fetchNotificationTypes = useCallback(async () => {
    try {
      const dashboard = isAgency ? 'agency' : 'creator';
      const response = await fetch(`${baseUrl}/types?dashboard=${dashboard}`);
      if (response.ok) {
        const data = await response.json();
        setNotificationTypes(data);
      }
    } catch (err) {
      console.error('Notification types fetch error:', err);
    }
  }, [baseUrl, isAgency]);

  // Set up polling for unread count
  useEffect(() => {
    // Initial fetch
    refreshUnreadCount();
    fetchPreferences();

    // Poll every 30 seconds
    pollingIntervalRef.current = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [refreshUnreadCount, fetchPreferences]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isLoading,
    error,
    preferences,
    notificationTypes,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshUnreadCount,
    fetchPreferences,
    updatePreferences,
    fetchNotificationTypes,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// =============================================================================
// Utility Hook for Notification Bell
// =============================================================================

export function useNotificationBell() {
  const { unreadCount, refreshUnreadCount, markAllAsRead } = useNotifications();
  
  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    refresh: refreshUnreadCount,
    markAllAsRead,
  };
}
