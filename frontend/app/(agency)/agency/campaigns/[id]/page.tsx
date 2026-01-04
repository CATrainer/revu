'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  campaignApi,
  creatorDirectoryApi,
  type Deliverable,
  type DeliverableType,
  type DeliverableStatus,
  type CampaignStatus,
} from '@/lib/agency-dashboard-api';
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Video,
  Package,
  FileText,
  Send,
  BarChart3,
  Edit,
  MoreHorizontal,
  ExternalLink,
  User,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// Status configuration
const statusConfig: Record<CampaignStatus, { label: string; color: string; bgColor: string }> = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  posted: {
    label: 'Posted',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  archived: {
    label: 'Archived',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

// Deliverable type configuration
const deliverableTypeConfig: Record<DeliverableType, { label: string; icon: React.ElementType; color: string }> = {
  brief_sent: { label: 'Brief Sent', icon: Send, color: 'text-blue-600' },
  product_shipped: { label: 'Product Shipped', icon: Package, color: 'text-orange-600' },
  script_draft: { label: 'Script Draft', icon: FileText, color: 'text-purple-600' },
  brand_approval: { label: 'Brand Approval', icon: CheckCircle, color: 'text-green-600' },
  content_production: { label: 'Content Production', icon: Video, color: 'text-pink-600' },
  content_posted: { label: 'Content Posted', icon: ExternalLink, color: 'text-emerald-600' },
  performance_report: { label: 'Performance Report', icon: BarChart3, color: 'text-indigo-600' },
};

// Deliverable status configuration
const deliverableStatusConfig: Record<DeliverableStatus, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: 'Pending',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

// Activity log type
interface ActivityLogEntry {
  id: string;
  type: 'note' | 'status_change' | 'deliverable' | 'creator_added';
  message: string;
  user: string;
  timestamp: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const campaignId = params.id as string;
  const { formatAmount, currency: userCurrency } = useCurrency();

  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddDeliverableDialog, setShowAddDeliverableDialog] = useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showAssignCreatorDialog, setShowAssignCreatorDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newDeliverable, setNewDeliverable] = useState({
    title: '',
    type: 'brief_sent' as DeliverableType,
    due_date: '',
    owner_id: '',
    description: '',
  });
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);

  // Fetch campaign data
  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignApi.getCampaign(campaignId),
    enabled: !!campaignId,
  });

  // Fetch all creators for assignment
  const { data: allCreators = [] } = useQuery({
    queryKey: ['agency-creators'],
    queryFn: () => creatorDirectoryApi.getCreators(),
  });

  // Complete deliverable mutation
  const completeDeliverableMutation = useMutation({
    mutationFn: ({ deliverableId }: { deliverableId: string }) =>
      campaignApi.completeDeliverable(campaignId, deliverableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Deliverable marked as complete');
    },
    onError: () => {
      toast.error('Failed to complete deliverable');
    },
  });

  // Create deliverable mutation
  const createDeliverableMutation = useMutation({
    mutationFn: (data: Partial<Deliverable>) =>
      campaignApi.createDeliverable(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      setShowAddDeliverableDialog(false);
      setNewDeliverable({
        title: '',
        type: 'brief_sent',
        due_date: '',
        owner_id: '',
        description: '',
      });
      toast.success('Deliverable added');
    },
    onError: () => {
      toast.error('Failed to add deliverable');
    },
  });

  // Format helpers
  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatAmount(Math.round(numValue), userCurrency, { decimals: 0 });
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle add deliverable
  const handleAddDeliverable = () => {
    if (!newDeliverable.type) {
      toast.error('Please select a deliverable type');
      return;
    }
    createDeliverableMutation.mutate({
      title: newDeliverable.title || deliverableTypeConfig[newDeliverable.type].label,
      type: newDeliverable.type,
      due_date: newDeliverable.due_date || undefined,
      owner_id: newDeliverable.owner_id || undefined,
      description: newDeliverable.description || undefined,
    });
  };

  // Handle add note
  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }
    toast.success('Note added');
    setShowAddNoteDialog(false);
    setNewNote('');
  };

  // Toggle creator selection
  const toggleCreatorSelection = (creatorId: string) => {
    setSelectedCreators(prev =>
      prev.includes(creatorId)
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-500 dark:text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Campaign Not Found</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              The campaign you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Link href="/agency/campaigns">
              <Button>View All Campaigns</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[campaign.status] || statusConfig.scheduled;
  const progressPercent = campaign.deliverables_total > 0
    ? Math.round((campaign.deliverables_completed / campaign.deliverables_total) * 100)
    : 0;
  const spent = campaign.deliverables_total > 0
    ? (campaign.deliverables_completed / campaign.deliverables_total) * campaign.value
    : 0;

  // Sort deliverables by order
  const sortedDeliverables = [...(campaign.deliverables || [])].sort((a, b) => a.order - b.order);

  // Mock activity log
  const activityLog: ActivityLogEntry[] = [
    {
      id: '1',
      type: 'status_change',
      message: `Campaign status changed to ${statusInfo.label}`,
      user: 'System',
      timestamp: campaign.updated_at || campaign.created_at,
    },
    {
      id: '2',
      type: 'note',
      message: 'Initial campaign setup completed',
      user: campaign.owner_name || 'Agency',
      timestamp: campaign.created_at,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {campaign.brand_name}
              </h1>
              <Badge className={cn(statusInfo.bgColor, statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            </div>
            {campaign.campaign_type && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {campaign.campaign_type}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddDeliverableDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Deliverable
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAssignCreatorDialog(true)}>
                <Users className="mr-2 h-4 w-4" />
                Assign Creator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAddNoteDialog(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
                <p className="text-xl font-bold">{formatCurrency(campaign.value)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Spent</p>
                <p className="text-xl font-bold">{formatCurrency(spent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Posting Date</p>
                <p className="text-xl font-bold">{formatDate(campaign.posting_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <FileCheck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
                <p className="text-xl font-bold">
                  {campaign.deliverables_completed}/{campaign.deliverables_total}
                  <span className="text-sm font-normal text-gray-500 ml-1">({progressPercent}%)</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Campaign Progress
            </span>
            <span className="text-sm text-gray-500">{progressPercent}% complete</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {campaign.campaign_type && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">{campaign.campaign_type}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Recent Deliverables
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('deliverables')}>
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  {sortedDeliverables.length === 0 ? (
                    <div className="text-center py-8">
                      <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No deliverables yet</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddDeliverableDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Deliverable
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedDeliverables.slice(0, 4).map(deliverable => {
                        const typeInfo = deliverableTypeConfig[deliverable.type] || { label: deliverable.type, icon: FileCheck, color: 'text-gray-600' };
                        const delStatusInfo = deliverableStatusConfig[deliverable.status] || deliverableStatusConfig.pending;
                        const Icon = typeInfo.icon;

                        return (
                          <div key={deliverable.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", deliverable.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800')}>
                              {deliverable.status === 'completed' ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Icon className={cn('h-5 w-5', typeInfo.color)} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100">{typeInfo.label}</p>
                              {deliverable.due_date && <p className="text-xs text-gray-500">Due: {formatDate(deliverable.due_date)}</p>}
                            </div>
                            <Badge className={cn(delStatusInfo.bgColor, delStatusInfo.color, 'text-xs')}>{delStatusInfo.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Creators
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAssignCreatorDialog(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {campaign.creators && campaign.creators.length > 0 ? (
                    <div className="space-y-3">
                      {campaign.creators.map((creator) => (
                        <div key={creator.id} className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={creator.avatar_url || undefined} />
                            <AvatarFallback className="bg-green-100 text-green-700">{creator.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{creator.name}</p>
                            <p className="text-xs text-gray-500">@{creator.handle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No creators assigned</p>
                  )}
                </CardContent>
              </Card>

              {campaign.owner_name && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      Campaign Owner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{campaign.owner_name}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setShowAddDeliverableDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Deliverable
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setShowAddNoteDialog(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    View Contract
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Deliverables Timeline</h3>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowAddDeliverableDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deliverable
            </Button>
          </div>

          {sortedDeliverables.length === 0 ? (
            <Card className="p-12 text-center">
              <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No deliverables yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Start tracking campaign progress by adding deliverables</p>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowAddDeliverableDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Deliverable
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedDeliverables.map((deliverable, index) => {
                const typeInfo = deliverableTypeConfig[deliverable.type] || { label: deliverable.type, icon: FileCheck, color: 'text-gray-600' };
                const delStatusInfo = deliverableStatusConfig[deliverable.status] || deliverableStatusConfig.pending;
                const Icon = typeInfo.icon;
                const isCompleted = deliverable.status === 'completed';
                const isOverdue = deliverable.status === 'overdue';

                return (
                  <Card key={deliverable.id} className={cn(isCompleted && 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10', isOverdue && 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10')}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0", isCompleted ? 'bg-green-100 dark:bg-green-900/30' : isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800')}>
                            {isCompleted ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Icon className={cn('h-5 w-5', typeInfo.color)} />}
                          </div>
                          {index < sortedDeliverables.length - 1 && <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700 mt-2" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">{typeInfo.label}</h4>
                              {deliverable.title && deliverable.title !== typeInfo.label && <p className="text-sm text-gray-600 dark:text-gray-400">{deliverable.title}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn(delStatusInfo.bgColor, delStatusInfo.color, 'text-xs')}>{delStatusInfo.label}</Badge>
                              {!isCompleted && (
                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700" onClick={() => completeDeliverableMutation.mutate({ deliverableId: deliverable.id })} disabled={completeDeliverableMutation.isPending}>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {deliverable.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due: {formatDate(deliverable.due_date)}</span>}
                            {deliverable.owner_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{deliverable.owner_name}</span>}
                            {deliverable.completed_at && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Completed: {formatDate(deliverable.completed_at)}</span>}
                          </div>

                          {deliverable.notes && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">{deliverable.notes}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assigned Creators</h3>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowAssignCreatorDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Creator
            </Button>
          </div>

          {campaign.creators && campaign.creators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaign.creators.map(creator => (
                <Card key={creator.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={creator.avatar_url || undefined} />
                        <AvatarFallback className="bg-green-100 text-green-700">{creator.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{creator.name}</p>
                        <p className="text-sm text-gray-500">@{creator.handle}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><User className="mr-2 h-4 w-4" />View Profile</DropdownMenuItem>
                          <DropdownMenuItem><MessageSquare className="mr-2 h-4 w-4" />Send Message</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No creators assigned</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Assign creators to this campaign to track their deliverables</p>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowAssignCreatorDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Creator
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Activity Log</h3>
            <Button variant="outline" onClick={() => setShowAddNoteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", entry.type === 'note' && 'bg-blue-100 dark:bg-blue-900/30', entry.type === 'status_change' && 'bg-purple-100 dark:bg-purple-900/30', entry.type === 'deliverable' && 'bg-green-100 dark:bg-green-900/30', entry.type === 'creator_added' && 'bg-orange-100 dark:bg-orange-900/30')}>
                      {entry.type === 'note' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                      {entry.type === 'status_change' && <AlertTriangle className="h-4 w-4 text-purple-600" />}
                      {entry.type === 'deliverable' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {entry.type === 'creator_added' && <Users className="h-4 w-4 text-orange-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{entry.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{entry.user} • {formatDateTime(entry.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Deliverable Dialog */}
      <Dialog open={showAddDeliverableDialog} onOpenChange={setShowAddDeliverableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deliverable</DialogTitle>
            <DialogDescription>Add a new deliverable to track for this campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deliverable-type">Type *</Label>
              <Select value={newDeliverable.type} onValueChange={(value) => setNewDeliverable(d => ({ ...d, type: value as DeliverableType }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(deliverableTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliverable-title">Title</Label>
              <Input id="deliverable-title" placeholder="e.g., Product unboxing video" value={newDeliverable.title} onChange={(e) => setNewDeliverable(d => ({ ...d, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliverable-due">Due Date</Label>
                <Input id="deliverable-due" type="date" value={newDeliverable.due_date} onChange={(e) => setNewDeliverable(d => ({ ...d, due_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverable-owner">Assigned To</Label>
                <Select value={newDeliverable.owner_id || "none"} onValueChange={(value) => setNewDeliverable(d => ({ ...d, owner_id: value === "none" ? "" : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select creator" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {campaign.creators?.map(creator => (
                      <SelectItem key={creator.id} value={creator.id}>{creator.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliverable-desc">Description</Label>
              <Textarea id="deliverable-desc" placeholder="Additional details..." value={newDeliverable.description} onChange={(e) => setNewDeliverable(d => ({ ...d, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeliverableDialog(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleAddDeliverable} disabled={createDeliverableMutation.isPending}>
              {createDeliverableMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add Deliverable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note to the campaign activity log</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea placeholder="Enter your note..." rows={4} value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleAddNote}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Creator Dialog */}
      <Dialog open={showAssignCreatorDialog} onOpenChange={setShowAssignCreatorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Creators</DialogTitle>
            <DialogDescription>Select creators to assign to this campaign</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            {allCreators.length > 0 ? (
              <div className="space-y-2">
                {allCreators.map(creator => {
                  const isAssigned = campaign.creators?.some(c => c.id === creator.id);
                  return (
                    <label key={creator.id} className={cn("flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors", isAssigned ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent")}>
                      <Checkbox checked={selectedCreators.includes(creator.id) || isAssigned} onCheckedChange={() => toggleCreatorSelection(creator.id)} disabled={isAssigned} />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={creator.avatar_url || undefined} />
                        <AvatarFallback className="bg-green-100 text-green-700">{creator.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{creator.name}</p>
                        <p className="text-sm text-gray-500">@{creator.handle || creator.name.toLowerCase().replace(' ', '')}</p>
                      </div>
                      {isAssigned && <Badge variant="secondary" className="text-xs">Assigned</Badge>}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No creators available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignCreatorDialog(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => { toast.success('Creators assigned'); setShowAssignCreatorDialog(false); setSelectedCreators([]); }} disabled={selectedCreators.length === 0}>
              Assign Selected ({selectedCreators.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
