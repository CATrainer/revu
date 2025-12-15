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
import { AgencyBadge } from '@/components/agency/AgencyBadge';
import { AgencyInvitationsBanner } from '@/components/agency/AgencyInvitationsBanner';
import { Youtube, Instagram, Music, TrendingUp, Users, MessageCircle, Zap, Sparkles, Settings2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface PlatformStatus {
  connected: boolean;
  subscribers?: number;
  followers?: number;
  channel_name?: string;
  username?: string;
  message?: string;
  error?: string;
}

interface DashboardMetrics {
  total_followers: number;
  total_subscribers: number;
  engagement_rate: number;
  interactions_today: number;
  active_workflows: number;
  follower_change: number;
  engagement_change: number;
  interactions_change: number;
  connected_platforms?: {
    youtube: PlatformStatus;
    instagram: PlatformStatus;
    tiktok: PlatformStatus;
  };
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
    <div className="space-y-10 animate-slide-up px-4 md:px-0"> {/* Add horizontal padding on mobile */}
      {/* Agency Invitations Banner - Show pending invitations */}
      <AgencyInvitationsBanner />

      {/* Agency Badge - Show if creator is part of an agency */}
      <AgencyBadge />

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
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Connect Your Platforms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* YouTube Card */}
          <div className={`glass-panel rounded-2xl border shadow-glass backdrop-blur-md retro-hover group overflow-hidden ${
            metrics?.connected_platforms?.youtube?.connected
              ? 'border-emerald-500/30'
              : 'border-card-border'
          }`}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl gradient-pink shadow-glow-pink">
                    <Youtube className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">YouTube</h3>
                </div>
                {metrics?.connected_platforms?.youtube?.connected && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
              </div>

              {metrics?.connected_platforms?.youtube?.connected ? (
                <div className="space-y-2">
                  {metrics.connected_platforms.youtube.channel_name && (
                    <p className="text-sm font-medium text-foreground">
                      {metrics.connected_platforms.youtube.channel_name}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(metrics.connected_platforms.youtube.subscribers || 0)} subscribers
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect your YouTube channel to manage comments and engage with your audience.
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap pt-2">
                <PlatformConnectionButton platform="youtube" />
                {metrics?.connected_platforms?.youtube?.connected && (
                  <Link href="/interactions" className="text-sm text-holo-purple hover:text-holo-purple-light font-semibold hover:underline transition-colors">
                    View interactions →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Instagram Card */}
          <div className={`glass-panel rounded-2xl border shadow-glass backdrop-blur-md retro-hover group overflow-hidden ${
            metrics?.connected_platforms?.instagram?.connected
              ? 'border-emerald-500/30'
              : 'border-card-border'
          }`}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-glow-pink">
                    <Instagram className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">Instagram</h3>
                </div>
                {metrics?.connected_platforms?.instagram?.connected && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
              </div>

              {metrics?.connected_platforms?.instagram?.connected ? (
                <div className="space-y-2">
                  {metrics.connected_platforms.instagram.username && (
                    <p className="text-sm font-medium text-foreground">
                      @{metrics.connected_platforms.instagram.username}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(metrics.connected_platforms.instagram.followers || 0)} followers
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect Instagram to monitor posts, stories, and direct messages.
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap pt-2">
                <PlatformConnectionButton platform="instagram" />
                {metrics?.connected_platforms?.instagram?.connected && (
                  <Link href="/interactions" className="text-sm text-holo-purple hover:text-holo-purple-light font-semibold hover:underline transition-colors">
                    View interactions →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* TikTok Card */}
          <div className={`glass-panel rounded-2xl border shadow-glass backdrop-blur-md retro-hover group overflow-hidden ${
            metrics?.connected_platforms?.tiktok?.connected
              ? 'border-emerald-500/30'
              : 'border-card-border'
          }`}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-black dark:bg-white shadow-lg">
                    <Music className="h-6 w-6 text-white dark:text-black" />
                  </div>
                  <h3 className="text-xl font-bold">TikTok</h3>
                </div>
                {metrics?.connected_platforms?.tiktok?.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : metrics?.connected_platforms?.tiktok?.message && (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
              </div>

              {metrics?.connected_platforms?.tiktok?.connected ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(metrics.connected_platforms.tiktok.followers || 0)} followers
                  </p>
                </div>
              ) : metrics?.connected_platforms?.tiktok?.message ? (
                <p className="text-sm text-amber-500/80 leading-relaxed">
                  {metrics.connected_platforms.tiktok.message}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect TikTok to track viral content and engage with trending topics.
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap pt-2">
                {!metrics?.connected_platforms?.tiktok?.message && (
                  <PlatformConnectionButton platform="tiktok" />
                )}
                {metrics?.connected_platforms?.tiktok?.connected && (
                  <Link href="/interactions" className="text-sm text-holo-purple hover:text-holo-purple-light font-semibold hover:underline transition-colors">
                    View interactions →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* No Platforms Connected */}
      {!loading && !metrics?.connected_platforms?.youtube?.connected &&
       !metrics?.connected_platforms?.instagram?.connected && !metrics?.connected_platforms?.tiktok?.connected && (
        <div className="glass-panel rounded-2xl border border-amber-500/30 p-6 shadow-glass backdrop-blur-md">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-amber-500/10 border border-amber-500/30">
              <XCircle className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2">No Platforms Connected</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Connect at least one social media platform above to start managing your creator presence.
                Your metrics will appear once you&apos;ve connected and synced your accounts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}