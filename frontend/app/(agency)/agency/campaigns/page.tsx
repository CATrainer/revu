'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileVideo,
  FileText,
  Image,
  Upload,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Paperclip,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  Send,
  Download,
  Play,
  Building2,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  CalendarDays,
  X,
} from 'lucide-react';

// Types
type CampaignStatus = 'active' | 'completed' | 'draft' | 'paused';
type DeliverableStatus = 'pending' | 'in_progress' | 'submitted' | 'revision_requested' | 'approved' | 'published';
type DeliverableType = 'script' | 'video_draft' | 'final_video' | 'thumbnail' | 'caption' | 'story' | 'reel' | 'post';

interface Deliverable {
  id: string;
  campaign_id: string;
  creator_id: string;
  creator_name: string;
  creator_avatar: string | null;
  type: DeliverableType;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  due_date: string;
  submitted_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  file_url: string | null;
  revision_count: number;
  feedback: string | null;
}

interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo: string | null;
  status: CampaignStatus;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  creator_count: number;
  deliverable_count: number;
  completed_deliverables: number;
  description: string | null;
  creators: {
    id: string;
    name: string;
    avatar: string | null;
  }[];
  deliverables: Deliverable[];
}

// Mock data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    title: 'Summer Launch 2024',
    brand_name: 'TechBrand',
    brand_logo: null,
    status: 'active',
    start_date: '2024-06-01',
    end_date: '2024-07-31',
    budget: 50000,
    spent: 32500,
    creator_count: 5,
    deliverable_count: 15,
    completed_deliverables: 8,
    description: 'Summer product launch campaign featuring our new tech lineup',
    creators: [
      { id: '1', name: 'Alex Johnson', avatar: null },
      { id: '2', name: 'Sarah Miller', avatar: null },
      { id: '3', name: 'Mike Chen', avatar: null },
      { id: '4', name: 'Emma Davis', avatar: null },
      { id: '5', name: 'Chris Wilson', avatar: null },
    ],
    deliverables: [
      {
        id: 'd1',
        campaign_id: '1',
        creator_id: '1',
        creator_name: 'Alex Johnson',
        creator_avatar: null,
        type: 'script',
        title: 'Product Review Script',
        description: 'Main talking points for the review video',
        status: 'approved',
        due_date: '2024-06-10',
        submitted_at: '2024-06-08',
        approved_at: '2024-06-09',
        published_at: null,
        file_url: null,
        revision_count: 1,
        feedback: null,
      },
      {
        id: 'd2',
        campaign_id: '1',
        creator_id: '1',
        creator_name: 'Alex Johnson',
        creator_avatar: null,
        type: 'video_draft',
        title: 'Review Video Draft',
        description: 'First cut of the product review',
        status: 'revision_requested',
        due_date: '2024-06-20',
        submitted_at: '2024-06-18',
        approved_at: null,
        published_at: null,
        file_url: null,
        revision_count: 2,
        feedback: 'Please add more B-roll footage of the product features',
      },
      {
        id: 'd3',
        campaign_id: '1',
        creator_id: '1',
        creator_name: 'Alex Johnson',
        creator_avatar: null,
        type: 'final_video',
        title: 'Final Review Video',
        description: 'Final approved video ready for publishing',
        status: 'pending',
        due_date: '2024-06-30',
        submitted_at: null,
        approved_at: null,
        published_at: null,
        file_url: null,
        revision_count: 0,
        feedback: null,
      },
      {
        id: 'd4',
        campaign_id: '1',
        creator_id: '2',
        creator_name: 'Sarah Miller',
        creator_avatar: null,
        type: 'script',
        title: 'Unboxing Script',
        description: 'Script for unboxing video',
        status: 'approved',
        due_date: '2024-06-12',
        submitted_at: '2024-06-11',
        approved_at: '2024-06-12',
        published_at: null,
        file_url: null,
        revision_count: 0,
        feedback: null,
      },
      {
        id: 'd5',
        campaign_id: '1',
        creator_id: '2',
        creator_name: 'Sarah Miller',
        creator_avatar: null,
        type: 'video_draft',
        title: 'Unboxing Video Draft',
        description: 'First cut of unboxing',
        status: 'submitted',
        due_date: '2024-06-22',
        submitted_at: '2024-06-21',
        approved_at: null,
        published_at: null,
        file_url: null,
        revision_count: 0,
        feedback: null,
      },
      {
        id: 'd6',
        campaign_id: '1',
        creator_id: '3',
        creator_name: 'Mike Chen',
        creator_avatar: null,
        type: 'script',
        title: 'Tutorial Script',
        description: 'How-to guide script',
        status: 'in_progress',
        due_date: '2024-06-15',
        submitted_at: null,
        approved_at: null,
        published_at: null,
        file_url: null,
        revision_count: 0,
        feedback: null,
      },
    ],
  },
  {
    id: '2',
    title: 'Holiday Gift Guide',
    brand_name: 'GiftCo',
    brand_logo: null,
    status: 'active',
    start_date: '2024-11-01',
    end_date: '2024-12-20',
    budget: 75000,
    spent: 45000,
    creator_count: 8,
    deliverable_count: 24,
    completed_deliverables: 12,
    description: 'Holiday season gift guide featuring our top products',
    creators: [
      { id: '1', name: 'Alex Johnson', avatar: null },
      { id: '2', name: 'Sarah Miller', avatar: null },
      { id: '6', name: 'Lisa Park', avatar: null },
    ],
    deliverables: [],
  },
  {
    id: '3',
    title: 'Q1 Brand Awareness',
    brand_name: 'StyleBrand',
    brand_logo: null,
    status: 'draft',
    start_date: '2025-01-15',
    end_date: '2025-03-31',
    budget: 100000,
    spent: 0,
    creator_count: 0,
    deliverable_count: 0,
    completed_deliverables: 0,
    description: 'Brand awareness campaign for Q1 2025',
    creators: [],
    deliverables: [],
  },
  {
    id: '4',
    title: 'Spring Collection',
    brand_name: 'FashionX',
    brand_logo: null,
    status: 'completed',
    start_date: '2024-03-01',
    end_date: '2024-05-31',
    budget: 60000,
    spent: 58500,
    creator_count: 6,
    deliverable_count: 18,
    completed_deliverables: 18,
    description: 'Spring fashion collection launch campaign',
    creators: [
      { id: '4', name: 'Emma Davis', avatar: null },
      { id: '5', name: 'Chris Wilson', avatar: null },
    ],
    deliverables: [],
  },
];

