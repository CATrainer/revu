'use client';

import { cn } from '@/lib/utils';
import { Inbox, Clock, Archive, CheckCircle, Send } from 'lucide-react';

export type TabType = 'unanswered' | 'awaiting_approval' | 'archive' | 'sent';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
  count?: number;
}

interface ViewTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts?: {
    all?: number;
    unanswered?: number;
    awaiting_approval?: number;
    archive?: number;
    sent?: number;
  };
}

export function ViewTabs({ activeTab, onTabChange, counts }: ViewTabsProps) {
  // Tabs for custom views - these filter within the custom view's criteria
  const tabs: Tab[] = [
    { id: 'unanswered', label: 'Unanswered', icon: Inbox, count: counts?.unanswered },
    { id: 'awaiting_approval', label: 'Awaiting Approval', icon: Clock, count: counts?.awaiting_approval },
    { id: 'archive', label: 'Archive', icon: Archive, count: counts?.archive },
    { id: 'sent', label: 'Sent', icon: CheckCircle, count: counts?.sent },
  ];

  return (
    <div className="border-b border-border">
      <div className="flex gap-1 px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative px-4 py-3 text-sm font-medium transition-colors',
                'hover:text-primary-dark',
                'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2',
                isActive
                  ? 'text-brand-primary'
                  : 'text-secondary-dark'
              )}
            >
              <span className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {typeof tab.count === 'number' && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-xs font-medium',
                      isActive
                        ? 'bg-brand-primary text-white'
                        : 'bg-muted text-secondary-dark'
                    )}
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
