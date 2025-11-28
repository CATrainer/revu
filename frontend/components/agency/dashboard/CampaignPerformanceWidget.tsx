'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Megaphone,
  ArrowRight,
  TrendingUp,
  Eye,
  Heart,
  Target,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

interface CampaignPerformanceWidgetProps {
  isLoading?: boolean;
}

// Mock data for demonstration
const mockStats = {
  activeCampaigns: 8,
  totalEstimatedReach: 5200000,
  avgEngagementRate: 4.1,
  contentPosted: 12,
  contentTotal: 20,
};

const mockTopPerformers = [
  {
    id: '1',
    brandName: 'Brand X',
    creatorName: '@creator1',
    metric: '2.5M views',
    metricType: 'views',
    status: 'exceeding',
    percentOfGoal: 150,
  },
  {
    id: '2',
    brandName: 'Brand Y',
    creatorName: '@creator2',
    metric: '4.8% ER',
    metricType: 'engagement',
    status: 'on_track',
    percentOfGoal: 100,
  },
  {
    id: '3',
    brandName: 'Brand Z',
    creatorName: '@creator3',
    metric: '850K views',
    metricType: 'views',
    status: 'on_track',
    percentOfGoal: 95,
  },
];

const mockAlerts = [
  {
    id: '1',
    type: 'success',
    message: 'Brand X campaign exceeded goals by 150%',
    campaignId: '1',
  },
  {
    id: '2',
    type: 'warning',
    message: 'Brand Y campaign underperforming - 2.1% ER vs 4% target',
    campaignId: '2',
  },
];

export function CampaignPerformanceWidget({ isLoading = false }: CampaignPerformanceWidgetProps) {
  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeding':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'on_track':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'underperforming':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-pink-500" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-pink-500" />
            Active Campaigns Performance
          </CardTitle>
          <Link
            href="/agency/campaigns"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {mockStats.activeCampaigns} campaigns in progress
          </span>
          <Badge variant="secondary">
            {mockStats.contentPosted} / {mockStats.contentTotal} pieces posted
          </Badge>
        </div>

        {/* Aggregate Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
              <Eye className="h-3.5 w-3.5" />
              Est. Reach
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(mockStats.totalEstimatedReach)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
              <Heart className="h-3.5 w-3.5" />
              Avg ER
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {mockStats.avgEngagementRate}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
              <Target className="h-3.5 w-3.5" />
              Content
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {mockStats.contentPosted}/{mockStats.contentTotal}
            </p>
            <Progress
              value={(mockStats.contentPosted / mockStats.contentTotal) * 100}
              className="h-1 mt-1"
            />
          </div>
        </div>

        {/* Top Performers */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Top Performers This Month
            </span>
          </div>
          <div className="space-y-2">
            {mockTopPerformers.map((campaign, index) => (
              <Link
                key={campaign.id}
                href={`/agency/campaigns/${campaign.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
                  index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-200 text-gray-600' :
                      'bg-orange-100 text-orange-700'
                )}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {campaign.brandName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {campaign.creatorName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {campaign.metric}
                  </p>
                  <Badge className={cn('text-xs', getStatusColor(campaign.status))}>
                    {campaign.percentOfGoal}% of goal
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {mockAlerts.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            {mockAlerts.map(alert => (
              <Link
                key={alert.id}
                href={`/agency/campaigns/${alert.campaignId}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                  alert.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/20'
                    : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                )}
              >
                {alert.type === 'success' ? (
                  <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                )}
                <p className={cn(
                  'text-sm',
                  alert.type === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-yellow-700 dark:text-yellow-300'
                )}>
                  {alert.message}
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
