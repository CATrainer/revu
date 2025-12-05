'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Play,
  Clock,
  CheckCircle2,
  PlayCircle,
  Bookmark,
  Filter,
} from 'lucide-react';

const tutorials = [
  {
    id: '1',
    title: 'Getting Started with ReVu Agency',
    description: 'A complete walkthrough of setting up your agency dashboard',
    duration: '8:24',
    thumbnail: '/tutorials/getting-started.jpg',
    category: 'Basics',
    completed: true,
    progress: 100,
  },
  {
    id: '2',
    title: 'Managing Your Deal Pipeline',
    description: 'Learn how to create, move, and track deals through your pipeline',
    duration: '12:15',
    thumbnail: '/tutorials/pipeline.jpg',
    category: 'Pipeline',
    completed: true,
    progress: 100,
  },
  {
    id: '3',
    title: 'Creating Your First Campaign',
    description: 'Step-by-step guide to launching a successful influencer campaign',
    duration: '15:42',
    thumbnail: '/tutorials/campaigns.jpg',
    category: 'Campaigns',
    completed: false,
    progress: 45,
  },
  {
    id: '4',
    title: 'Creator Roster Management',
    description: 'How to add, organize, and track your creator relationships',
    duration: '10:30',
    thumbnail: '/tutorials/creators.jpg',
    category: 'Creators',
    completed: false,
    progress: 0,
  },
  {
    id: '5',
    title: 'Financial Overview & Invoicing',
    description: 'Master invoices, payouts, and financial reporting',
    duration: '18:20',
    thumbnail: '/tutorials/finance.jpg',
    category: 'Finance',
    completed: false,
    progress: 0,
  },
  {
    id: '6',
    title: 'Generating Reports',
    description: 'Create custom reports and schedule automated delivery',
    duration: '11:45',
    thumbnail: '/tutorials/reports.jpg',
    category: 'Reports',
    completed: false,
    progress: 0,
  },
  {
    id: '7',
    title: 'Advanced Pipeline Automation',
    description: 'Set up automatic deal progression and notifications',
    duration: '14:10',
    thumbnail: '/tutorials/automation.jpg',
    category: 'Advanced',
    completed: false,
    progress: 0,
  },
  {
    id: '8',
    title: 'Integrations Deep Dive',
    description: 'Connect Stripe, Google, Slack, and more',
    duration: '20:00',
    thumbnail: '/tutorials/integrations.jpg',
    category: 'Advanced',
    completed: false,
    progress: 0,
  },
];

const categories = ['All', 'Basics', 'Pipeline', 'Campaigns', 'Creators', 'Finance', 'Reports', 'Advanced'];

export default function TutorialsPage() {
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [bookmarked, setBookmarked] = React.useState<string[]>([]);

  const filteredTutorials = selectedCategory === 'All'
    ? tutorials
    : tutorials.filter(t => t.category === selectedCategory);

  const completedCount = tutorials.filter(t => t.completed).length;
  const overallProgress = Math.round((completedCount / tutorials.length) * 100);

  const toggleBookmark = (id: string) => {
    setBookmarked(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Video Tutorials</h1>
          <p className="text-gray-600 dark:text-gray-400">Learn ReVu through guided video lessons</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Your Learning Progress
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {completedCount} of {tutorials.length} tutorials completed
              </p>
              <Progress value={overallProgress} className="h-2" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{overallProgress}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Tutorials Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTutorials.map((tutorial) => (
          <Card key={tutorial.id} className="overflow-hidden hover:shadow-md transition-shadow">
            {/* Thumbnail Placeholder */}
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
              </div>
              {tutorial.completed && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-green-600 text-white gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </Badge>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-black/40 hover:bg-black/60"
                  onClick={() => toggleBookmark(tutorial.id)}
                >
                  <Bookmark
                    className={`h-4 w-4 ${bookmarked.includes(tutorial.id) ? 'fill-white text-white' : 'text-white'}`}
                  />
                </Button>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {tutorial.duration}
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                  {tutorial.title}
                </h3>
                <Badge variant="secondary" className="flex-shrink-0">
                  {tutorial.category}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                {tutorial.description}
              </p>
              {tutorial.progress > 0 && tutorial.progress < 100 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{tutorial.progress}%</span>
                  </div>
                  <Progress value={tutorial.progress} className="h-1" />
                </div>
              )}
              {tutorial.progress === 0 && (
                <Button className="w-full bg-green-600 hover:bg-green-700 gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Start Watching
                </Button>
              )}
              {tutorial.progress > 0 && tutorial.progress < 100 && (
                <Button className="w-full mt-2 bg-green-600 hover:bg-green-700 gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Continue Watching
                </Button>
              )}
              {tutorial.completed && (
                <Button variant="outline" className="w-full gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Watch Again
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
