'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ArrowRight,
  Video,
  FileCheck,
  DollarSign,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { UpcomingDeadline } from '@/lib/agency-dashboard-api';
import { useCurrency } from '@/contexts/CurrencyContext';

interface UpcomingDeadlinesWidgetProps {
  deadlines: UpcomingDeadline[];
  isLoading?: boolean;
}

// Generate dates for the next 7 days
const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
};

export function UpcomingDeadlinesWidget({ deadlines, isLoading = false }: UpcomingDeadlinesWidgetProps) {
  const [startIndex, setStartIndex] = useState(0);
  const dates = generateDates();
  const visibleDays = 5;

  // Get icon for deadline type
  const getIcon = (type: string) => {
    switch (type) {
      case 'content_posting':
        return Video;
      case 'deliverable':
        return FileCheck;
      case 'payment':
        return DollarSign;
      case 'approval':
        return Clock;
      default:
        return Calendar;
    }
  };

  // Get color for deadline type
  const getColor = (type: string, isOverdue: boolean) => {
    if (isOverdue) return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    switch (type) {
      case 'content_posting':
        return 'text-sky-600 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800';
      case 'deliverable':
        return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800';
      case 'payment':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
      case 'approval':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  // Get deadlines for a specific date
  const getDeadlinesForDate = (date: Date) => {
    return deadlines.filter(d => {
      const deadlineDate = new Date(d.date);
      return deadlineDate.toDateString() === date.toDateString();
    });
  };

  const { formatAmount, currency: userCurrency } = useCurrency();
  const formatCurrency = (value: number) => {
    return formatAmount(value, userCurrency, { decimals: 0 });
  };

  const canScrollLeft = startIndex > 0;
  const canScrollRight = startIndex + visibleDays < dates.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-500" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (deadlines.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-500" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-6">
            <div className="h-14 w-14 rounded-full bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">No upcoming deadlines</p>
              <Link href="/agency/campaigns/new" className="text-sm text-teal-600 hover:underline mt-1 inline-block">Create a campaign to get started</Link>
            </div>
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
            <Calendar className="h-5 w-5 text-teal-500" />
            Upcoming Deadlines
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setStartIndex(Math.max(0, startIndex - 1))}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setStartIndex(Math.min(dates.length - visibleDays, startIndex + 1))}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overdue section */}
        {deadlines.some(d => d.is_overdue) && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Overdue</span>
            </div>
            <div className="space-y-2">
              {deadlines.filter(d => d.is_overdue).map(deadline => {
                const Icon = getIcon(deadline.type);
                const linkUrl = deadline.campaign_id 
                  ? `/agency/campaigns/${deadline.campaign_id}`
                  : deadline.type === 'payment' 
                    ? `/agency/finance/invoices`
                    : `/agency/campaigns`;
                return (
                  <Link
                    key={deadline.id}
                    href={linkUrl}
                    className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{deadline.title}</span>
                    <span className="text-red-400">- {deadline.campaign_name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Today indicator line */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500 z-10" style={{ left: 'calc((100% / 5) / 2 - 1px)' }} />

          <div className="grid grid-cols-5 gap-3">
            {dates.slice(startIndex, startIndex + visibleDays).map((date, index) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const dayDeadlines = getDeadlinesForDate(date).filter(d => !d.is_overdue);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNumber = date.getDate();
              const monthName = date.toLocaleDateString('en-US', { month: 'short' });

              return (
                <div key={date.toISOString()} className="space-y-2">
                  {/* Date header */}
                  <div className={cn(
                    'text-center p-2 rounded-lg',
                    isToday
                      ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  )}>
                    <p className={cn(
                      'text-xs font-medium',
                      isToday ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {isToday ? 'Today' : dayName}
                    </p>
                    <p className={cn(
                      'text-lg font-bold',
                      isToday ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'
                    )}>
                      {dayNumber}
                    </p>
                    <p className={cn(
                      'text-xs',
                      isToday ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                    )}>
                      {monthName}
                    </p>
                  </div>

                  {/* Deadlines */}
                  <div className="space-y-2 min-h-[120px]">
                    {dayDeadlines.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500">No deadlines</p>
                      </div>
                    ) : (
                      dayDeadlines.slice(0, 3).map(deadline => {
                        const Icon = getIcon(deadline.type);
                        const colorClass = getColor(deadline.type, deadline.is_overdue);
                        const linkUrl = deadline.campaign_id 
                          ? `/agency/campaigns/${deadline.campaign_id}`
                          : deadline.type === 'payment' 
                            ? `/agency/finance/invoices`
                            : `/agency/campaigns`;

                        return (
                          <Link
                            key={deadline.id}
                            href={linkUrl}
                            className={cn(
                              'block p-2 rounded-lg border text-xs transition-colors hover:opacity-80',
                              colorClass
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className="h-3 w-3" />
                              <span className="font-medium truncate">{deadline.title}</span>
                            </div>
                            <p className="text-[10px] opacity-75 truncate">
                              {deadline.brand_name}
                              {deadline.creator_name && ` x ${deadline.creator_name}`}
                            </p>
                            {deadline.amount && (
                              <p className="text-[10px] font-medium mt-1">
                                {formatCurrency(deadline.amount)}
                              </p>
                            )}
                          </Link>
                        );
                      })
                    )}
                    {dayDeadlines.length > 3 && (
                      <Link
                        href={`/agency/calendar?date=${date.toISOString()}`}
                        className="block text-xs text-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        +{dayDeadlines.length - 3} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
