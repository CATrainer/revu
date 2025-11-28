'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { FinancialStats } from '@/lib/agency-dashboard-api';

interface FinancialOverviewWidgetProps {
  stats?: FinancialStats;
  isLoading?: boolean;
}

// Mock stats for demonstration
const mockStats: FinancialStats = {
  outstanding_receivables: 25000,
  overdue_receivables: 5000,
  overdue_count: 2,
  oldest_overdue_days: 12,
  creator_payouts_due: 18000,
  creator_payouts_count: 7,
  revenue_this_month: 50000,
  revenue_last_month: 40000,
  revenue_trend_percent: 25,
};

export function FinancialOverviewWidget({ stats = mockStats, isLoading = false }: FinancialOverviewWidgetProps) {
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
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse space-y-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendUp = stats.revenue_trend_percent >= 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Financial Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <select className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-400">
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Outstanding Receivables */}
          <Link
            href="/agency/finance/invoices?status=sent"
            className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
          >
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
              <Receipt className="h-4 w-4" />
              <span className="text-xs font-medium">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(stats.outstanding_receivables)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              5 invoices pending
            </p>
          </Link>

          {/* Overdue Payments */}
          <Link
            href="/agency/finance/invoices?status=overdue"
            className={cn(
              'p-4 rounded-lg border transition-colors',
              stats.overdue_receivables > 0
                ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20'
                : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
            )}
          >
            <div className={cn(
              'flex items-center gap-2 mb-2',
              stats.overdue_receivables > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            )}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Overdue</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              stats.overdue_receivables > 0
                ? 'text-red-700 dark:text-red-300'
                : 'text-green-700 dark:text-green-300'
            )}>
              {formatCurrency(stats.overdue_receivables)}
            </p>
            {stats.overdue_receivables > 0 ? (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {stats.overdue_count} invoices • Oldest: {stats.oldest_overdue_days} days
              </p>
            ) : (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                No overdue invoices
              </p>
            )}
          </Link>

          {/* Creator Payouts */}
          <Link
            href="/agency/finance/payouts"
            className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
          >
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Payouts Due</span>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {formatCurrency(stats.creator_payouts_due)}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {stats.creator_payouts_count} creators pending
            </p>
          </Link>

          {/* Revenue This Month */}
          <Link
            href="/agency/finance/analytics"
            className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
          >
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(stats.revenue_this_month)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span className={cn(
                'text-xs font-medium',
                trendUp ? 'text-green-600' : 'text-red-600'
              )}>
                {trendUp ? '+' : ''}{stats.revenue_trend_percent}%
              </span>
              <span className="text-xs text-gray-500">vs last month</span>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href="/agency/finance/invoices/new">
              <Receipt className="h-4 w-4 mr-2" />
              Create Invoice
            </Link>
          </Button>
          {stats.overdue_receivables > 0 && (
            <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Send Reminders
            </Button>
          )}
        </div>

        {/* Mini Revenue Chart Placeholder */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Revenue Trend (Last 6 Months)</p>
          <div className="h-20 flex items-end gap-1">
            {[35, 42, 38, 45, 40, 50].map((height, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-t transition-all',
                  i === 5
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
                style={{ height: `${height * 2}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
