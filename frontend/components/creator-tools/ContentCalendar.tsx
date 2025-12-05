'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Image,
  FileText,
  Youtube,
  Instagram,
  PlayCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Edit,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

interface CalendarEntry {
  id: string;
  title: string;
  description?: string;
  platform: string;
  content_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: 'idea' | 'drafting' | 'ready' | 'scheduled' | 'published';
  notes?: string;
  tags?: string[];
}

interface BestTime {
  day: string;
  hour: number;
  score: number;
  audience_active: number;
}

interface ContentCalendarProps {
  className?: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4 text-red-500" />,
  instagram: <Instagram className="h-4 w-4 text-pink-500" />,
  tiktok: <PlayCircle className="h-4 w-4" />,
};

const contentTypeIcons: Record<string, React.ReactNode> = {
  video: <Video className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  story: <FileText className="h-4 w-4" />,
  short: <PlayCircle className="h-4 w-4" />,
  reel: <PlayCircle className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  idea: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  drafting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ready: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  scheduled: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ContentCalendar({ className }: ContentCalendarProps) {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    loadCalendar();
    loadBestTimes();
  }, [currentDate]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await api.get('/creator/calendar', {
        params: {
          start_date: startOfMonth.toISOString(),
          end_date: endOfMonth.toISOString(),
        },
      });
      setEntries(response.data.entries || []);
    } catch (error) {
      console.error('Failed to load calendar:', error);
      setEntries(getDemoEntries());
    } finally {
      setLoading(false);
    }
  };

  const loadBestTimes = async () => {
    try {
      const response = await api.get('/creator/calendar/best-times');
      setBestTimes(response.data.best_times || []);
    } catch (error) {
      console.error('Failed to load best times:', error);
      setBestTimes(getDemoBestTimes());
    }
  };

  const handleCreateEntry = async (data: Partial<CalendarEntry>) => {
    try {
      const response = await api.post('/creator/calendar', data);
      setEntries([...entries, response.data]);
      setShowAddEntry(false);
      pushToast('Content scheduled!', 'success');
    } catch (error) {
      console.error('Failed to create entry:', error);
      pushToast('Failed to schedule content', 'error');
    }
  };

  const handleUpdateEntry = async (id: string, data: Partial<CalendarEntry>) => {
    try {
      const response = await api.put(`/creator/calendar/${id}`, data);
      setEntries(entries.map((e) => (e.id === id ? response.data : e)));
      setEditingEntry(null);
      pushToast('Entry updated!', 'success');
    } catch (error) {
      console.error('Failed to update entry:', error);
      pushToast('Failed to update entry', 'error');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this calendar entry?')) return;

    try {
      await api.delete(`/creator/calendar/${id}`);
      setEntries(entries.filter((e) => e.id !== id));
      pushToast('Entry deleted', 'success');
    } catch (error) {
      console.error('Failed to delete entry:', error);
      pushToast('Failed to delete entry', 'error');
    }
  };

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentDate]);

  const getEntriesForDate = (date: Date) => {
    return entries.filter((entry) => {
      const entryDate = new Date(entry.scheduled_date);
      return (
        entryDate.getDate() === date.getDate() &&
        entryDate.getMonth() === date.getMonth() &&
        entryDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatTime = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Content Calendar</h1>
          <p className="text-sm text-muted-foreground">Plan and schedule your content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button onClick={() => setShowAddEntry(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Content
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">
                    {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {daysOfWeek.map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((date, idx) => {
                      if (!date) {
                        return <div key={`empty-${idx}`} className="h-24" />;
                      }

                      const dayEntries = getEntriesForDate(date);
                      const isCurrentDay = isToday(date);
                      const isSelected = selectedDate && date.getTime() === selectedDate.getTime();

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            setSelectedDate(date);
                            if (dayEntries.length === 0) {
                              setShowAddEntry(true);
                            }
                          }}
                          className={cn(
                            'h-24 p-1 rounded-lg border text-left transition-colors hover:bg-muted/50',
                            isCurrentDay && 'border-primary bg-primary/5',
                            isSelected && 'ring-2 ring-primary',
                            !isCurrentDay && !isSelected && 'border-muted'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                isCurrentDay && 'text-primary'
                              )}
                            >
                              {date.getDate()}
                            </span>
                            {dayEntries.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {dayEntries.length}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 space-y-1 overflow-hidden">
                            {dayEntries.slice(0, 2).map((entry) => (
                              <div
                                key={entry.id}
                                className={cn(
                                  'text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1',
                                  statusColors[entry.status]
                                )}
                              >
                                {platformIcons[entry.platform]}
                                <span className="truncate">{entry.title}</span>
                              </div>
                            ))}
                            {dayEntries.length > 2 && (
                              <div className="text-xs text-muted-foreground pl-1">
                                +{dayEntries.length - 2} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Best Times to Post */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Best Times to Post
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bestTimes.slice(0, 5).map((time, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{time.day}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(time.hour)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        {time.score}%
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {time.audience_active}% active
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          {selectedDate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getEntriesForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      No content scheduled
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowAddEntry(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Content
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getEntriesForDate(selectedDate).map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {platformIcons[entry.platform]}
                            <span className="font-medium text-sm">{entry.title}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingEntry(entry)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={cn('text-xs px-2 py-0.5 rounded', statusColors[entry.status])}>
                            {entry.status}
                          </span>
                          {entry.scheduled_time && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {entry.scheduled_time}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusColors).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', color.split(' ')[0])} />
                    <span className="text-xs capitalize">{status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Entry Dialog */}
      <CalendarEntryDialog
        open={showAddEntry || !!editingEntry}
        onClose={() => {
          setShowAddEntry(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
        defaultDate={selectedDate}
        onSave={(data) => {
          if (editingEntry) {
            handleUpdateEntry(editingEntry.id, data);
          } else {
            handleCreateEntry(data);
          }
        }}
      />
    </div>
  );
}

interface CalendarEntryDialogProps {
  open: boolean;
  onClose: () => void;
  entry: CalendarEntry | null;
  defaultDate: Date | null;
  onSave: (data: Partial<CalendarEntry>) => void;
}

function CalendarEntryDialog({
  open,
  onClose,
  entry,
  defaultDate,
  onSave,
}: CalendarEntryDialogProps) {
  const [formData, setFormData] = useState<Partial<CalendarEntry>>({
    title: '',
    platform: 'youtube',
    content_type: 'video',
    status: 'idea',
    scheduled_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setFormData(entry);
    } else if (defaultDate) {
      setFormData({
        title: '',
        platform: 'youtube',
        content_type: 'video',
        status: 'idea',
        scheduled_date: defaultDate.toISOString().split('T')[0],
      });
    } else {
      setFormData({
        title: '',
        platform: 'youtube',
        content_type: 'video',
        status: 'idea',
        scheduled_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [entry, defaultDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Content' : 'Schedule Content'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., iPhone 15 Review"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Platform</label>
              <Select
                value={formData.platform}
                onValueChange={(v) => setFormData({ ...formData, platform: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Content Type</label>
              <Select
                value={formData.content_type}
                onValueChange={(v) => setFormData({ ...formData, content_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="short">Short/Reel</SelectItem>
                  <SelectItem value="image">Image Post</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={formData.scheduled_date?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Time (optional)</label>
              <Input
                type="time"
                value={formData.scheduled_time || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v as CalendarEntry['status'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="drafting">Drafting</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.title}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {entry ? 'Update' : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getDemoEntries(): CalendarEntry[] {
  const today = new Date();
  return [
    {
      id: '1',
      title: 'iPhone 15 Review',
      platform: 'youtube',
      content_type: 'video',
      scheduled_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2).toISOString(),
      scheduled_time: '10:00',
      status: 'drafting',
    },
    {
      id: '2',
      title: 'Weekly Q&A',
      platform: 'youtube',
      content_type: 'video',
      scheduled_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5).toISOString(),
      scheduled_time: '14:00',
      status: 'idea',
    },
    {
      id: '3',
      title: 'Tech setup tour',
      platform: 'tiktok',
      content_type: 'short',
      scheduled_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
      status: 'ready',
    },
    {
      id: '4',
      title: 'Behind the scenes',
      platform: 'instagram',
      content_type: 'story',
      scheduled_date: today.toISOString(),
      status: 'scheduled',
    },
  ];
}

function getDemoBestTimes(): BestTime[] {
  return [
    { day: 'Wednesday', hour: 18, score: 95, audience_active: 78 },
    { day: 'Saturday', hour: 11, score: 92, audience_active: 82 },
    { day: 'Thursday', hour: 17, score: 88, audience_active: 71 },
    { day: 'Sunday', hour: 14, score: 85, audience_active: 75 },
    { day: 'Tuesday', hour: 19, score: 82, audience_active: 68 },
  ];
}