// Status badge config
const statusConfig: Record<CampaignStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

const deliverableStatusConfig: Record<DeliverableStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', icon: Play },
  submitted: { label: 'Submitted', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', icon: Upload },
  revision_requested: { label: 'Revision', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertTriangle },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', icon: ExternalLink },
};

const deliverableTypeIcons: Record<DeliverableType, React.ElementType> = {
  script: FileText,
  video_draft: FileVideo,
  final_video: FileVideo,
  thumbnail: Image,
  caption: FileText,
  story: Play,
  reel: Play,
  post: Image,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [view, setView] = useState<'board' | 'list' | 'timeline'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set(['1']));

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
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
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
    totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
    pendingDeliverables: campaigns.reduce((sum, c) =>
      c.deliverables.filter(d => d.status === 'submitted' || d.status === 'revision_requested').length + sum, 0
    ),
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check if date is overdue
  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  // Days until date
  const daysUntil = (dateString: string) => {
    const diff = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

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
        <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new campaign with brand details and timeline
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="campaign-title">Campaign Title</Label>
                <Input id="campaign-title" placeholder="e.g., Summer Product Launch" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="brand-name">Brand Name</Label>
                  <Input id="brand-name" placeholder="e.g., TechBrand" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input id="budget" type="number" placeholder="50000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input id="start-date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input id="end-date" type="date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the campaign goals and requirements..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCampaignDialog(false)}>
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <TrendingUp className="h-5 w-5 text-purple-600" />
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.pendingDeliverables}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg">
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('board')}
              className="rounded-none border-x"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'timeline' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('timeline')}
              className="rounded-l-none"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          {filteredCampaigns.map(campaign => {
            const isExpanded = expandedCampaigns.has(campaign.id);
            const progress = campaign.deliverable_count > 0
              ? (campaign.completed_deliverables / campaign.deliverable_count) * 100
              : 0;

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
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {campaign.title}
                        </h3>
                        <Badge className={statusConfig[campaign.status].color}>
                          {statusConfig[campaign.status].label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {campaign.brand_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {campaign.creator_count} creators
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {/* Progress */}
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Progress</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {campaign.completed_deliverables}/{campaign.deliverable_count}
                          </span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                      {/* Budget */}
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(campaign.spent)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          of {formatCurrency(campaign.budget)}
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
                          <DropdownMenuItem onClick={() => setSelectedCampaign(campaign)}>
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
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Expanded Deliverables */}
                {isExpanded && campaign.deliverables.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Deliverables ({campaign.deliverables.length})
                        </h4>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Deliverable
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {campaign.deliverables.map(deliverable => {
                          const StatusIcon = deliverableStatusConfig[deliverable.status].icon;
                          const TypeIcon = deliverableTypeIcons[deliverable.type];
                          const days = daysUntil(deliverable.due_date);
                          const overdue = deliverable.status !== 'approved' &&
                                          deliverable.status !== 'published' &&
                                          isOverdue(deliverable.due_date);

                          return (
                            <div
                              key={deliverable.id}
                              className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center",
                                deliverableStatusConfig[deliverable.status].color
                              )}>
                                <TypeIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {deliverable.title}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {deliverable.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {deliverable.creator_name}
                                </p>
                              </div>
                              <Badge className={deliverableStatusConfig[deliverable.status].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {deliverableStatusConfig[deliverable.status].label}
                              </Badge>
                              <div className={cn(
                                "text-xs text-right",
                                overdue ? "text-red-600" : "text-gray-500 dark:text-gray-400"
                              )}>
                                {overdue ? (
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Overdue
                                  </span>
                                ) : days <= 0 ? (
                                  'Due today'
                                ) : days === 1 ? (
                                  'Due tomorrow'
                                ) : (
                                  `Due in ${days} days`
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {deliverable.status === 'submitted' && (
                                    <>
                                      <DropdownMenuItem className="text-green-600">
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-orange-600">
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Request Revision
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {deliverable.file_url && (
                                    <DropdownMenuItem>
                                      <Download className="mr-2 h-4 w-4" />
                                      Download
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Add Comment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty deliverables state */}
                {isExpanded && campaign.deliverables.length === 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-8 text-center">
                    <FileVideo className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      No deliverables yet
                    </p>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Deliverable
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Board View */}
      {view === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['draft', 'active', 'paused', 'completed'].map(status => {
            const statusCampaigns = filteredCampaigns.filter(c => c.status === status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={statusConfig[status as CampaignStatus].color}>
                    {statusConfig[status as CampaignStatus].label}
                  </Badge>
                  <span className="text-sm text-gray-500">{statusCampaigns.length}</span>
                </div>
                <div className="space-y-3">
                  {statusCampaigns.map(campaign => (
                    <Card
                      key={campaign.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                          {campaign.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {campaign.brand_name}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{campaign.creator_count} creators</span>
                          <span>{formatCurrency(campaign.budget)}</span>
                        </div>
                        {campaign.deliverable_count > 0 && (
                          <div className="mt-3">
                            <Progress
                              value={(campaign.completed_deliverables / campaign.deliverable_count) * 100}
                              className="h-1"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {statusCampaigns.length === 0 && (
                    <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-center">
                      <p className="text-sm text-gray-400">No campaigns</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline View */}
      {view === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Timeline</CardTitle>
            <CardDescription>Visual timeline of all campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCampaigns.map(campaign => {
                const startDate = new Date(campaign.start_date);
                const endDate = new Date(campaign.end_date);
                const today = new Date();
                const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

                return (
                  <div key={campaign.id} className="flex items-center gap-4">
                    <div className="w-48 flex-shrink-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {campaign.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {campaign.brand_name}
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                        <div
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-lg",
                            campaign.status === 'completed'
                              ? 'bg-blue-500'
                              : campaign.status === 'active'
                              ? 'bg-green-500'
                              : campaign.status === 'paused'
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                          )}
                          style={{ width: `${campaign.status === 'completed' ? 100 : progressPercent}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                          <span className="font-medium text-white mix-blend-difference">
                            {formatDate(campaign.start_date)}
                          </span>
                          <Badge className={cn("text-xs", statusConfig[campaign.status].color)}>
                            {statusConfig[campaign.status].label}
                          </Badge>
                          <span className="font-medium text-white mix-blend-difference">
                            {formatDate(campaign.end_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {campaign.completed_deliverables}/{campaign.deliverable_count}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">deliverables</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign Detail Slide-over */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedCampaign(null)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedCampaign.title}
                </h2>
                <Badge className={statusConfig[selectedCampaign.status].color}>
                  {statusConfig[selectedCampaign.status].label}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCampaign(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Campaign Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Campaign Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Brand</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedCampaign.brand_name}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(selectedCampaign.budget)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(selectedCampaign.start_date)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">End Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(selectedCampaign.end_date)}
                    </p>
                  </div>
                </div>
                {selectedCampaign.description && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                    {selectedCampaign.description}
                  </p>
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Progress
                  </h3>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedCampaign.completed_deliverables} of {selectedCampaign.deliverable_count} deliverables
                  </span>
                </div>
                <Progress
                  value={selectedCampaign.deliverable_count > 0
                    ? (selectedCampaign.completed_deliverables / selectedCampaign.deliverable_count) * 100
                    : 0
                  }
                  className="h-2"
                />
              </div>

              {/* Creators */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Creators ({selectedCampaign.creators.length})
                  </h3>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Creator
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedCampaign.creators.map(creator => (
                    <div
                      key={creator.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={creator.avatar || undefined} />
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                          {creator.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {creator.name}
                      </span>
                    </div>
                  ))}
                  {selectedCampaign.creators.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No creators assigned yet
                    </p>
                  )}
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Deliverables ({selectedCampaign.deliverables.length})
                  </h3>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Deliverable
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedCampaign.deliverables.map(deliverable => {
                    const StatusIcon = deliverableStatusConfig[deliverable.status].icon;
                    const TypeIcon = deliverableTypeIcons[deliverable.type];

                    return (
                      <div
                        key={deliverable.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          deliverableStatusConfig[deliverable.status].color
                        )}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {deliverable.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {deliverable.creator_name} - Due {formatDate(deliverable.due_date)}
                          </p>
                        </div>
                        <Badge className={cn("text-xs", deliverableStatusConfig[deliverable.status].color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {deliverableStatusConfig[deliverable.status].label}
                        </Badge>
                      </div>
                    );
                  })}
                  {selectedCampaign.deliverables.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No deliverables yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
