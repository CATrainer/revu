'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Calendar,
  Star,
  X,
  Loader2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { pipelineApi, creatorDirectoryApi, type Deal, type CreatorProfile } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

// Pipeline stages: Prospecting → Pitch Sent → Negotiation → Contract → Active → Completed
type PipelineStage = 'prospecting' | 'pitch_sent' | 'negotiation' | 'contract' | 'active' | 'completed';

const stageConfig: Record<PipelineStage, { label: string; color: string; bgColor: string; borderColor: string }> = {
  prospecting: {
    label: 'Prospecting',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-50 dark:bg-slate-900/40',
    borderColor: 'border-slate-400',
  },
  pitch_sent: {
    label: 'Pitch Sent',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/40',
    borderColor: 'border-blue-400',
  },
  negotiation: {
    label: 'Negotiation',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-900/40',
    borderColor: 'border-orange-400',
  },
  contract: {
    label: 'Contract',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-900/40',
    borderColor: 'border-purple-400',
  },
  active: {
    label: 'Active',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/40',
    borderColor: 'border-indigo-400',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/40',
    borderColor: 'border-emerald-400',
  },
};

const pipelineStages: PipelineStage[] = ['prospecting', 'pitch_sent', 'negotiation', 'contract', 'active', 'completed'];

// Map API stages to our pipeline stages
const mapApiStageToLocal = (apiStage: string): PipelineStage => {
  const mapping: Record<string, PipelineStage> = {
    'prospecting': 'prospecting',
    'pitch_sent': 'pitch_sent',
    'negotiating': 'negotiation',
    'negotiation': 'negotiation',
    'booked': 'contract',
    'contract': 'contract',
    'in_progress': 'active',
    'active': 'active',
    'completed': 'completed',
    'lost': 'prospecting',
  };
  return mapping[apiStage] || 'prospecting';
};

// Map local stages back to API stages
const mapLocalStageToApi = (localStage: PipelineStage): string => {
  const mapping: Record<PipelineStage, string> = {
    'prospecting': 'prospecting',
    'pitch_sent': 'pitch_sent',
    'negotiation': 'negotiating',
    'contract': 'booked',
    'active': 'in_progress',
    'completed': 'completed',
  };
  return mapping[localStage];
};

interface NewDealForm {
  brandName: string;
  creatorId: string;
  value: string;
  currency: string;
  stage: PipelineStage;
  expectedCloseDate: string;
  probability: string;
  notes: string;
}

