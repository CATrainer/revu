'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  SortAsc,
  LayoutGrid,
  List,
  BarChart3,
  MoreVertical,
  Calendar,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  Star,
  ArrowRight,
  GripVertical,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import type { Deal, DealStage, DealStatus, PipelineStats } from '@/lib/agency-dashboard-api';

// Stage configuration
const stageConfig: Record<DealStage, { label: string; color: string; bgColor: string; borderColor: string }> = {
  prospecting: {
    label: 'Prospecting',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    borderColor: 'border-t-slate-500',
  },
  pitch_sent: {
    label: 'Pitch Sent',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-t-blue-500',
  },
  negotiating: {
    label: 'Negotiating',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-t-amber-500',
  },
  booked: {
    label: 'Booked',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-t-green-500',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-t-purple-500',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-t-emerald-500',
  },
  lost: {
    label: 'Lost',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-t-red-500',
  },
};

// Mock data for demonstration
const mockDeals: Deal[] = [
  {
    id: '1',
    agency_id: '1',
    brand_name: 'Brand X',
    brand_logo_url: undefined,
    creator_ids: ['1'],
    creators: [{ id: '1', name: 'John Smith', handle: '@johnsmith', platform: 'YouTube' }],
    value: 15000,
    currency: 'GBP',
    stage: 'negotiating',
    status: 'on_track',
    priority: 'high',
    target_posting_date: '2025-02-15',
    campaign_type: 'Product Review',
    tags: ['Tech', 'Review'],
    owner_id: '1',
    owner_name: 'Caleb',
    notes: 'Great potential partnership',
    next_action: 'Awaiting brand approval on script',
    days_in_stage: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    agency_id: '1',
    brand_name: 'Brand Y',
    creator_ids: ['2'],
    creators: [{ id: '2', name: 'Jane Doe', handle: '@janedoe', platform: 'Instagram' }],
    value: 8000,
    currency: 'GBP',
    stage: 'pitch_sent',
    status: 'on_track',
    priority: 'medium',
    tags: ['Lifestyle'],
    owner_name: 'Peter',
    days_in_stage: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    agency_id: '1',
    brand_name: 'Brand Z',
    creator_ids: ['1', '3'],
    creators: [
      { id: '1', name: 'John Smith', handle: '@johnsmith', platform: 'YouTube' },
      { id: '3', name: 'Mike Johnson', handle: '@mikej', platform: 'TikTok' },
    ],
    value: 25000,
    currency: 'GBP',
    stage: 'booked',
    status: 'action_needed',
    priority: 'high',
    target_posting_date: '2025-01-20',
    campaign_type: 'Sponsored Post',
    tags: ['Gaming'],
    owner_name: 'Caleb',
    next_action: 'Send contract to brand',
    days_in_stage: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    agency_id: '1',
    brand_name: 'Brand A',
    creator_ids: ['2'],
    creators: [{ id: '2', name: 'Jane Doe', handle: '@janedoe', platform: 'Instagram' }],
    value: 5000,
    currency: 'GBP',
    stage: 'prospecting',
    status: 'on_track',
    priority: 'low',
    tags: ['Beauty'],
    owner_name: 'Ollie',
    days_in_stage: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    agency_id: '1',
    brand_name: 'Brand B',
    creator_ids: ['3'],
    creators: [{ id: '3', name: 'Mike Johnson', handle: '@mikej', platform: 'TikTok' }],
    value: 12000,
    currency: 'GBP',
    stage: 'in_progress',
    status: 'on_track',
    priority: 'medium',
    target_posting_date: '2025-01-25',
    campaign_type: 'Brand Integration',
    tags: ['Tech', 'Review'],
    owner_name: 'Peter',
    days_in_stage: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    agency_id: '1',
    brand_name: 'Brand C',
    creator_ids: ['1'],
    creators: [{ id: '1', name: 'John Smith', handle: '@johnsmith', platform: 'YouTube' }],
    value: 10000,
    currency: 'GBP',
    stage: 'completed',
    status: 'on_track',
    priority: 'none',
    tags: ['Gaming'],
    owner_name: 'Caleb',
    days_in_stage: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Active stages (exclude completed and lost for main board view)
const activeStages: DealStage[] = ['prospecting', 'pitch_sent', 'negotiating', 'booked', 'in_progress'];
const allStages: DealStage[] = [...activeStages, 'completed', 'lost'];

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'board' | 'list' | 'analytics'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDealPanelOpen, setIsDealPanelOpen] = useState(false);
  const [showCompletedStages, setShowCompletedStages] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  // Calculate pipeline value
  const pipelineValue = deals
    .filter(d => !['completed', 'lost'].includes(d.stage))
    .reduce((sum, d) => sum + d.value, 0);

  // Filter deals by search query
  const filteredDeals = deals.filter(
    d =>
      d.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.creators.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.handle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get deals by stage
  const getDealsByStage = (stage: DealStage) => {
    return filteredDeals.filter(d => d.stage === stage);
  };

  // Calculate stage totals
  const getStageTotals = (stage: DealStage) => {
    const stageDeals = getDealsByStage(stage);
    return {
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + d.value, 0),
    };
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle drag start
  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    if (draggedDeal && draggedDeal.stage !== targetStage) {
      setDeals(prev =>
        prev.map(d =>
          d.id === draggedDeal.id
            ? { ...d, stage: targetStage, days_in_stage: 0 }
            : d
        )
      );
    }
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  // Handle deal click
  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsDealPanelOpen(true);
  };

  // Get status indicator
  const getStatusIndicator = (deal: Deal) => {
    if (deal.days_in_stage > 14) {
      return { color: 'bg-red-500', label: 'Stagnant' };
    }
    if (deal.days_in_stage > 7) {
      return { color: 'bg-yellow-500', label: 'Slow' };
    }
    if (deal.status === 'action_needed') {
      return { color: 'bg-orange-500', label: 'Action needed' };
    }
    return { color: 'bg-green-500', label: 'On track' };
  };

  const visibleStages = showCompletedStages ? allStages : activeStages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Campaign Pipeline
            </h1>
            <Badge variant="secondary" className="text-sm">
              {formatCurrency(pipelineValue)}
            </Badge>
          </div>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage your deals from prospecting to completion
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <Button
              variant={view === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => setView('board')}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={view === 'analytics' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => setView('analytics')}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>

          {/* New Deal Button */}
          <Button onClick={() => setIsNewDealOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search deals..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <SortAsc className="h-4 w-4" />
            Sort
          </Button>
          <Button
            variant={showCompletedStages ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowCompletedStages(!showCompletedStages)}
          >
            Show All Stages
          </Button>
        </div>
      </div>

      {/* Board View */}
      {view === 'board' && (
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-4 min-w-full">
            {visibleStages.map(stage => {
              const config = stageConfig[stage];
              const totals = getStageTotals(stage);
              const stageDeals = getDealsByStage(stage);
              const isDropTarget = dragOverStage === stage;

              return (
                <div
                  key={stage}
                  className={cn(
                    'flex-shrink-0 w-[300px] flex flex-col',
                    isDropTarget && 'ring-2 ring-green-500 ring-offset-2 rounded-lg'
                  )}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDrop={(e) => handleDrop(e, stage)}
                  onDragLeave={() => setDragOverStage(null)}
                >
                  {/* Column Header */}
                  <div className={cn(
                    'p-3 rounded-t-lg border-t-4',
                    config.bgColor,
                    config.borderColor
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-medium', config.color)}>
                          {config.label}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {totals.count}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setIsNewDealOpen(true)}>
                            Add deal to {config.label}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatCurrency(totals.value)}
                    </p>
                  </div>

                  {/* Column Content */}
                  <div className="flex-1 p-2 bg-gray-100/50 dark:bg-gray-800/30 rounded-b-lg min-h-[400px] space-y-2">
                    {stageDeals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                        <p>No deals</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => setIsNewDealOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Deal
                        </Button>
                      </div>
                    ) : (
                      stageDeals.map(deal => {
                        const statusIndicator = getStatusIndicator(deal);
                        const isDragging = draggedDeal?.id === deal.id;

                        return (
                          <Card
                            key={deal.id}
                            className={cn(
                              'cursor-pointer hover:shadow-md transition-all',
                              isDragging && 'opacity-50 scale-95',
                              deal.status === 'action_needed' && 'border-l-4 border-l-orange-500',
                              deal.days_in_stage > 14 && 'border-l-4 border-l-red-500'
                            )}
                            draggable
                            onDragStart={() => handleDragStart(deal)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleDealClick(deal)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                                    {deal.brand_name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                      {deal.brand_name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {deal.creators.map(c => c.handle).join(', ')}
                                    </p>
                                  </div>
                                </div>
                                {deal.priority === 'high' && (
                                  <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                                )}
                              </div>

                              <div className="mt-3 flex items-center justify-between text-xs">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatCurrency(deal.value)}
                                </span>
                                {deal.target_posting_date && (
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(deal.target_posting_date).toLocaleDateString('en-GB', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <div className={cn('h-1.5 w-1.5 rounded-full', statusIndicator.color)} />
                                  <span className="text-gray-500">{deal.days_in_stage}d in stage</span>
                                </div>
                                {deal.tags.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {deal.tags[0]}
                                  </Badge>
                                )}
                              </div>

                              {deal.next_action && (
                                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                                  {deal.next_action}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Brand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Creators</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Posting Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDeals.map(deal => {
                  const config = stageConfig[deal.stage];
                  const statusIndicator = getStatusIndicator(deal);

                  return (
                    <tr
                      key={deal.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => handleDealClick(deal)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-medium">
                            {deal.brand_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {deal.brand_name}
                            </p>
                            {deal.campaign_type && (
                              <p className="text-xs text-gray-500">{deal.campaign_type}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          {deal.creators.slice(0, 2).map((creator, i) => (
                            <div
                              key={creator.id}
                              className={cn(
                                'h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-900',
                                i > 0 && '-ml-2'
                              )}
                            >
                              {creator.name.charAt(0)}
                            </div>
                          ))}
                          {deal.creators.length > 2 && (
                            <span className="ml-2 text-xs text-gray-500">
                              +{deal.creators.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={cn('text-xs', config.bgColor, config.color)}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {formatCurrency(deal.value)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {deal.target_posting_date
                          ? new Date(deal.target_posting_date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={cn(
                          deal.days_in_stage > 14 ? 'text-red-600' :
                            deal.days_in_stage > 7 ? 'text-yellow-600' :
                              'text-gray-500'
                        )}>
                          {deal.days_in_stage}d
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', statusIndicator.color)} />
                          <span className="text-xs text-gray-500">{statusIndicator.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Analytics View */}
      {view === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allStages.map(stage => {
                  const config = stageConfig[stage];
                  const totals = getStageTotals(stage);
                  const percentage = deals.length > 0 ? (totals.count / deals.length) * 100 : 0;

                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={config.color}>{config.label}</span>
                        <span className="text-gray-500">
                          {totals.count} deals ({formatCurrency(totals.value)})
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', config.bgColor.replace('bg-', 'bg-').replace('-100', '-500'))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Win Rate Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-4xl font-bold text-green-600">65%</div>
                <p className="text-gray-500 mt-2">Overall Win Rate</p>
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {deals.filter(d => d.stage === 'completed').length}
                    </div>
                    <p className="text-xs text-gray-500">Won</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {deals.filter(d => d.stage === 'lost').length}
                    </div>
                    <p className="text-xs text-gray-500">Lost</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {deals.filter(d => !['completed', 'lost'].includes(d.stage)).length}
                    </div>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Deal Dialog */}
      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
            <DialogDescription>
              Add a new deal to your pipeline. You can add more details later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand Name</Label>
              <Input id="brand" placeholder="Enter brand name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Deal Value (GBP)</Label>
              <Input id="value" type="number" placeholder="15000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator">Creator</Label>
              <Input id="creator" placeholder="Select or search creators" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Initial Stage</Label>
              <select id="stage" className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent">
                {activeStages.map(stage => (
                  <option key={stage} value={stage}>{stageConfig[stage].label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDealOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              Create Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal Detail Panel */}
      {isDealPanelOpen && selectedDeal && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedDeal.brand_name}</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsDealPanelOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-4 space-y-6">
            {/* Stage */}
            <div>
              <Label className="text-xs text-gray-500">Stage</Label>
              <div className="mt-1">
                <Badge className={cn('text-sm', stageConfig[selectedDeal.stage].bgColor, stageConfig[selectedDeal.stage].color)}>
                  {stageConfig[selectedDeal.stage].label}
                </Badge>
              </div>
            </div>

            {/* Value */}
            <div>
              <Label className="text-xs text-gray-500">Deal Value</Label>
              <p className="text-2xl font-bold">{formatCurrency(selectedDeal.value)}</p>
            </div>

            {/* Creators */}
            <div>
              <Label className="text-xs text-gray-500">Creators</Label>
              <div className="mt-2 space-y-2">
                {selectedDeal.creators.map(creator => (
                  <div key={creator.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-medium">
                      {creator.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{creator.name}</p>
                      <p className="text-sm text-gray-500">{creator.handle} • {creator.platform}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Posting Date */}
            {selectedDeal.target_posting_date && (
              <div>
                <Label className="text-xs text-gray-500">Target Posting Date</Label>
                <p className="mt-1 font-medium">
                  {new Date(selectedDeal.target_posting_date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {/* Tags */}
            {selectedDeal.tags.length > 0 && (
              <div>
                <Label className="text-xs text-gray-500">Tags</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDeal.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Next Action */}
            {selectedDeal.next_action && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Label className="text-xs text-yellow-600">Next Action</Label>
                <p className="mt-1 text-yellow-800 dark:text-yellow-200">
                  {selectedDeal.next_action}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button variant="outline" className="flex-1">
                Edit Deal
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                View Campaign
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Backdrop */}
      {isDealPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsDealPanelOpen(false)}
        />
      )}
    </div>
  );
}
