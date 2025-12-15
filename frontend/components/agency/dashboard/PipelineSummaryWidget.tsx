'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  GitBranch,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Target,
  DollarSign,
} from 'lucide-react';
import type { PipelineStats, DealStage } from '@/lib/agency-dashboard-api';

interface PipelineSummaryWidgetProps {
  stats: PipelineStats;
  isLoading?: boolean;
}

// Stage configuration
const stageConfig: Record<DealStage, { label: string; color: string; bgColor: string }> = {
  prospecting: {
    label: 'Prospecting',
    color: 'bg-slate-500',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
  },
  pitch_sent: {
    label: 'Pitch Sent',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  negotiating: {
    label: 'Negotiating',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  booked: {
    label: 'Booked',
    color: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  lost: {
    label: 'Lost',
    color: 'bg-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

export function PipelineSummaryWidget({ stats, isLoading = false }: PipelineSummaryWidgetProps) {
  // Calculate total count for bar chart proportions
  const activeStages: DealStage[] = ['prospecting', 'pitch_sent', 'negotiating', 'booked', 'in_progress'];
  const totalActiveDeals = activeStages.reduce((sum, stage) => sum + (stats.by_stage[stage]?.count || 0), 0);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-500" />
              Pipeline Overview
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
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
            <GitBranch className="h-5 w-5 text-purple-500" />
            Pipeline Overview
          </CardTitle>
          <Link
            href="/agency/pipeline"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            View Full Board
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stacked Bar Chart */}
        <div className="space-y-2">
          <div className="h-8 rounded-full overflow-hidden flex">
            {activeStages.map(stage => {
              const stageData = stats.by_stage[stage];
              if (!stageData || stageData.count === 0) return null;
              const width = (stageData.count / totalActiveDeals) * 100;
              const config = stageConfig[stage];

              return (
                <Link
                  key={stage}
                  href={`/agency/pipeline?stage=${stage}`}
                  className={cn(
                    'relative group transition-all hover:opacity-90',
                    config.color
                  )}
                  style={{ width: `${width}%` }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {config.label}: {stageData.count} deals ({formatCurrency(stageData.value)})
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {activeStages.map(stage => {
              const stageData = stats.by_stage[stage];
              if (!stageData || stageData.count === 0) return null;
              const config = stageConfig[stage];

              return (
                <div key={stage} className="flex items-center gap-1.5">
                  <span className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
                  <span className="text-gray-600 dark:text-gray-400">{config.label}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {stageData.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
              <DollarSign className="h-3.5 w-3.5" />
              Total Pipeline
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(stats.total_value)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
              <Target className="h-3.5 w-3.5" />
              Avg Deal Size
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(stats.avg_deal_size)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Win Rate
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.win_rate_this_month}%
            </p>
          </div>
        </div>

        {/* Stagnant Deals Alert */}
        {stats.stagnant_deals > 0 && (
          <Link
            href="/agency/pipeline?stagnant=true"
            className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {stats.stagnant_deals} deals stagnant in Negotiating
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                No movement for 7+ days
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-yellow-600" />
          </Link>
        )}

        {/* Quick Stats */}
        <div className="flex items-center justify-between text-sm border-t border-gray-200 dark:border-gray-800 pt-4">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Closing this month: </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {stats.deals_closing_this_month} deals ({formatCurrency(stats.deals_closing_this_month_value)})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
