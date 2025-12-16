'use client';

import Link from 'next/link';
import { Eye, TrendingUp, Users, ArrowRight, LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EngagementWidgetProps {
  views7d: number;
  viewsChange: number;
  engagementRate: number;
  engagementChange: number;
  newFollowers: number;
  newFollowersChange: number;
  hasData: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function ChangeIndicator({ value, className }: { value: number; className?: string }) {
  if (value === 0) return null;
  
  const isPositive = value > 0;
  return (
    <span
      className={cn(
        'text-xs font-semibold px-2 py-0.5 rounded-full',
        isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400',
        className
      )}
    >
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

export function EngagementWidget({
  views7d,
  viewsChange,
  engagementRate,
  engagementChange,
  newFollowers,
  newFollowersChange,
  hasData,
}: EngagementWidgetProps) {
  if (!hasData) {
    return (
      <div className="glass-panel rounded-2xl border border-holo-purple/20 p-6 shadow-glass backdrop-blur-md h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Engagement Summary</h3>
          <div className="p-2 rounded-xl bg-gradient-to-br from-holo-purple/20 to-holo-purple-light/20 border border-holo-purple/30">
            <TrendingUp className="h-5 w-5 text-holo-purple" />
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <LinkIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Connect a platform to see engagement data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-holo-purple/20 p-6 shadow-glass backdrop-blur-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Engagement Summary</h3>
        <div className="p-2 rounded-xl bg-gradient-to-br from-holo-purple/20 to-holo-purple-light/20 border border-holo-purple/30">
          <TrendingUp className="h-5 w-5 text-holo-purple" />
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {/* Views */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-holo-blue/20">
              <Eye className="h-4 w-4 text-holo-blue" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Views (7 days)</p>
              <p className="text-lg font-bold">{formatNumber(views7d)}</p>
            </div>
          </div>
          <ChangeIndicator value={viewsChange} />
        </div>

        {/* Engagement Rate */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-holo-teal/20">
              <TrendingUp className="h-4 w-4 text-holo-teal" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Engagement Rate</p>
              <p className="text-lg font-bold">{engagementRate.toFixed(1)}%</p>
            </div>
          </div>
          <ChangeIndicator value={engagementChange} />
        </div>

        {/* New Followers */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-holo-pink/20">
              <Users className="h-4 w-4 text-holo-pink" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">New Followers</p>
              <p className="text-lg font-bold">+{formatNumber(newFollowers)}</p>
            </div>
          </div>
          <ChangeIndicator value={newFollowersChange} />
        </div>
      </div>

      <Link
        href="/insights"
        className="mt-4 flex items-center justify-center gap-2 text-sm text-holo-purple hover:text-holo-purple-light font-medium transition-colors group"
      >
        View Insights
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
