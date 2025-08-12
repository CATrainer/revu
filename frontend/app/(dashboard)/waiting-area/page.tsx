'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Zap, Check, MessageSquare } from 'lucide-react';
import { AccountDropdown } from '@/components/layout/AccountDropdown';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import Link from 'next/link';
import { api } from '@/lib/api';

interface UserStatus {
  access_status: string;
  can_access_dashboard: boolean;
  joined_waiting_list_at: string | null;
  early_access_granted_at: string | null;
  demo_requested: boolean;
  demo_requested_at: string | null;
}

export default function WaitingAreaPage() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [demoRequested, setDemoRequested] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch user's access status
    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/auth/me/access-status');
        const data = await response.json();
        setUserStatus(data);
        setDemoRequested(data.demo_requested);
      } catch (error) {
        console.error('Failed to fetch user status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStatus();
  }, []);

  const handleRequestDemo = async () => {
    try {
      await api.post('/auth/request-demo', { message: '' });
      setDemoRequested(true);
    } catch (error) {
      console.error('Failed to request demo:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 spinner-border"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-background">
      {/* Header */}
      <div className="nav-background shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold brand-text">Repruv</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="brand-background text-[var(--brand-primary)] px-4 py-2 rounded-full">
                <AccountDropdown variant="waiting" />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-dark mb-4">Welcome to Repruv!</h1>
          <p className="text-lg text-secondary-dark">
            You&apos;re on our exclusive waiting list. Here&apos;s what&apos;s coming...
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <Card className="mb-8 dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-dark">
              <Users className="h-5 w-5 brand-text" />
              Your Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-primary-dark mb-2">Position in Queue</h3>
                <p className="text-2xl font-bold brand-text">#42</p>
                <p className="text-sm text-secondary-dark mt-1">
                  Joined on {userStatus?.joined_waiting_list_at ? 
                    new Date(userStatus.joined_waiting_list_at).toLocaleDateString() : 
                    'Today'
                  }
                </p>
              </div>
              <div>
                <h3 className="font-medium text-primary-dark mb-2">Estimated Launch</h3>
                <p className="text-2xl font-bold status-success">Q4 2025</p>
                <p className="text-sm text-secondary-dark mt-1">
                  We&apos;re working hard to get you early access!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Request */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 brand-text" />
              Book a Demo
            </CardTitle>
            <CardDescription>
              Want to see Repruv in action? Book a personalized demo with our team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!demoRequested ? (
              <Button onClick={handleRequestDemo} className="w-full sm:w-auto">
                <Calendar className="h-4 w-4 mr-2" />
                Request Demo Call
              </Button>
            ) : (
              <div className="flex items-center gap-2 status-success">
                <Check className="h-5 w-5" />
                <span>Demo requested! We&apos;ll contact you soon.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Preview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary-dark mb-6">Pricing Plans</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <div className="text-3xl font-bold">$29<span className="text-lg font-normal text-secondary-dark">/month</span></div>
                <CardDescription>Perfect for small businesses</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Up to 100 reviews/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">AI response generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">2 platform connections</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Basic analytics</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="border-brand relative">
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                                <div className="text-3xl font-bold">$79<span className="text-lg font-normal text-secondary-dark">/month</span></div>
                <CardDescription>For growing businesses</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Up to 500 reviews/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Advanced AI responses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">5 platform connections</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Competitor tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Advanced analytics</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                                <div className="text-3xl font-bold">$199<span className="text-lg font-normal text-secondary-dark">/month</span></div>
                <CardDescription>For large organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Unlimited reviews</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Custom AI training</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Unlimited connections</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 status-success" />
                    <span className="text-sm">Custom integrations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Development Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 brand-text" />
              Latest Updates
            </CardTitle>
            <CardDescription>
              Stay up to date with our development progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-4 border-brand pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Week of July 28, 2025</span>
                  <span className="status-success-bg text-white text-xs px-2 py-1 rounded-full">Complete</span>
                </div>
                <p className="text-secondary-dark text-sm">
                  ✅ AI response engine optimization completed<br/>
                  ✅ Google My Business integration testing<br/>
                  ✅ Security audit and penetration testing
                </p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Week of August 4, 2025</span>
                  <span className="status-warning-bg text-[var(--foreground)]/90 text-xs px-2 py-1 rounded-full">In Progress</span>
                </div>
                <p className="text-secondary-dark text-sm">
                  🔄 Dashboard UI/UX improvements<br/>
                  🔄 Multi-location management features<br/>
                  🔄 Advanced analytics dashboard
                </p>
              </div>
              
              <div className="border-l-4 border-muted pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Week of August 11, 2025</span>
                  <span className="status-info-bg text-white text-xs px-2 py-1 rounded-full">Planned</span>
                </div>
                <p className="text-secondary-dark text-sm">
                  📋 Yelp integration development<br/>
                  📋 Email notification system<br/>
                  📋 Mobile app MVP development
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-medium text-primary-dark mb-2">Questions?</h3>
          <p className="text-secondary-dark mb-4">
            We&apos;re here to help! Reach out to us anytime.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="mailto:support@repruv.co.uk">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/help">
                View FAQ
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
