'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Clock,
  FileCheck,
  Receipt,
  Check,
  ArrowRight,
  ChevronRight,
  Plus,
  CheckCircle,
} from 'lucide-react';
import type { ActionRequiredItem } from '@/lib/agency-dashboard-api';

interface ActionRequiredWidgetProps {
  items: ActionRequiredItem[];
  isLoading?: boolean;
}

export function ActionRequiredWidget({ items, isLoading = false }: ActionRequiredWidgetProps) {
  // Group items by urgency
  const overdue = items.filter(i => i.urgency === 'overdue');
  const dueToday = items.filter(i => i.urgency === 'due_today');
  const dueThisWeek = items.filter(i => i.urgency === 'due_this_week');

  const totalCount = items.length;

  // Get icon for item type
  const getIcon = (type: string) => {
    switch (type) {
      case 'deliverable':
        return FileCheck;
      case 'invoice':
        return Receipt;
      case 'approval':
        return Clock;
      case 'payment':
        return Receipt;
      default:
        return AlertTriangle;
    }
  };

  // Get urgency config
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return {
          label: 'Overdue',
          badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          dotClass: 'bg-red-500',
          borderClass: 'border-l-red-500',
        };
      case 'due_today':
        return {
          label: 'Due Today',
          badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
          dotClass: 'bg-orange-500',
          borderClass: 'border-l-orange-500',
        };
      case 'due_this_week':
        return {
          label: 'Due This Week',
          badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
          dotClass: 'bg-yellow-500',
          borderClass: 'border-l-yellow-500',
        };
      default:
        return {
          label: '',
          badgeClass: '',
          dotClass: 'bg-gray-500',
          borderClass: '',
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Action Required
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            All Caught Up!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 py-6">
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">No urgent actions required</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Check back later for upcoming items</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderItemGroup = (groupItems: ActionRequiredItem[], groupLabel: string, groupConfig: ReturnType<typeof getUrgencyConfig>) => {
    if (groupItems.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', groupConfig.dotClass)} />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {groupLabel} ({groupItems.length})
          </span>
        </div>
        <div className="space-y-2">
          {groupItems.map(item => {
            const Icon = getIcon(item.type);
            const config = getUrgencyConfig(item.urgency);

            return (
              <Link
                key={item.id}
                href={item.action_url}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                  config.borderClass
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  config.badgeClass
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.title}
                    </p>
                    {item.days_overdue && (
                      <Badge variant="secondary" className={cn('text-xs', config.badgeClass)}>
                        {item.days_overdue}d overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {item.description}
                  </p>
                </div>
                {item.quick_action && (
                  <Button size="sm" variant="outline" className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {item.quick_action}
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Action Required
            <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {totalCount}
            </Badge>
          </CardTitle>
          <Link
            href="/agency/actions"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderItemGroup(overdue, 'Overdue', getUrgencyConfig('overdue'))}
        {renderItemGroup(dueToday, 'Due Today', getUrgencyConfig('due_today'))}
        {renderItemGroup(dueThisWeek, 'Due This Week', getUrgencyConfig('due_this_week'))}
      </CardContent>
    </Card>
  );
}
