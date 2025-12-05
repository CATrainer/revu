'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock campaign timeline data
const campaigns = [
  {
    id: '1',
    name: 'Summer Launch 2024',
    brand: 'TechBrand',
    startDate: '2024-12-01',
    endDate: '2024-12-15',
    status: 'active',
    color: 'bg-green-500',
  },
  {
    id: '2',
    name: 'Holiday Gift Guide',
    brand: 'GiftCo',
    startDate: '2024-12-05',
    endDate: '2024-12-20',
    status: 'active',
    color: 'bg-blue-500',
  },
  {
    id: '3',
    name: 'Q1 Brand Awareness',
    brand: 'StyleBrand',
    startDate: '2024-12-10',
    endDate: '2024-12-25',
    status: 'upcoming',
    color: 'bg-purple-500',
  },
  {
    id: '4',
    name: 'New Year Campaign',
    brand: 'FitnessPro',
    startDate: '2024-12-20',
    endDate: '2025-01-05',
    status: 'upcoming',
    color: 'bg-orange-500',
  },
];

export default function CampaignTimelinePage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1);

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Get days array for the month
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Get campaigns that overlap with current month
  const getVisibleCampaigns = () => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    return campaigns.filter(campaign => {
      const start = new Date(campaign.startDate);
      const end = new Date(campaign.endDate);
      return start <= monthEnd && end >= monthStart;
    });
  };

  const getCampaignPosition = (campaign: typeof campaigns[0]) => {
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const effectiveStart = start < monthStart ? 1 : start.getDate();
    const effectiveEnd = end > monthEnd ? daysInMonth : end.getDate();

    const left = ((effectiveStart - 1) / daysInMonth) * 100;
    const width = ((effectiveEnd - effectiveStart + 1) / daysInMonth) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  const visibleCampaigns = getVisibleCampaigns();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Campaign Timeline</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Visual overview of campaign schedules
          </p>
        </div>
      </div>

      {/* Timeline */}
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
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days header */}
          <div className="flex border-b mb-4 overflow-x-auto">
            {days.map(day => {
              const date = new Date(year, month, day);
              const isToday = date.toDateString() === new Date().toDateString();
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={day}
                  className={cn(
                    'flex-1 min-w-[40px] text-center py-2 text-sm',
                    isToday && 'bg-green-50 dark:bg-green-900/20 font-bold text-green-600',
                    isWeekend && !isToday && 'text-gray-400'
                  )}
                >
                  <div className="text-xs text-gray-400 mb-1">
                    {date.toLocaleString('en-US', { weekday: 'short' }).charAt(0)}
                  </div>
                  {day}
                </div>
              );
            })}
          </div>

          {/* Campaign bars */}
          <div className="space-y-3 relative">
            {visibleCampaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No campaigns scheduled for this month
              </div>
            ) : (
              visibleCampaigns.map((campaign, index) => {
                const position = getCampaignPosition(campaign);

                return (
                  <div key={campaign.id} className="relative h-12">
                    <div
                      className={cn(
                        'absolute h-10 rounded-lg flex items-center px-3 text-white text-sm font-medium shadow-sm cursor-pointer hover:opacity-90 transition-opacity',
                        campaign.color
                      )}
                      style={{
                        left: position.left,
                        width: position.width,
                        minWidth: '80px',
                      }}
                    >
                      <div className="truncate">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <p className="text-xs opacity-80 truncate">{campaign.brand}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500">In Progress</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500">Upcoming</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleCampaigns.map(campaign => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('w-3 h-3 rounded-full', campaign.color)} />
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-gray-500">{campaign.brand}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {new Date(campaign.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {' - '}
                  {new Date(campaign.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
