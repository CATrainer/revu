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
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { DashboardStats } from '@/lib/agency-dashboard-api';

interface QuickStatsBarProps {
  stats: DashboardStats;
  isLoading?: boolean;
  actionCount?: number;
}

export function QuickStatsBar({ stats, isLoading = false, actionCount = 0 }: QuickStatsBarProps) {
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
      label: 'Actions',
      value: actionCount,
      format: (v: number) => v.toString(),
      href: '/agency/actions',
      icon: actionCount > 0 ? AlertCircle : CheckCircle2,
      color: actionCount > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300',
      bgColor: actionCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Active Campaigns',
      value: stats.total_active_campaigns,
      format: (v: number) => v.toString(),
      href: '/agency/campaigns?status=active',
      icon: Megaphone,
      color: 'text-sky-700 dark:text-sky-300',
      bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    },
    {
      label: 'Total Creators',
      value: stats.total_creators,
      format: (v: number) => v.toString(),
      href: '/agency/creators',
      icon: Users,
      color: 'text-slate-700 dark:text-slate-300',
      bgColor: 'bg-slate-100 dark:bg-slate-800/50',
    },
    {
      label: "This Month's Revenue",
      value: stats.revenue_this_month,
      format: (v: number) => `${formatCurrency(v)}`,
      href: '/agency/finance',
      icon: DollarSign,
      color: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      prefix: '£',
    },
    {
      label: 'Pipeline Value',
      value: stats.pipeline_value,
      format: (v: number) => `${formatCurrency(v)}`,
      href: '/agency/pipeline',
      icon: GitBranch,
      color: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      prefix: '£',
    },
    {
      label: 'Completion Rate',
      value: stats.completion_rate,
      format: (v: number) => `${v}%`,
      href: '/agency/campaigns?status=completed',
      icon: CheckCircle,
      color: 'text-teal-700 dark:text-teal-300',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-2 p-2">
            <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
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
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      {statItems.map((item, index) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
            index < statItems.length - 1 && 'md:border-r md:border-gray-200 dark:md:border-gray-800'
          )}
        >
          <div className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
            item.bgColor
          )}>
            <item.icon className={cn('h-4 w-4', item.color)} />
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
