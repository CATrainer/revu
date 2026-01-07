'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Loader2,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

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

// Real release entries only - actual shipped features
const changelog: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: 'January 15, 2025',
    title: 'Initial Release',
    description: 'The first public release of Repruv Agency Management Platform.',
    isLatest: true,
    changes: [
      { type: 'feature', text: 'Agency dashboard with key metrics and analytics' },
      { type: 'feature', text: 'Creator management and roster tracking' },
      { type: 'feature', text: 'Deal pipeline with customizable stages' },
      { type: 'feature', text: 'Campaign tracking and management' },
      { type: 'feature', text: 'Task management system' },
      { type: 'feature', text: 'Finance module with invoicing and payouts' },
      { type: 'feature', text: 'Reporting and analytics' },
      { type: 'feature', text: 'Team collaboration and role-based access' },
      { type: 'feature', text: 'Dark mode support' },
      { type: 'feature', text: 'AI Assistant for agency insights' },
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
  const { user } = useAuth();
  const [expandedVersions, setExpandedVersions] = useState<string[]>([changelog[0].version]);
  const [subscribed, setSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Check if user is already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await fetch('/api/newsletter/status');
        if (response.ok) {
          const data = await response.json();
          setSubscribed(data.subscribed);
          if (user?.email) {
            setEmail(user.email);
          }
        }
      } catch (error) {
        console.error('Failed to check subscription:', error);
      } finally {
        setCheckingSubscription(false);
      }
    };
    checkSubscription();
  }, [user]);

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev =>
      prev.includes(version)
        ? prev.filter(v => v !== version)
        : [...prev, version]
    );
  };

  const handleSubscribe = async () => {
    // If user is logged in, use their email directly
    if (user?.email) {
      await subscribeToNewsletter(user.email);
    } else if (!showEmailInput) {
      // Show email input for non-logged in users
      setShowEmailInput(true);
    } else {
      // Submit the email
      if (!email || !email.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }
      await subscribeToNewsletter(email);
    }
  };

  const subscribeToNewsletter = async (emailAddress: string) => {
    setIsSubscribing(true);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailAddress,
          lists: ['changelog_updates']
        }),
      });

      if (response.ok) {
        setSubscribed(true);
        setShowEmailInput(false);
        toast.success('Successfully subscribed to changelog updates!');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
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
        <div className="flex items-center gap-2">
          {showEmailInput && !user?.email && (
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-48"
            />
          )}
          <Button
            variant={subscribed ? 'outline' : 'default'}
            className={subscribed ? '' : 'bg-green-600 hover:bg-green-700'}
            onClick={handleSubscribe}
            disabled={subscribed || isSubscribing || checkingSubscription}
          >
            {isSubscribing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : subscribed ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            {checkingSubscription ? 'Loading...' : subscribed ? 'Subscribed' : showEmailInput ? 'Subscribe' : 'Get Updates'}
          </Button>
        </div>
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