const initialFormState: NewDealForm = {
  brandName: '',
  creatorId: '',
  value: '',
  currency: 'GBP',
  stage: 'prospecting',
  expectedCloseDate: '',
  probability: '50',
  notes: '',
};

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDealPanelOpen, setIsDealPanelOpen] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [newDealForm, setNewDealForm] = useState<NewDealForm>(initialFormState);

  const { formatAmount, currency: userCurrency } = useCurrency();
  const formatCurrency = (value: number) => formatAmount(value, userCurrency, { decimals: 0 });

  // Fetch deals from API
  const { data: apiDeals = [], isLoading } = useQuery({
    queryKey: ['agency-pipeline-deals'],
    queryFn: () => pipelineApi.getDeals(),
  });

  // Fetch creators for selector
  const { data: creators = [] } = useQuery({
    queryKey: ['agency-creators-list'],
    queryFn: () => creatorDirectoryApi.getCreators(),
  });

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: (data: Partial<Deal>) => pipelineApi.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-pipeline-deals'] });
      setIsNewDealOpen(false);
      setNewDealForm(initialFormState);
      toast.success('Deal created successfully');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to create deal');
    },
  });

  // Move deal mutation
  const moveDealMutation = useMutation({
    mutationFn: ({ dealId, stage }: { dealId: string; stage: string }) =>
      pipelineApi.moveDeal(dealId, stage as Parameters<typeof pipelineApi.moveDeal>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-pipeline-deals'] });
      toast.success('Deal moved');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to move deal');
    },
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: (dealId: string) => pipelineApi.deleteDeal(dealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-pipeline-deals'] });
      setIsDealPanelOpen(false);
      setSelectedDeal(null);
      toast.success('Deal deleted');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to delete deal');
    },
  });

  // Derive unique brand names from existing deals (no separate brands table needed)
  const existingBrands = useMemo(() => {
    const brandSet = new Set(apiDeals.map(d => d.brand_name).filter(Boolean));
    return Array.from(brandSet).sort();
  }, [apiDeals]);

  const handleCreateDeal = () => {
    if (!newDealForm.brandName) {
      toast.error('Please enter a brand name');
      return;
    }
    if (!newDealForm.value) {
      toast.error('Please enter a deal value');
      return;
    }
    
    createDealMutation.mutate({
      brand_name: newDealForm.brandName,
      value: parseFloat(newDealForm.value),
      currency: newDealForm.currency,
      stage: mapLocalStageToApi(newDealForm.stage) as Deal['stage'],
      creator_ids: newDealForm.creatorId ? [newDealForm.creatorId] : [],
      notes: newDealForm.notes,
      target_posting_date: newDealForm.expectedCloseDate || undefined,
    });
  };

  const filteredDeals = useMemo(() => {
    return apiDeals.filter(d =>
      d.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.creators?.some(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.handle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [apiDeals, searchQuery]);

  const getDealsByStage = (stage: PipelineStage) => {
    return filteredDeals.filter(d => mapApiStageToLocal(d.stage) === stage);
  };

  const getStageTotals = (stage: PipelineStage) => {
    const stageDeals = getDealsByStage(stage);
    return {
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + d.value, 0),
    };
  };

  const pipelineValue = filteredDeals
    .filter(d => mapApiStageToLocal(d.stage) !== 'completed')
    .reduce((sum, d) => sum + d.value, 0);

  const handleDragStart = (deal: Deal) => setDraggedDeal(deal);
  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };
  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    if (draggedDeal && mapApiStageToLocal(draggedDeal.stage) !== targetStage) {
      moveDealMutation.mutate({ dealId: draggedDeal.id, stage: mapLocalStageToApi(targetStage) });
    }
    setDraggedDeal(null);
    setDragOverStage(null);
  };
  const handleDragEnd = () => {
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsDealPanelOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pipeline</h1>
            <Badge variant="secondary" className="text-sm font-semibold">
              {formatCurrency(pipelineValue)}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Track deals from prospecting to completion
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search deals..."
              className="pl-9 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsNewDealOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Deal
          </Button>
        </div>
      </div>

      {/* Board View */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-2 min-w-full">
          {pipelineStages.map(stage => {
            const config = stageConfig[stage];
            const totals = getStageTotals(stage);
            const stageDeals = getDealsByStage(stage);
            const isDropTarget = dragOverStage === stage;

            return (
              <div
                key={stage}
                className={cn(
                  'flex-shrink-0 w-[240px] flex flex-col rounded-lg overflow-hidden',
                  isDropTarget && 'ring-2 ring-green-500'
                )}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                onDragLeave={() => setDragOverStage(null)}
              >
                {/* Column Header */}
                <div className={cn('px-2.5 py-2 border-b-2', config.bgColor, config.borderColor)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-semibold text-sm', config.color)}>{config.label}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">{totals.count}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setNewDealForm(f => ({ ...f, stage }));
                        setIsNewDealOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(totals.value)}</p>
                </div>

                {/* Column Content */}
                <div className="flex-1 p-1.5 bg-gray-50/50 dark:bg-gray-900/20 min-h-[320px] space-y-1.5">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : stageDeals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-20 text-gray-400 text-xs">
                      <p>No deals</p>
                    </div>
                  ) : (
                    stageDeals.map(deal => {
                      const isDragging = draggedDeal?.id === deal.id;
                      return (
                        <Card
                          key={deal.id}
                          className={cn(
                            'cursor-pointer hover:shadow-md transition-all border-l-2',
                            isDragging && 'opacity-50 scale-95',
                            deal.priority === 'high' ? 'border-l-orange-500' : 'border-l-transparent'
                          )}
                          draggable
                          onDragStart={() => handleDragStart(deal)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleDealClick(deal)}
                        >
                          <CardContent className="p-2">
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {deal.brand_name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {deal.brand_name}
                                  </p>
                                  {deal.creators && deal.creators.length > 0 && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {deal.creators.map(c => c.handle || c.name).join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {deal.priority === 'high' && (
                                <Star className="h-3 w-3 text-orange-500 fill-orange-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-xs">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(deal.value)}
                              </span>
                              {deal.target_posting_date && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(deal.target_posting_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
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

      {/* Create Deal Dialog */}
      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
            <DialogDescription>Add a new deal to your pipeline</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Row 1: Brand + Creator */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Brand *</Label>
                <Input
                  list="brand-suggestions"
                  placeholder="Enter brand name"
                  value={newDealForm.brandName}
                  onChange={(e) => setNewDealForm(f => ({ ...f, brandName: e.target.value }))}
                />
                <datalist id="brand-suggestions">
                  {existingBrands.map(brand => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label>Creator</Label>
                <Select
                  value={newDealForm.creatorId || 'none'}
                  onValueChange={(value) => setNewDealForm(f => ({ ...f, creatorId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {creators.map((creator: CreatorProfile) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        {creator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Value + Currency + Stage */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="15000"
                  value={newDealForm.value}
                  onChange={(e) => setNewDealForm(f => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={newDealForm.currency} onValueChange={(value) => setNewDealForm(f => ({ ...f, currency: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Stage</Label>
                <Select value={newDealForm.stage} onValueChange={(value) => setNewDealForm(f => ({ ...f, stage: value as PipelineStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map(stage => (
                      <SelectItem key={stage} value={stage}>{stageConfig[stage].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Close Date + Probability */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="closeDate">Expected Close</Label>
                <Input
                  id="closeDate"
                  type="date"
                  value={newDealForm.expectedCloseDate}
                  onChange={(e) => setNewDealForm(f => ({ ...f, expectedCloseDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="probability">Probability %</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={newDealForm.probability}
                  onChange={(e) => setNewDealForm(f => ({ ...f, probability: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 4: Notes */}
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                rows={2}
                value={newDealForm.notes}
                onChange={(e) => setNewDealForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDealOpen(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateDeal} disabled={createDealMutation.isPending}>
              {createDealMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : 'Create Deal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal Detail Panel */}
      {isDealPanelOpen && selectedDeal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsDealPanelOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedDeal.brand_name}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Delete this deal?')) {
                      deleteDealMutation.mutate(selectedDeal.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsDealPanelOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-5">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Stage</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge className={cn('text-sm', stageConfig[mapApiStageToLocal(selectedDeal.stage)].bgColor, stageConfig[mapApiStageToLocal(selectedDeal.stage)].color)}>
                    {stageConfig[mapApiStageToLocal(selectedDeal.stage)].label}
                  </Badge>
                  {selectedDeal.days_in_stage > 0 && (
                    <span className="text-xs text-gray-500">{selectedDeal.days_in_stage} days</span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Deal Value</Label>
                <p className="text-2xl font-bold mt-1">{formatCurrency(selectedDeal.value)}</p>
              </div>

              {selectedDeal.creators && selectedDeal.creators.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Creators</Label>
                  <div className="mt-2 space-y-2">
                    {selectedDeal.creators.map(creator => (
                      <div key={creator.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                          {creator.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{creator.name}</p>
                          <p className="text-xs text-gray-500">{creator.handle} • {creator.platform}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDeal.target_posting_date && (
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Expected Close</Label>
                  <p className="mt-1 font-medium">
                    {new Date(selectedDeal.target_posting_date).toLocaleDateString('en-GB', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              )}

              {selectedDeal.notes && (
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Notes</Label>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedDeal.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Move to Stage</Label>
                <div className="flex flex-wrap gap-2">
                  {pipelineStages.map(stage => {
                    const isCurrentStage = mapApiStageToLocal(selectedDeal.stage) === stage;
                    return (
                      <Button
                        key={stage}
                        variant={isCurrentStage ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={isCurrentStage || moveDealMutation.isPending}
                        onClick={() => moveDealMutation.mutate({ dealId: selectedDeal.id, stage: mapLocalStageToApi(stage) })}
                        className={cn('text-xs', isCurrentStage && stageConfig[stage].bgColor)}
                      >
                        {isCurrentStage && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {stageConfig[stage].label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
