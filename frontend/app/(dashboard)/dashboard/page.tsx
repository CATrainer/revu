// frontend/app/(dashboard)/dashboard/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { ModernCard, CardContent, CardHeader, CardTitle } from '@/components/ui/modern-card';
import { ModernStats, StatsGrid } from '@/components/ui/modern-stats';
import { ModernButton } from '@/components/ui/modern-button';
import Link from 'next/link';
import AutomationImpactWidget from '@/components/intelligence/AutomationImpactWidget';
import { features } from '@/lib/features';
import ConnectButton from '@/components/youtube/ConnectButton';
import { Youtube, Instagram, Music, TrendingUp, Users, MessageCircle, Zap } from 'lucide-react';

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

    fetchMetrics();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const totalFollowers = (metrics?.total_followers || 0) + (metrics?.total_subscribers || 0);

  return (
    <div className="space-y-8 animate-fade-in px-4 md:px-0"> {/* Add horizontal padding on mobile */}
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
                <ConnectButton />
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
              <ModernButton variant="outline" size="sm" asChild>
                <Link href="/settings?tab=Integrations">
                  Connect Instagram
                </Link>
              </ModernButton>
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
              <ModernButton variant="outline" size="sm" asChild>
                <Link href="/settings?tab=Integrations">
                  Connect TikTok
                </Link>
              </ModernButton>
            </CardContent>
          </ModernCard>
        </div>
      </div>
    </div>
  );
}