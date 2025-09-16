// frontend/app/(dashboard)/dashboard/page.tsx
"use client";
import { ModernCard, CardContent, CardHeader, CardTitle } from '@/components/ui/modern-card';
import { ModernStats, StatsGrid } from '@/components/ui/modern-stats';
import { ModernButton } from '@/components/ui/modern-button';
import Link from 'next/link';
import AutomationImpactWidget from '@/components/intelligence/AutomationImpactWidget';
import ConnectButton from '@/components/youtube/ConnectButton';
import { Youtube, Instagram, Music, TrendingUp, Users, MessageCircle, Zap } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary-dark">Welcome back!</h1>
        <p className="text-lg text-secondary-dark">Here&apos;s what&apos;s happening with your social media presence.</p>
      </div>

      {/* Stats Overview */}
      <StatsGrid columns={4}>
        <ModernStats
          title="Total Followers"
          value="12.4K"
          change={8.2}
          changeLabel="vs last month"
          icon={<Users className="h-4 w-4" />}
          trend="up"
        />
        <ModernStats
          title="Engagement Rate"
          value="4.7%"
          change={-2.1}
          changeLabel="vs last month"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="down"
        />
        <ModernStats
          title="Comments Today"
          value="47"
          change={12.5}
          changeLabel="vs yesterday"
          icon={<MessageCircle className="h-4 w-4" />}
          trend="up"
        />
        <ModernStats
          title="Automations Active"
          value="3"
          changeLabel="running smoothly"
          icon={<Zap className="h-4 w-4" />}
          trend="neutral"
        />
      </StatsGrid>

      {/* Impact Summary */}
      <AutomationImpactWidget />

      {/* Platform Connections */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-primary-dark">Connect Your Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  View comments →
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