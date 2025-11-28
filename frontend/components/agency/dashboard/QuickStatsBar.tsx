'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Megaphone,
  Users,
  DollarSign,
  GitBranch,
  CheckCircle,
} from 'lucide-react';
import type { DashboardStats } from '@/lib/agency-dashboard-api';

interface QuickStatsBarProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

// Mock stats for demonstration
const mockStats: DashboardStats = {
  total_active_campaigns: 15,
  total_creators: 43,
  revenue_this_month: 50000,
  pipeline_value: 125000,
  completion_rate: 94,
};

export function QuickStatsBar({ stats = mockStats, isLoading = false }: QuickStatsBarProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const statItems = [
    {
      label: 'Active Campaigns',
      value: stats.total_active_campaigns,
      format: (v: number) => v.toString(),
      href: '/agency/campaigns?status=active',
      icon: Megaphone,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Total Creators',
      value: stats.total_creators,
      format: (v: number) => v.toString(),
      href: '/agency/creators',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: "This Month's Revenue",
      value: stats.revenue_this_month,
      format: (v: number) => `${formatCurrency(v)}`,
      href: '/agency/finance',
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      prefix: '£',
    },
    {
      label: 'Pipeline Value',
      value: stats.pipeline_value,
      format: (v: number) => `${formatCurrency(v)}`,
      href: '/agency/pipeline',
      icon: GitBranch,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      prefix: '£',
    },
    {
      label: 'Completion Rate',
      value: stats.completion_rate,
      format: (v: number) => `${v}%`,
      href: '/agency/campaigns?status=completed',
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3">
            <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      {statItems.map((item, index) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
            index < statItems.length - 1 && 'md:border-r md:border-gray-200 dark:md:border-gray-800'
          )}
        >
          <div className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
            item.bgColor
          )}>
            <item.icon className={cn('h-5 w-5', item.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {item.label}
            </p>
            <p className={cn('text-xl font-bold', item.color)}>
              {item.prefix}{item.format(item.value)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
