// frontend/app/(dashboard)/dashboard/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { ModernCard, CardContent, CardHeader, CardTitle } from '@/components/ui/modern-card';
import { ModernStats, StatsGrid } from '@/components/ui/modern-stats';
import { ModernButton } from '@/components/ui/modern-button';
import Link from 'next/link';
import AutomationImpactWidget from '@/components/intelligence/AutomationImpactWidget';
import { features } from '@/lib/features';
import { PlatformConnectionButton } from '@/components/integrations/PlatformConnectionButton';
import { Youtube, Instagram, Music, TrendingUp, Users, MessageCircle, Zap, Sparkles, Settings2 } from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardMetrics {
  total_followers: number;
  total_subscribers: number;
  engagement_rate: number;
  interactions_today: number;
  active_workflows: number;
  follower_change: number;
  engagement_change: number;
  interactions_change: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [demoProfile, setDemoProfile] = useState<any>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/v1/analytics/dashboard-metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchDemoStatus = async () => {
      try {
        const response = await api.get('/demo/status');
        setDemoMode(response.data.demo_mode || false);
        setDemoProfile(response.data.profile || null);
      } catch (error) {
        console.error('Failed to fetch demo status:', error);
      }
    };

    fetchMetrics();
    fetchDemoStatus();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const totalFollowers = (metrics?.total_followers || 0) + (metrics?.total_subscribers || 0);

  return (
    <div className="space-y-8 animate-fade-in px-4 md:px-0"> {/* Add horizontal padding on mobile */}
      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-purple-900 dark:text-purple-100">Demo Mode Active</span>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Using simulated data from {demoProfile?.niche?.replace('_', ' ') || 'your demo profile'}. Interactions will arrive shortly.
                </p>
              </div>
            </div>
            <Link href="/settings/demo-mode">
              <ModernButton variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Demo
              </ModernButton>
            </Link>
          </div>
        </div>
      )}

      {/* Onboarding: Enable Demo Mode */}
      {!demoMode && !loading && (metrics?.interactions_today || 0) === 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">No interactions yet?</div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Try Demo Mode to see how Repruv works with AI-generated interactions
                </p>
              </div>
            </div>
            <Link href="/settings/demo-mode">
              <ModernButton className="bg-blue-600 hover:bg-blue-700" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Enable Demo Mode
              </ModernButton>
            </Link>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-primary-dark">Welcome back!</h1> {/* Responsive heading sizes */}
        <p className="text-base md:text-lg text-secondary-dark">Here&apos;s what&apos;s happening with your social media presence.</p>
      </div>

      {/* Stats Overview */}
      <StatsGrid columns={4}>
        <ModernStats
          title="Total Followers"
          value={loading ? '...' : formatNumber(totalFollowers)}
          change={metrics?.follower_change || 0}
          changeLabel="vs last month"
          icon={<Users className="h-4 w-4" />}
          trend={metrics?.follower_change && metrics.follower_change > 0 ? 'up' : metrics?.follower_change && metrics.follower_change < 0 ? 'down' : 'neutral'}
        />
        <ModernStats
          title="Engagement Rate"
          value={loading ? '...' : `${metrics?.engagement_rate?.toFixed(1) || 0}%`}
          change={metrics?.engagement_change || 0}
          changeLabel="vs last month"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={metrics?.engagement_change && metrics.engagement_change > 0 ? 'up' : metrics?.engagement_change && metrics.engagement_change < 0 ? 'down' : 'neutral'}
        />
        <ModernStats
          title="Interactions Today"
          value={loading ? '...' : (metrics?.interactions_today || 0).toString()}
          change={metrics?.interactions_change || 0}
          changeLabel="vs yesterday"
          icon={<MessageCircle className="h-4 w-4" />}
          trend={metrics?.interactions_change && metrics.interactions_change > 0 ? 'up' : metrics?.interactions_change && metrics.interactions_change < 0 ? 'down' : 'neutral'}
        />
        <ModernStats
          title="Workflows Active"
          value={loading ? '...' : (metrics?.active_workflows || 0).toString()}
          changeLabel="running smoothly"
          icon={<Zap className="h-4 w-4" />}
          trend="neutral"
        />
      </StatsGrid>

      {/* Impact Summary (conditional) */}
      {features.showAutomationImpact && <AutomationImpactWidget />}

      {/* Platform Connections */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-semibold text-primary-dark">Connect Your Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"> {/* Tighter gaps on mobile */}
          <ModernCard hover interactive className="group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                  <Youtube className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle>YouTube</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-dark mb-4">
                Connect your YouTube channel to manage comments and engage with your audience.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <PlatformConnectionButton platform="youtube" />
                <Link href="/comments" className="text-sm text-brand-primary hover:underline">
                  View interactions →
                </Link>
              </div>
            </CardContent>
          </ModernCard>

          <ModernCard hover interactive className="group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <CardTitle>Instagram</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-dark mb-4">
                Connect Instagram to monitor posts, stories, and direct messages.
              </p>
              <PlatformConnectionButton platform="instagram" />
            </CardContent>
          </ModernCard>

          <ModernCard hover interactive className="group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-black dark:bg-white">
                  <Music className="h-5 w-5 text-white dark:text-black" />
                </div>
                <CardTitle>TikTok</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-dark mb-4">
                Connect TikTok to track viral content and engage with trending topics.
              </p>
              <PlatformConnectionButton platform="tiktok" />
            </CardContent>
          </ModernCard>
        </div>
      </div>
    </div>
  );
}