'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Users,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  User,
} from 'lucide-react';

interface CreatorAvailabilityWidgetProps {
  isLoading?: boolean;
}

// Sample data for display - in production this would come from API
const sampleCreators = [
  {
    id: '1',
    name: 'Sarah Chen',
    handle: '@sarahcreates',
    avatar: null,
    status: 'available' as const,
    nextBooking: null,
  },
  {
    id: '2', 
    name: 'Mike Johnson',
    handle: '@mikej',
    avatar: null,
    status: 'booked' as const,
    nextBooking: 'Nike Campaign',
  },
  {
    id: '3',
    name: 'Emma Wilson',
    handle: '@emmaw',
    avatar: null,
    status: 'tentative' as const,
    nextBooking: 'Pending confirmation',
  },
  {
    id: '4',
    name: 'Alex Rivera',
    handle: '@alexr',
    avatar: null,
    status: 'unavailable' as const,
    nextBooking: 'On vacation',
  },
];

const statusConfig = {
  available: {
    label: 'Available',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle,
  },
  booked: {
    label: 'Booked',
    color: 'text-sky-700 dark:text-sky-300',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    borderColor: 'border-sky-200 dark:border-sky-800',
    dotColor: 'bg-sky-500',
    icon: Calendar,
  },
  tentative: {
    label: 'Tentative',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    dotColor: 'bg-orange-500',
    icon: Clock,
  },
  unavailable: {
    label: 'Unavailable',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
    dotColor: 'bg-gray-400',
    icon: XCircle,
  },
};

export function CreatorAvailabilityWidget({ isLoading = false }: CreatorAvailabilityWidgetProps) {
  // Count by status
  const availableCount = sampleCreators.filter(c => c.status === 'available').length;
  const bookedCount = sampleCreators.filter(c => c.status === 'booked').length;
  const tentativeCount = sampleCreators.filter(c => c.status === 'tentative').length;
  const unavailableCount = sampleCreators.filter(c => c.status === 'unavailable').length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-500" />
            Creator Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="flex gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-1 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-500" />
            Creator Availability
          </CardTitle>
          <Link
            href="/agency/creators"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary - Horizontal */}
        <div className="grid grid-cols-4 gap-2">
          <Link
            href="/agency/creators?status=available"
            className={cn(
              'p-3 rounded-lg border text-center hover:opacity-80 transition-opacity',
              statusConfig.available.bgColor,
              statusConfig.available.borderColor
            )}
          >
            <p className={cn('text-2xl font-bold', statusConfig.available.color)}>{availableCount}</p>
            <p className={cn('text-xs font-medium', statusConfig.available.color)}>Available</p>
          </Link>
          <Link
            href="/agency/creators?status=booked"
            className={cn(
              'p-3 rounded-lg border text-center hover:opacity-80 transition-opacity',
              statusConfig.booked.bgColor,
              statusConfig.booked.borderColor
            )}
          >
            <p className={cn('text-2xl font-bold', statusConfig.booked.color)}>{bookedCount}</p>
            <p className={cn('text-xs font-medium', statusConfig.booked.color)}>Booked</p>
          </Link>
          <Link
            href="/agency/creators?status=tentative"
            className={cn(
              'p-3 rounded-lg border text-center hover:opacity-80 transition-opacity',
              statusConfig.tentative.bgColor,
              statusConfig.tentative.borderColor
            )}
          >
            <p className={cn('text-2xl font-bold', statusConfig.tentative.color)}>{tentativeCount}</p>
            <p className={cn('text-xs font-medium', statusConfig.tentative.color)}>Tentative</p>
          </Link>
          <Link
            href="/agency/creators?status=unavailable"
            className={cn(
              'p-3 rounded-lg border text-center hover:opacity-80 transition-opacity',
              statusConfig.unavailable.bgColor,
              statusConfig.unavailable.borderColor
            )}
          >
            <p className={cn('text-2xl font-bold', statusConfig.unavailable.color)}>{unavailableCount}</p>
            <p className={cn('text-xs font-medium', statusConfig.unavailable.color)}>Unavailable</p>
          </Link>
        </div>

        {/* Creator List - Horizontal scroll with visible scrollbar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              This Week's Schedule
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Scroll →
            </p>
          </div>
          <div 
            className="flex gap-3 overflow-x-auto pb-3 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(156 163 175) transparent'
            }}
          >
            {sampleCreators.map(creator => {
              const config = statusConfig[creator.status];
              const Icon = config.icon;
              
              return (
                <Link
                  key={creator.id}
                  href={`/agency/creators/${creator.id}`}
                  className={cn(
                    'flex-shrink-0 w-[150px] p-3 rounded-xl border-2 transition-all hover:shadow-lg hover:scale-[1.02]',
                    'bg-white dark:bg-gray-900',
                    config.borderColor
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white dark:ring-gray-800">
                      {creator.avatar ? (
                        <img src={creator.avatar} alt={creator.name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.bgColor, config.color)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
                      {config.label.slice(0, 4)}
                    </div>
                  </div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {creator.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {creator.handle}
                  </p>
                  {creator.nextBooking && (
                    <p className={cn('text-xs mt-2 truncate font-medium', config.color)}>
                      {creator.nextBooking}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href="/agency/creators/availability">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar View
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href="/agency/creators/new">
              <Users className="h-4 w-4 mr-2" />
              Add Creator
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
