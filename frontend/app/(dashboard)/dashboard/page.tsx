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
    <div className="space-y-10 animate-slide-up px-4 md:px-0"> {/* Add horizontal padding on mobile */}
      {/* Demo Mode Banner - Retro Styled */}
      {demoMode && (
        <div className="glass-panel rounded-2xl border border-holo-purple/30 p-6 shadow-glow-purple backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 animate-pulse-glow shadow-glow-teal" />
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-holo-purple" />
                  <span className="font-bold text-lg text-holo-purple">Demo Mode Active</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Using simulated data from <span className="font-semibold text-foreground">{demoProfile?.niche?.replace('_', ' ') || 'your demo profile'}</span>. Interactions will arrive shortly.
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

      {/* Onboarding: Enable Demo Mode - Retro Styled */}
      {!demoMode && !loading && (metrics?.interactions_today || 0) === 0 && (
        <div className="glass-panel rounded-2xl border border-holo-teal/30 p-6 shadow-glow-teal backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sparkles className="h-6 w-6 text-holo-teal" />
              <div>
                <div className="font-bold text-lg">No interactions yet?</div>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Try Demo Mode to see how Repruv works with AI-generated interactions
                </p>
              </div>
            </div>
            <Link href="/settings/demo-mode">
              <ModernButton size="sm" className="gradient-teal shadow-glow-teal">
                <Sparkles className="h-4 w-4 mr-2" />
                Enable Demo Mode
              </ModernButton>
            </Link>
          </div>
        </div>
      )}

      {/* Header Section - Gradient Text */}
      <div className="space-y-3">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-holo-purple">Welcome back!</h1> {/* Responsive heading sizes */}
        <p className="text-base md:text-xl text-muted-foreground font-medium">Here&apos;s what&apos;s happening with your social media presence.</p>
      </div>

      {/* Stats Overview - Glassmorphic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl border border-holo-purple/20 p-6 shadow-glass backdrop-blur-md retro-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-holo-purple/20 to-holo-purple-light/20 border border-holo-purple/30">
              <Users className="h-5 w-5 text-holo-purple" />
            </div>
            {metrics?.follower_change !== undefined && metrics.follower_change !== 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-pill ${metrics.follower_change > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {metrics.follower_change > 0 ? '+' : ''}{metrics.follower_change}%
              </span>
            )}
          </div>
          <div className="text-3xl font-bold mb-1">{loading ? '...' : formatNumber(totalFollowers)}</div>
          <div className="text-sm text-muted-foreground font-medium">Total Followers</div>
          <div className="text-xs text-muted-foreground mt-1">vs last month</div>
        </div>

        <div className="glass-panel rounded-2xl border border-holo-teal/20 p-6 shadow-glass backdrop-blur-md retro-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-holo-teal/20 to-holo-teal-dark/20 border border-holo-teal/30">
              <TrendingUp className="h-5 w-5 text-holo-teal" />
            </div>
            {metrics?.engagement_change !== undefined && metrics.engagement_change !== 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-pill ${metrics.engagement_change > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {metrics.engagement_change > 0 ? '+' : ''}{metrics.engagement_change}%
              </span>
            )}
          </div>
          <div className="text-3xl font-bold mb-1">{loading ? '...' : `${metrics?.engagement_rate?.toFixed(1) || 0}%`}</div>
          <div className="text-sm text-muted-foreground font-medium">Engagement Rate</div>
          <div className="text-xs text-muted-foreground mt-1">vs last month</div>
        </div>

        <div className="glass-panel rounded-2xl border border-holo-pink/20 p-6 shadow-glass backdrop-blur-md retro-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-holo-pink/20 to-holo-pink-dark/20 border border-holo-pink/30">
              <MessageCircle className="h-5 w-5 text-holo-pink" />
            </div>
            {metrics?.interactions_change !== undefined && metrics.interactions_change !== 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-pill ${metrics.interactions_change > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {metrics.interactions_change > 0 ? '+' : ''}{metrics.interactions_change}%
              </span>
            )}
          </div>
          <div className="text-3xl font-bold mb-1">{loading ? '...' : (metrics?.interactions_today || 0).toString()}</div>
          <div className="text-sm text-muted-foreground font-medium">Interactions Today</div>
          <div className="text-xs text-muted-foreground mt-1">vs yesterday</div>
        </div>

        <div className="glass-panel rounded-2xl border border-holo-blue/20 p-6 shadow-glass backdrop-blur-md retro-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-holo-blue/20 to-holo-blue-dark/20 border border-holo-blue/30">
              <Zap className="h-5 w-5 text-holo-blue" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{loading ? '...' : (metrics?.active_workflows || 0).toString()}</div>
          <div className="text-sm text-muted-foreground font-medium">Workflows Active</div>
          <div className="text-xs text-muted-foreground mt-1">running smoothly</div>
        </div>
      </div>

      {/* Impact Summary (conditional) */}
      {features.showAutomationImpact && <AutomationImpactWidget />}

      {/* Platform Connections */}
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Connect Your Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* Tighter gaps on mobile */}
          <div className="glass-panel rounded-2xl border border-card-border shadow-glass backdrop-blur-md retro-hover group overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl gradient-pink shadow-glow-pink">
                  <Youtube className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">YouTube</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your YouTube channel to manage comments and engage with your audience.
              </p>
              <div className="flex items-center gap-3 flex-wrap pt-2">
                <PlatformConnectionButton platform="youtube" />
                <Link href="/comments" className="text-sm text-holo-purple hover:text-holo-purple-light font-semibold hover:underline transition-colors">
                  View interactions →
                </Link>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-card-border shadow-glass backdrop-blur-md retro-hover group overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-glow-pink">
                  <Instagram className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Instagram</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect Instagram to monitor posts, stories, and direct messages.
              </p>
              <div className="pt-2">
                <PlatformConnectionButton platform="instagram" />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-card-border shadow-glass backdrop-blur-md retro-hover group overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-black dark:bg-white shadow-lg">
                  <Music className="h-6 w-6 text-white dark:text-black" />
                </div>
                <h3 className="text-xl font-bold">TikTok</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect TikTok to track viral content and engage with trending topics.
              </p>
              <div className="pt-2">
                <PlatformConnectionButton platform="tiktok" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}