'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for creators
const mockCreators = [
  { id: '1', name: 'Alex Johnson', handle: '@alexj', avatar: null },
  { id: '2', name: 'Sarah Miller', handle: '@sarahm', avatar: null },
  { id: '3', name: 'Mike Chen', handle: '@mikec', avatar: null },
  { id: '4', name: 'Emma Davis', handle: '@emmad', avatar: null },
  { id: '5', name: 'Chris Wilson', handle: '@chrisw', avatar: null },
];

// Generate days of the month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export default function CreatorAvailabilityPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Mock availability data
  const getAvailabilityStatus = (creatorId: string, day: number): 'available' | 'busy' | 'tentative' | null => {
    const hash = (creatorId.charCodeAt(0) + day) % 10;
    if (hash < 5) return 'available';
    if (hash < 7) return 'busy';
    if (hash < 9) return 'tentative';
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Creator Availability</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            View and manage creator availability across dates
          </p>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {monthName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Busy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Tentative</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-900 min-w-[150px]">
                    Creator
                  </th>
                  {Array.from({ length: Math.min(daysInMonth, 14) }, (_, i) => i + 1).map(day => (
                    <th key={day} className="p-2 border-b font-medium text-gray-600 dark:text-gray-400 text-center min-w-[40px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockCreators.map(creator => (
                  <tr key={creator.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-2 border-b sticky left-0 bg-white dark:bg-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-medium">
                          {creator.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{creator.name}</p>
                          <p className="text-xs text-gray-500">{creator.handle}</p>
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: Math.min(daysInMonth, 14) }, (_, i) => i + 1).map(day => {
                      const status = getAvailabilityStatus(creator.id, day);
                      return (
                        <td key={day} className="p-2 border-b text-center">
                          {status && (
                            <div className={cn(
                              'w-3 h-3 rounded-full mx-auto',
                              status === 'available' && 'bg-green-500',
                              status === 'busy' && 'bg-red-500',
                              status === 'tentative' && 'bg-yellow-500'
                            )} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
