'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Search,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Building2,
  Users,
  Target,
  DollarSign,
  Loader2,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import {
  campaignApi,
  creatorDirectoryApi,
  type CampaignStatus,
} from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';

// Status badge config
const statusConfig: Record<CampaignStatus, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  posted: { label: 'Posted', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

export default function CampaignsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formatAmount, currency: userCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  // Form state for new campaign
  const [newCampaignForm, setNewCampaignForm] = useState({
    name: '',
    brandName: '',
    budget: '',
    startDate: '',
    endDate: '',
    description: '',
    selectedCreators: [] as string[],
  });

  // Fetch campaigns from API
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['agency-campaigns'],
    queryFn: () => campaignApi.getCampaigns(),
  });

  // Fetch creators for assignment
  const { data: creators = [] } = useQuery({
    queryKey: ['agency-creators'],
    queryFn: () => creatorDirectoryApi.getCreators(),
  });

  // Get unique brands from campaigns
  const existingBrands = useMemo(() => {
    const brands = campaigns.map(c => c.brand_name).filter(Boolean);
    return [...new Set(brands)];
  }, [campaigns]);

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: (data: Parameters<typeof campaignApi.createCampaign>[0]) =>
      campaignApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-campaigns'] });
      setShowNewCampaignDialog(false);
      setNewCampaignForm({
        name: '',
        brandName: '',
        budget: '',
        startDate: '',
        endDate: '',
        description: '',
        selectedCreators: [],
      });
      toast.success('Campaign created successfully');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to create campaign');
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignApi.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-campaigns'] });
      toast.success('Campaign deleted');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to delete campaign');
    },
  });

  // Handle create campaign
  const handleCreateCampaign = () => {
    if (!newCampaignForm.brandName || !newCampaignForm.budget) {
      toast.error('Please fill in required fields (Brand and Budget)');
      return;
    }
    createCampaignMutation.mutate({
      brand_name: newCampaignForm.brandName,
      value: parseFloat(newCampaignForm.budget),
      campaign_type: newCampaignForm.description || undefined,
      posting_date: newCampaignForm.startDate || undefined,
    });
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch =
      campaign.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campaign.campaign_type || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Toggle campaign expansion
  const toggleExpanded = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  // Calculate overall stats
  const stats = {
    activeCampaigns: campaigns.filter(c => c.status === 'in_progress' || c.status === 'posted').length,
    totalBudget: campaigns.reduce((sum, c) => sum + (c.value || 0), 0),
    totalSpent: campaigns.reduce((sum, c) => {
      const spent = c.deliverables_total > 0
        ? (c.deliverables_completed / c.deliverables_total) * c.value
        : 0;
      return sum + spent;
    }, 0),
    pendingDeliverables: campaigns.reduce((sum, c) =>
      sum + (c.deliverables_total - c.deliverables_completed), 0
    ),
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return formatAmount(Math.round(amount), userCurrency, { decimals: 0 });
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Toggle creator selection
  const toggleCreatorSelection = (creatorId: string) => {
    setNewCampaignForm(prev => ({
      ...prev,
      selectedCreators: prev.selectedCreators.includes(creatorId)
        ? prev.selectedCreators.filter(id => id !== creatorId)
        : [...prev.selectedCreators, creatorId],
    }));
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-500 dark:text-gray-400">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Campaigns</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage campaigns and track deliverables
          </p>
        </div>
        <Button
          className="gap-2 bg-green-600 hover:bg-green-700"
          onClick={() => setShowNewCampaignDialog(true)}
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.activeCampaigns}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stats.totalBudget)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Spent</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stats.totalSpent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.pendingDeliverables}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {filteredCampaigns.map(campaign => {
          const isExpanded = expandedCampaigns.has(campaign.id);
          const progress = campaign.deliverables_total > 0
            ? (campaign.deliverables_completed / campaign.deliverables_total) * 100
            : 0;
          const spent = campaign.deliverables_total > 0
            ? (campaign.deliverables_completed / campaign.deliverables_total) * campaign.value
            : 0;
          const statusInfo = statusConfig[campaign.status] || statusConfig.scheduled;

          return (
            <Card key={campaign.id} className="overflow-hidden">
              {/* Campaign Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => toggleExpanded(campaign.id)}
              >
                <div className="flex items-start gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(campaign.id);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        href={`/agency/campaigns/${campaign.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-gray-900 dark:text-gray-100 hover:text-green-600 dark:hover:text-green-400"
                      >
                        {campaign.brand_name}
                      </Link>
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {campaign.campaign_type && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {campaign.campaign_type}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {campaign.creators?.length || 0} creators
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(campaign.posting_date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Progress */}
                    <div className="w-32 hidden md:block">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {campaign.deliverables_completed}/{campaign.deliverables_total}
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                    {/* Budget & Spent */}
                    <div className="text-right min-w-[100px]">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(spent)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        of {formatCurrency(campaign.value)}
                      </p>
                    </div>
                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/agency/campaigns/${campaign.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Campaign
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Deliverable
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this campaign?')) {
                              deleteCampaignMutation.mutate(campaign.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Creators */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Assigned Creators ({campaign.creators?.length || 0})
                      </h4>
                      {campaign.creators && campaign.creators.length > 0 ? (
                        <div className="space-y-2">
                          {campaign.creators.map(creator => (
                            <div key={creator.id} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={creator.avatar_url || undefined} />
                                <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                                  {creator.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {creator.name}
                                </p>
                                <p className="text-xs text-gray-500">@{creator.handle}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No creators assigned</p>
                      )}
                    </div>

                    {/* Deliverables */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Deliverables ({campaign.deliverables?.length || 0})
                        </h4>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      {campaign.deliverables && campaign.deliverables.length > 0 ? (
                        <div className="space-y-2">
                          {campaign.deliverables.slice(0, 5).map(deliverable => (
                            <div
                              key={deliverable.id}
                              className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg"
                            >
                              <div className={cn(
                                "h-6 w-6 rounded flex items-center justify-center",
                                deliverable.status === 'completed'
                                  ? "bg-green-100 text-green-600"
                                  : deliverable.status === 'overdue'
                                  ? "bg-red-100 text-red-600"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-700"
                              )}>
                                {deliverable.status === 'completed' ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : deliverable.status === 'overdue' ? (
                                  <AlertTriangle className="h-4 w-4" />
                                ) : (
                                  <FileCheck className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {deliverable.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Due: {formatDate(deliverable.due_date)}
                                </p>
                              </div>
                            </div>
                          ))}
                          {campaign.deliverables.length > 5 && (
                            <p className="text-xs text-gray-500 text-center pt-2">
                              +{campaign.deliverables.length - 5} more deliverables
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No deliverables yet</p>
                      )}
                    </div>
                  </div>

                  {/* View Full Details Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href={`/agency/campaigns/${campaign.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        View Full Campaign
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No campaigns found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first campaign'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowNewCampaignDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Set up a new campaign with brand details, timeline, and creators
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Campaign Name & Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., Summer Launch"
                  value={newCampaignForm.name}
                  onChange={(e) => setNewCampaignForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-name">Brand *</Label>
                <Input
                  id="brand-name"
                  list="brand-suggestions"
                  placeholder="e.g., TechBrand"
                  value={newCampaignForm.brandName}
                  onChange={(e) => setNewCampaignForm(f => ({ ...f, brandName: e.target.value }))}
                />
                <datalist id="brand-suggestions">
                  {existingBrands.map(brand => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Budget & Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="budget">Budget *</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="10000"
                  value={newCampaignForm.budget}
                  onChange={(e) => setNewCampaignForm(f => ({ ...f, budget: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newCampaignForm.startDate}
                  onChange={(e) => setNewCampaignForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newCampaignForm.endDate}
                  onChange={(e) => setNewCampaignForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description / Campaign Type</Label>
              <Textarea
                id="description"
                placeholder="Describe the campaign goals and requirements..."
                rows={2}
                value={newCampaignForm.description}
                onChange={(e) => setNewCampaignForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Creator Selection */}
            <div className="grid gap-2">
              <Label>Assign Creators</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {creators.length > 0 ? (
                  creators.map(creator => (
                    <label
                      key={creator.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={newCampaignForm.selectedCreators.includes(creator.id)}
                        onCheckedChange={() => toggleCreatorSelection(creator.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={creator.avatar_url || undefined} />
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                          {creator.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {creator.name}
                        </p>
                        <p className="text-xs text-gray-500">@{creator.handle || creator.name.toLowerCase().replace(' ', '')}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No creators available
                  </p>
                )}
              </div>
              {newCampaignForm.selectedCreators.length > 0 && (
                <p className="text-xs text-gray-500">
                  {newCampaignForm.selectedCreators.length} creator(s) selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCampaignDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCreateCampaign}
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
