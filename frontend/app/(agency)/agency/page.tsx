'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  QuickStatsBar,
  ActionRequiredWidget,
  PipelineSummaryWidget,
  UpcomingDeadlinesWidget,
  FinancialOverviewWidget,
  CreatorAvailabilityWidget,
  CampaignPerformanceWidget,
} from '@/components/agency/dashboard';
import { agencyApi } from '@/lib/agency-api';
import {
  dashboardApi,
  type DashboardStats,
  type ActionRequiredItem,
  type UpcomingDeadline,
  type ActivityItem,
  type PipelineStats,
  type FinancialStats,
} from '@/lib/agency-dashboard-api';
import { Button } from '@/components/ui/button';
import { Settings, LayoutGrid, Grip, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Widget configuration
const defaultWidgets = {
  actionRequired: true,
  pipeline: true,
  deadlines: true,
  creatorAvailability: true,
  financial: true,
  performance: true,
};

export default function AgencyDashboardPage() {
  const { user } = useAuth();
  const [layoutPreset, setLayoutPreset] = useState<'default' | 'financial' | 'operations'>('default');
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState(defaultWidgets);

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['agency-dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    staleTime: 30000, // 30 seconds
  });

  // Fetch action required items
  const { data: actionItems, isLoading: actionsLoading } = useQuery({
    queryKey: ['agency-action-required'],
    queryFn: () => dashboardApi.getActionRequired(),
    staleTime: 30000,
  });

  // Fetch upcoming deadlines
  const { data: deadlines, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['agency-deadlines'],
    queryFn: () => dashboardApi.getUpcomingDeadlines(14),
    staleTime: 30000,
  });

  // Fetch pipeline summary
  const { data: pipelineStats, isLoading: pipelineLoading } = useQuery({
    queryKey: ['agency-pipeline-summary'],
    queryFn: () => dashboardApi.getPipelineSummary(),
    staleTime: 30000,
  });

  // Fetch financial overview
  const { data: financialStats, isLoading: financialLoading } = useQuery({
    queryKey: ['agency-financial-overview'],
    queryFn: () => dashboardApi.getFinancialOverview(),
    staleTime: 30000,
  });

  const isLoading = statsLoading;

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
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCustomizeDialog(true)}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Customize</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {dashboardStats && <QuickStatsBar stats={dashboardStats} isLoading={statsLoading} actionCount={actionItems?.length || 0} />}

      {/* Main Dashboard Grid */}
      {layoutPreset === 'default' && (
        <div className="space-y-3">
          {/* Top Row: Action Required + Deadlines stacked, Pipeline, Creator Availability */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            {/* Left: Action Required + Deadlines stacked (half height each) */}
            <div className="flex flex-col gap-2">
              {visibleWidgets.actionRequired && <ActionRequiredWidget items={actionItems || []} isLoading={actionsLoading} />}
              {visibleWidgets.deadlines && <UpcomingDeadlinesWidget deadlines={deadlines || []} isLoading={deadlinesLoading} />}
            </div>
            {visibleWidgets.pipeline && pipelineStats && <PipelineSummaryWidget stats={pipelineStats} isLoading={pipelineLoading} />}
            {visibleWidgets.creatorAvailability && <CreatorAvailabilityWidget />}
          </div>

          {/* Bottom Row: Campaign Performance, Financial */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {visibleWidgets.performance && <CampaignPerformanceWidget />}
            {visibleWidgets.financial && <FinancialOverviewWidget stats={financialStats || { outstanding_receivables: 0, outstanding_count: 0, overdue_receivables: 0, overdue_count: 0, oldest_overdue_days: 0, creator_payouts_due: 0, creator_payouts_count: 0, revenue_this_month: 0, revenue_last_month: 0, revenue_trend_percent: 0 }} isLoading={financialLoading || !financialStats} />}
          </div>
        </div>
      )}

      {layoutPreset === 'financial' && (
        <div className="space-y-3">
          {/* Top Row: Financial Overview (large) | Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2">
              <FinancialOverviewWidget stats={financialStats || { outstanding_receivables: 0, outstanding_count: 0, overdue_receivables: 0, overdue_count: 0, oldest_overdue_days: 0, creator_payouts_due: 0, creator_payouts_count: 0, revenue_this_month: 0, revenue_last_month: 0, revenue_trend_percent: 0 }} isLoading={financialLoading || !financialStats} />
            </div>
            {pipelineStats && <PipelineSummaryWidget stats={pipelineStats} isLoading={pipelineLoading} />}
          </div>

          {/* Bottom Row: Campaign Performance | Actions + Deadlines stacked */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <CampaignPerformanceWidget />
            <div className="flex flex-col gap-2">
              <ActionRequiredWidget items={actionItems || []} isLoading={actionsLoading} />
              <UpcomingDeadlinesWidget deadlines={deadlines || []} isLoading={deadlinesLoading} />
            </div>
          </div>
        </div>
      )}

      {layoutPreset === 'operations' && (
        <div className="space-y-3">
          {/* Top Row: Actions + Deadlines stacked | Creator Availability | Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="flex flex-col gap-2">
              <ActionRequiredWidget items={actionItems || []} isLoading={actionsLoading} />
              <UpcomingDeadlinesWidget deadlines={deadlines || []} isLoading={deadlinesLoading} />
            </div>
            <CreatorAvailabilityWidget />
            {pipelineStats && <PipelineSummaryWidget stats={pipelineStats} isLoading={pipelineLoading} />}
          </div>

          {/* Bottom Row: Campaign Performance | Financial Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <CampaignPerformanceWidget />
            <FinancialOverviewWidget stats={financialStats || { outstanding_receivables: 0, outstanding_count: 0, overdue_receivables: 0, overdue_count: 0, oldest_overdue_days: 0, creator_payouts_due: 0, creator_payouts_count: 0, revenue_this_month: 0, revenue_last_month: 0, revenue_trend_percent: 0 }} isLoading={financialLoading || !financialStats} />
          </div>
        </div>
      )}

      {/* Customize Dashboard Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
            <DialogDescription>
              Choose which widgets to display on your dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="widget-action" className="flex-1">Action Required</Label>
              <Switch
                id="widget-action"
                checked={visibleWidgets.actionRequired}
                onCheckedChange={(checked) => setVisibleWidgets({ ...visibleWidgets, actionRequired: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="widget-pipeline" className="flex-1">Pipeline Summary</Label>
              <Switch
                id="widget-pipeline"
                checked={visibleWidgets.pipeline}
                onCheckedChange={(checked) => setVisibleWidgets({ ...visibleWidgets, pipeline: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="widget-deadlines" className="flex-1">Upcoming Deadlines</Label>
              <Switch
                id="widget-deadlines"
                checked={visibleWidgets.deadlines}
                onCheckedChange={(checked) => setVisibleWidgets({ ...visibleWidgets, deadlines: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="widget-creator" className="flex-1">Creator Availability</Label>
              <Switch
                id="widget-creator"
                checked={visibleWidgets.creatorAvailability}
                onCheckedChange={(checked) => setVisibleWidgets({ ...visibleWidgets, creatorAvailability: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="widget-financial" className="flex-1">Financial Overview</Label>
              <Switch
                id="widget-financial"
                checked={visibleWidgets.financial}
                onCheckedChange={(checked) => setVisibleWidgets({ ...visibleWidgets, financial: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="widget-performance" className="flex-1">Campaign Performance</Label>
              <Switch
                id="widget-performance"
                checked={visibleWidgets.performance}
                onCheckedChange={(checked) => setVisibleWidgets({ ...visibleWidgets, performance: checked })}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setVisibleWidgets(defaultWidgets);
                toast.success('Dashboard reset to default');
              }}
            >
              Reset to Default
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowCustomizeDialog(false);
                toast.success('Dashboard preferences saved');
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
