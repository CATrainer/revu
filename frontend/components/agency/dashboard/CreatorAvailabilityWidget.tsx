'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Users,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface CreatorAvailabilityWidgetProps {
  isLoading?: boolean;
}

// Mock data for demonstration
const mockStats = {
  available: 12,
  booked: 8,
  unavailable: 3,
};

const mockWeekCapacity = [
  { day: 'Mon', date: 15, capacity: 40, booked: 3 },
  { day: 'Tue', date: 16, capacity: 60, booked: 5 },
  { day: 'Wed', date: 17, capacity: 80, booked: 7 },
  { day: 'Thu', date: 18, capacity: 50, booked: 4 },
  { day: 'Fri', date: 19, capacity: 30, booked: 2 },
  { day: 'Sat', date: 20, capacity: 10, booked: 1 },
  { day: 'Sun', date: 21, capacity: 10, booked: 1 },
];

const mockAvailableCreators = [
  { id: '1', name: 'John Smith', handle: '@johnsmith', platform: 'YouTube', availableDays: 'Mon-Fri' },
  { id: '2', name: 'Jane Doe', handle: '@janedoe', platform: 'Instagram', availableDays: 'Wed-Sun' },
  { id: '3', name: 'Mike Johnson', handle: '@mikej', platform: 'TikTok', availableDays: 'Mon-Thu' },
  { id: '4', name: 'Sarah Williams', handle: '@sarahw', platform: 'YouTube', availableDays: 'Tue-Sat' },
  { id: '5', name: 'Chris Brown', handle: '@chrisb', platform: 'Instagram', availableDays: 'Mon-Fri' },
];

export function CreatorAvailabilityWidget({ isLoading = false }: CreatorAvailabilityWidgetProps) {
  const today = new Date();
  const todayDay = today.getDay();

  // Get capacity color
  const getCapacityColor = (capacity: number) => {
    if (capacity < 40) return 'bg-green-500';
    if (capacity < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Creator Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="flex gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-1 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
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
            <Calendar className="h-5 w-5 text-indigo-500" />
            Creator Availability - This Week
          </CardTitle>
          <Link
            href="/agency/creators/availability"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            View Calendar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {mockStats.available}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Available</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {mockStats.booked}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Booked</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <XCircle className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {mockStats.unavailable}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unavailable</p>
            </div>
          </div>
        </div>

        {/* Week Capacity */}
        <div className="grid grid-cols-7 gap-1">
          {mockWeekCapacity.map((day, index) => {
            const isToday = index === (todayDay === 0 ? 6 : todayDay - 1);
            const color = getCapacityColor(day.capacity);

            return (
              <Link
                key={day.day}
                href={`/agency/creators/availability?date=${day.date}`}
                className={cn(
                  'p-2 rounded-lg text-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                  isToday && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900'
                )}
              >
                <p className={cn(
                  'text-xs font-medium',
                  isToday ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'
                )}>
                  {day.day}
                </p>
                <p className={cn(
                  'text-sm font-bold mt-1',
                  isToday ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                )}>
                  {day.date}
                </p>
                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', color)}
                    style={{ width: `${day.capacity}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {day.capacity}% booked
                </p>
              </Link>
            );
          })}
        </div>

        {/* Available Creators */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            Available This Week
          </p>
          <div className="space-y-2">
            {mockAvailableCreators.slice(0, 5).map(creator => (
              <Link
                key={creator.id}
                href={`/agency/creators/${creator.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                  {creator.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {creator.handle}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {creator.platform}
                  </p>
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                  {creator.availableDays}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/agency/creators/availability?filter=available"
            className="mt-3 flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            View All Available
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Low Availability Alert */}
        {mockStats.available < 5 && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Low availability this week
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
              Only {mockStats.available} creators are available for new campaigns
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
