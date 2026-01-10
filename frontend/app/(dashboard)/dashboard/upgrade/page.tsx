'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Check, 
  CreditCard, 
  Sparkles, 
  Shield, 
  Zap, 
  BarChart3, 
  MessageSquare,
  Bot,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PRO_FEATURES = [
  {
    icon: BarChart3,
    title: 'Full Dashboard & Analytics',
    description: 'Access comprehensive performance metrics and insights',
  },
  {
    icon: Bot,
    title: 'AI-Powered Assistant',
    description: 'Get personalized content suggestions and engagement strategies',
  },
  {
    icon: MessageSquare,
    title: 'Comment Management',
    description: 'Efficiently manage and respond to comments across platforms',
  },
  {
    icon: Zap,
    title: 'Automation Tools',
    description: 'Set up intelligent workflows for content and engagement',
  },
  {
    icon: Sparkles,
    title: 'Content Insights',
    description: 'Understand what content performs best with your audience',
  },
  {
    icon: Shield,
    title: 'Priority Support',
    description: 'Get help when you need it with priority customer support',
  },
];

export default function UpgradePage() {
  const { isCreator, isFreeTier } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartTrial = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/billing/start-trial', {
        success_url: `${window.location.origin}/dashboard?trial_started=true`,
        cancel_url: `${window.location.origin}/dashboard/upgrade`,
      });

      // Redirect to Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err: unknown) {
      console.error('Failed to start trial:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to start trial. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If user is not a creator or already has Pro, redirect
  if (!isCreator() || !isFreeTier()) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">You already have full access!</h1>
        <p className="text-muted-foreground mb-6">
          Your account already has access to all platform features.
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back button */}
      <Button 
        variant="ghost" 
        className="mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Header */}
      <div className="text-center mb-10">
        <Badge className="mb-4" variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          30-Day Free Trial
        </Badge>
        <h1 className="text-3xl font-bold mb-3">
          Unlock the Full Power of Repruv
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start your free 30-day trial today. Get access to all Pro features 
          and supercharge your content creation journey.
        </p>
      </div>

      {/* Main CTA Card */}
      <Card className="mb-10 border-primary/50 shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Pro Plan</CardTitle>
          <CardDescription>Everything you need to grow your audience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold">
              £9.99
              <span className="text-lg font-normal text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              after 30-day free trial
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleStartTrial}
            disabled={isLoading}
          >
            {isLoading ? (
              'Starting trial...'
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Start Free 30-Day Trial
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Card required. Cancel anytime during your trial period.
            <br />
            You won&apos;t be charged until the trial ends.
          </p>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-6 text-center">
          Everything included in Pro
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {PRO_FEATURES.map((feature) => (
            <div 
              key={feature.title}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Free tier comparison */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">What you have now (Free)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500" />
              Access to Opportunities section
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500" />
              Basic settings and profile management
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-4 h-4 text-center">—</span>
              Limited platform features
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* FAQ or Trust signals */}
      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>
          Questions? Contact us at{' '}
          <a href="mailto:support@repruv.com" className="text-primary hover:underline">
            support@repruv.com
          </a>
        </p>
      </div>
    </div>
  );
}
