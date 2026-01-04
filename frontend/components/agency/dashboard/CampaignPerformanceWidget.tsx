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
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
      case 'on_track':
        return 'text-sky-600 bg-sky-50 dark:bg-sky-900/20';
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
            <Megaphone className="h-5 w-5 text-emerald-500" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-3">
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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-500" />
            Campaign Performance
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
      <CardContent className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/20 p-3 mb-3">
            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold mb-1">Coming Soon</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
            Campaign analytics and tracking
          </p>
          <div className="flex gap-2">
            <Link href="/agency/campaigns">
              <Button size="sm">
                <Megaphone className="h-4 w-4 mr-2" />
                View Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
