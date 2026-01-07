'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  Users,
  Megaphone,
  GitBranch,
  DollarSign,
  ChevronRight,
  Bot,
  LayoutDashboard,
  ListTodo,
  FileBarChart,
  Zap,
} from 'lucide-react';

const documentationSections = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of managing your agency',
    icon: Zap,
    articles: [
      { title: 'Setting up your agency profile', href: '#' },
      { title: 'Inviting team members', href: '#' },
      { title: 'Understanding the dashboard', href: '#' },
      { title: 'Navigation and shortcuts', href: '#' },
    ],
  },
  {
    title: 'Dashboard & Overview',
    description: 'Your agency command center',
    icon: LayoutDashboard,
    articles: [
      { title: 'Understanding key metrics', href: '#' },
      { title: 'Customizing your dashboard', href: '#' },
      { title: 'Activity feed and notifications', href: '#' },
      { title: 'Quick actions and shortcuts', href: '#' },
    ],
  },
  {
    title: 'Pipeline Management',
    description: 'Master your deal flow',
    icon: GitBranch,
    articles: [
      { title: 'Creating and managing deals', href: '#' },
      { title: 'Customizing pipeline stages', href: '#' },
      { title: 'Deal automation rules', href: '#' },
      { title: 'Pipeline analytics and forecasting', href: '#' },
    ],
  },
  {
    title: 'Campaign Management',
    description: 'Run successful campaigns',
    icon: Megaphone,
    articles: [
      { title: 'Creating a campaign', href: '#' },
      { title: 'Managing deliverables', href: '#' },
      { title: 'Campaign timeline view', href: '#' },
      { title: 'Using campaign templates', href: '#' },
    ],
  },
  {
    title: 'Creator Management',
    description: 'Build and manage your roster',
    icon: Users,
    articles: [
      { title: 'Adding creators to your roster', href: '#' },
      { title: 'Tracking creator availability', href: '#' },
      { title: 'Performance analytics', href: '#' },
      { title: 'Creator groups and tags', href: '#' },
    ],
  },
  {
    title: 'Task Management',
    description: 'Stay organized and on track',
    icon: ListTodo,
    articles: [
      { title: 'Creating and assigning tasks', href: '#' },
      { title: 'Auto-generated tasks', href: '#' },
      { title: 'Task priorities and due dates', href: '#' },
      { title: 'Team task views', href: '#' },
    ],
  },
  {
    title: 'Finance & Invoicing',
    description: 'Handle payments and reporting',
    icon: DollarSign,
    articles: [
      { title: 'Creating invoices', href: '#' },
      { title: 'Managing creator payouts', href: '#' },
      { title: 'Financial analytics', href: '#' },
      { title: 'Currency settings', href: '#' },
    ],
  },
  {
    title: 'Reports & Analytics',
    description: 'Generate insights',
    icon: FileBarChart,
    articles: [
      { title: 'Creating custom reports', href: '#' },
      { title: 'Scheduling automated reports', href: '#' },
      { title: 'Understanding metrics', href: '#' },
      { title: 'Exporting data', href: '#' },
    ],
  },
  {
    title: 'AI Assistant',
    description: 'Your intelligent agency helper',
    icon: Bot,
    articles: [
      { title: 'Getting started with the assistant', href: '#' },
      { title: 'Asking questions about your data', href: '#' },
      { title: 'Generating insights and reports', href: '#' },
      { title: 'Tips for better responses', href: '#' },
    ],
  },
];

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredSections = documentationSections.filter(section => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.articles.some(article => article.title.toLowerCase().includes(query))
    );
  });

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documentation</h1>
          <p className="text-gray-600 dark:text-gray-400">Learn how to use Repruv Agency</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search documentation..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Coming Soon Notice */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Documentation in Progress:</strong> We&apos;re working on comprehensive guides for every feature. 
            In the meantime, explore the sections below or contact support for help.
          </p>
        </CardContent>
      </Card>

      {/* Documentation Sections */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.articles.map((article) => (
                    <li key={article.title}>
                      <Link 
                        href={article.href}
                        className="flex items-center justify-between w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors group"
                      >
                        <span>{article.title}</span>
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Still Need Help */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Can&apos;t find what you&apos;re looking for?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Our support team is here to help you get the most out of Repruv.
              </p>
            </div>
            <Link href="/agency/help/support">
              <Button className="bg-green-600 hover:bg-green-700">
                Contact Support
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
