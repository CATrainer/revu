'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

// Sample calendar events
const sampleEvents = [
  {
    id: '1',
    title: 'Nike Campaign Deadline',
    type: 'deadline' as const,
    date: new Date(2026, 0, 8),
    campaign: 'Nike Summer Collection',
    campaignId: 'camp-1',
  },
  {
    id: '2',
    title: 'Content Review - Adidas',
    type: 'review' as const,
    date: new Date(2026, 0, 10),
    campaign: 'Adidas Spring Launch',
    campaignId: 'camp-2',
  },
  {
    id: '3',
    title: 'Creator Call - Sarah',
    type: 'meeting' as const,
    date: new Date(2026, 0, 6),
    creator: 'Sarah Chen',
    creatorId: 'creator-1',
  },
  {
    id: '4',
    title: 'Invoice Due - Nike',
    type: 'payment' as const,
    date: new Date(2026, 0, 15),
    campaign: 'Nike Summer Collection',
    campaignId: 'camp-1',
  },
  {
    id: '5',
    title: 'Campaign Launch',
    type: 'launch' as const,
    date: new Date(2026, 0, 20),
    campaign: 'Spotify Q1',
    campaignId: 'camp-3',
  },
];

const eventTypeConfig = {
  deadline: { color: 'bg-red-500', label: 'Deadline' },
  review: { color: 'bg-blue-500', label: 'Review' },
  meeting: { color: 'bg-purple-500', label: 'Meeting' },
  payment: { color: 'bg-green-500', label: 'Payment' },
  launch: { color: 'bg-orange-500', label: 'Launch' },
};

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date();
  
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [view, setView] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date) => {
    return sampleEvents.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your campaigns, deadlines, and meetings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-xl font-semibold">
                {monthNames[month]} {year}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <div className="flex border rounded-lg overflow-hidden">
                <Button 
                  variant={view === 'month' ? 'default' : 'ghost'} 
                  size="sm"
                  className="rounded-none"
                  onClick={() => setView('month')}
                >
                  Month
                </Button>
                <Button 
                  variant={view === 'week' ? 'default' : 'ghost'} 
                  size="sm"
                  className="rounded-none"
                  onClick={() => setView('week')}
                >
                  Week
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
            {dayNames.map(day => (
              <div 
                key={day} 
                className="bg-gray-50 dark:bg-gray-800 p-3 text-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
            {calendarDays.map((date, index) => (
              <div 
                key={index}
                className={`
                  bg-white dark:bg-gray-900 min-h-[100px] p-2
                  ${date && isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                {date && (
                  <>
                    <div className={`
                      text-sm font-medium mb-1
                      ${isToday(date) 
                        ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' 
                        : 'text-gray-700 dark:text-gray-300'}
                    `}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {getEventsForDate(date).slice(0, 3).map(event => {
                        const config = eventTypeConfig[event.type];
                        return (
                          <Link
                            key={event.id}
                            href={event.campaignId ? `/agency/campaigns/${event.campaignId}` : '#'}
                            className={`
                              block text-xs p-1 rounded truncate text-white
                              ${config.color} hover:opacity-80 transition-opacity
                            `}
                          >
                            {event.title}
                          </Link>
                        );
                      })}
                      {getEventsForDate(date).length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{getEventsForDate(date).length - 3} more
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            {Object.entries(eventTypeConfig).map(([type, config]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded ${config.color}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{config.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sampleEvents
              .filter(event => {
                const now = new Date();
                const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                return event.date >= now && event.date <= weekFromNow;
              })
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map(event => {
                const config = eventTypeConfig[event.type];
                return (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <span className={`w-2 h-2 rounded-full ${config.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {event.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{config.label}</Badge>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
