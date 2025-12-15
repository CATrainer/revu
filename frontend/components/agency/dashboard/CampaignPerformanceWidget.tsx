'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export function CampaignPerformanceWidget({ isLoading = false }: CampaignPerformanceWidgetProps) {
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

  // Coming Soon - Backend endpoint not yet implemented
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-pink-500" />
          Campaign Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-pink-100 dark:bg-pink-900/20 p-4 mb-4">
            <TrendingUp className="h-8 w-8 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Campaign performance analytics and tracking will be available soon. View your campaigns to see individual metrics.
          </p>
          <div className="flex gap-2">
            <Link href="/agency/campaigns">
              <Button size="sm">
                <Megaphone className="h-4 w-4 mr-2" />
                View Campaigns
              </Button>
            </Link>
            <Link href="/agency/campaigns/new">
              <Button size="sm" variant="outline">
                Create Campaign
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
