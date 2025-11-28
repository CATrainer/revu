'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  QuickStatsBar,
  ActionRequiredWidget,
  PipelineSummaryWidget,
  UpcomingDeadlinesWidget,
  RecentActivityWidget,
  FinancialOverviewWidget,
  CreatorAvailabilityWidget,
  CampaignPerformanceWidget,
} from '@/components/agency/dashboard';
import { agencyApi, type AgencyStats } from '@/lib/agency-api';
import { Button } from '@/components/ui/button';
import { Settings, LayoutGrid, Grip } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AgencyDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AgencyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutPreset, setLayoutPreset] = useState<'default' | 'financial' | 'operations'>('default');

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const data = await agencyApi.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch agency stats:', error);
        // Use mock data in case of error for demo purposes
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Here&apos;s what&apos;s happening with your agency today
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Layout Presets */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Layout</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Dashboard Presets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLayoutPreset('default')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Default View
                {layoutPreset === 'default' && <span className="ml-auto text-green-600">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLayoutPreset('financial')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Financial Focus
                {layoutPreset === 'financial' && <span className="ml-auto text-green-600">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLayoutPreset('operations')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Operations Focus
                {layoutPreset === 'operations' && <span className="ml-auto text-green-600">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Customize Dashboard */}
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Customize</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <QuickStatsBar />

      {/* Main Dashboard Grid */}
      {layoutPreset === 'default' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <ActionRequiredWidget />
            <PipelineSummaryWidget />
          </div>

          {/* Center Column */}
          <div className="space-y-6">
            <UpcomingDeadlinesWidget />
            <CreatorAvailabilityWidget />
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-2 xl:col-span-1">
            <RecentActivityWidget />
            <FinancialOverviewWidget />
          </div>
        </div>
      )}

      {layoutPreset === 'financial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <FinancialOverviewWidget />
            <PipelineSummaryWidget />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ActionRequiredWidget />
            <RecentActivityWidget />
          </div>
        </div>
      )}

      {layoutPreset === 'operations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <ActionRequiredWidget />
            <UpcomingDeadlinesWidget />
            <CampaignPerformanceWidget />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <CreatorAvailabilityWidget />
            <PipelineSummaryWidget />
            <RecentActivityWidget />
          </div>
        </div>
      )}

      {/* Campaign Performance - Full Width */}
      {layoutPreset === 'default' && (
        <CampaignPerformanceWidget />
      )}
    </div>
  );
}
