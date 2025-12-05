'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  BookOpen,
  Users,
  Megaphone,
  GitBranch,
  DollarSign,
  FileText,
  Settings,
  Zap,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const documentationSections = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of managing your agency',
    icon: Zap,
    articles: [
      'Setting up your agency profile',
      'Inviting team members',
      'Connecting integrations',
      'Understanding the dashboard',
    ],
  },
  {
    title: 'Pipeline Management',
    description: 'Master your deal flow',
    icon: GitBranch,
    articles: [
      'Creating and managing deals',
      'Customizing pipeline stages',
      'Deal automation rules',
      'Pipeline analytics',
    ],
  },
  {
    title: 'Campaign Management',
    description: 'Run successful campaigns',
    icon: Megaphone,
    articles: [
      'Creating a campaign',
      'Managing deliverables',
      'Tracking campaign performance',
      'Client reporting',
    ],
  },
  {
    title: 'Creator Management',
    description: 'Build and manage your roster',
    icon: Users,
    articles: [
      'Adding creators to your roster',
      'Tracking creator availability',
      'Performance analytics',
      'Contract management',
    ],
  },
  {
    title: 'Finance & Invoicing',
    description: 'Handle payments and reporting',
    icon: DollarSign,
    articles: [
      'Creating invoices',
      'Managing payouts',
      'Financial reporting',
      'Tax documentation',
    ],
  },
  {
    title: 'Reports & Analytics',
    description: 'Generate insights',
    icon: FileText,
    articles: [
      'Creating custom reports',
      'Scheduling automated reports',
      'Understanding metrics',
      'Exporting data',
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
      section.articles.some(article => article.toLowerCase().includes(query))
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
          <p className="text-gray-600 dark:text-gray-400">Learn how to use ReVu Agency</p>
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

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Quick Start Guide
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          API Reference
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Community Forum
        </Button>
      </div>

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
                    <li key={article}>
                      <button className="flex items-center justify-between w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                        <span>{article}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
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
                Our support team is here to help you get the most out of ReVu.
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
