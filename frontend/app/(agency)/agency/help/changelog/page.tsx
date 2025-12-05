'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Sparkles,
  Zap,
  Bug,
  Wrench,
  Star,
  ChevronDown,
  ChevronUp,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix' | 'breaking';
    text: string;
  }[];
  isLatest?: boolean;
}

const changelog: ChangelogEntry[] = [
  {
    version: '2.4.0',
    date: 'December 5, 2024',
    title: 'AI Assistant & Task Management',
    description: 'Introducing our new AI-powered assistant and comprehensive task management system.',
    isLatest: true,
    changes: [
      { type: 'feature', text: 'AI Assistant with natural language queries about your agency data' },
      { type: 'feature', text: 'Task management system with auto-generated tasks' },
      { type: 'feature', text: 'Dashboard customization - show/hide widgets' },
      { type: 'improvement', text: 'Enhanced notification system with real-time updates' },
      { type: 'improvement', text: 'Better mobile responsiveness across all pages' },
      { type: 'fix', text: 'Fixed pipeline drag-and-drop issues on Safari' },
    ],
  },
  {
    version: '2.3.0',
    date: 'November 20, 2024',
    title: 'Enhanced Finance Module',
    description: 'Major updates to invoicing, payouts, and financial reporting.',
    changes: [
      { type: 'feature', text: 'Batch payout processing for multiple creators' },
      { type: 'feature', text: 'Invoice templates with custom branding' },
      { type: 'feature', text: 'Financial analytics dashboard' },
      { type: 'improvement', text: 'Faster invoice generation' },
      { type: 'fix', text: 'Fixed currency conversion in multi-currency invoices' },
    ],
  },
  {
    version: '2.2.0',
    date: 'November 5, 2024',
    title: 'Pipeline Improvements',
    description: 'New pipeline views and automation features.',
    changes: [
      { type: 'feature', text: 'List view option for pipeline' },
      { type: 'feature', text: 'Pipeline analytics with conversion tracking' },
      { type: 'feature', text: 'Deal templates for faster creation' },
      { type: 'improvement', text: 'Improved deal card design' },
      { type: 'fix', text: 'Fixed deal sorting by value' },
    ],
  },
  {
    version: '2.1.0',
    date: 'October 15, 2024',
    title: 'Campaign Management',
    description: 'New campaign features and creator availability tracking.',
    changes: [
      { type: 'feature', text: 'Campaign timeline view' },
      { type: 'feature', text: 'Creator availability calendar' },
      { type: 'feature', text: 'Deliverable status tracking' },
      { type: 'improvement', text: 'Better campaign performance metrics' },
      { type: 'fix', text: 'Fixed date picker timezone issues' },
    ],
  },
  {
    version: '2.0.0',
    date: 'October 1, 2024',
    title: 'ReVu Agency 2.0',
    description: 'Complete platform redesign with new features and improved performance.',
    changes: [
      { type: 'feature', text: 'Completely redesigned dashboard' },
      { type: 'feature', text: 'Dark mode support' },
      { type: 'feature', text: 'New reporting engine' },
      { type: 'feature', text: 'Integrations marketplace' },
      { type: 'breaking', text: 'API v1 deprecated - migrate to v2' },
      { type: 'improvement', text: '50% faster page load times' },
    ],
  },
];

const changeTypeConfig = {
  feature: { label: 'New', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Sparkles },
  improvement: { label: 'Improved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Zap },
  fix: { label: 'Fixed', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Bug },
  breaking: { label: 'Breaking', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Wrench },
};

export default function ChangelogPage() {
  const [expandedVersions, setExpandedVersions] = React.useState<string[]>([changelog[0].version]);
  const [subscribed, setSubscribed] = React.useState(false);

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev =>
      prev.includes(version)
        ? prev.filter(v => v !== version)
        : [...prev, version]
    );
  };

  const handleSubscribe = () => {
    setSubscribed(true);
    toast.success('Subscribed to changelog updates!');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">What&apos;s New</h1>
          <p className="text-gray-600 dark:text-gray-400">Stay up to date with the latest updates</p>
        </div>
        <Button
          variant={subscribed ? 'outline' : 'default'}
          className={subscribed ? '' : 'bg-green-600 hover:bg-green-700'}
          onClick={handleSubscribe}
          disabled={subscribed}
        >
          <Bell className="h-4 w-4 mr-2" />
          {subscribed ? 'Subscribed' : 'Get Updates'}
        </Button>
      </div>

      {/* Latest Release Highlight */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-green-600">Latest Release</Badge>
                <span className="text-sm text-gray-500">v{changelog[0].version}</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {changelog[0].title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {changelog[0].description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changelog Timeline */}
      <div className="space-y-4">
        {changelog.map((entry, index) => {
          const isExpanded = expandedVersions.includes(entry.version);
          return (
            <Card key={entry.version}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleVersion(entry.version)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      {index < changelog.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700 mt-1" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">v{entry.version}</CardTitle>
                        {entry.isLatest && (
                          <Badge variant="secondary" className="text-xs">Latest</Badge>
                        )}
                      </div>
                      <CardDescription>
                        {entry.date} - {entry.title}
                      </CardDescription>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {entry.description}
                  </p>
                  <div className="space-y-2">
                    {entry.changes.map((change, changeIndex) => {
                      const config = changeTypeConfig[change.type];
                      const Icon = config.icon;
                      return (
                        <div
                          key={changeIndex}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Badge className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {change.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Feedback CTA */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Have feedback or feature requests?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We&apos;d love to hear from you. Your input shapes our roadmap!
              </p>
            </div>
            <Link href="/agency/help/support">
              <Button className="bg-green-600 hover:bg-green-700">
                Share Feedback
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
