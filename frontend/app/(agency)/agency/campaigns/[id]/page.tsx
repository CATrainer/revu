'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  campaignApi,
  type Campaign,
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
} from 'lucide-react';

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

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { formatAmount, currency: userCurrency } = useCurrency();

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignApi.getCampaign(campaignId),
    enabled: !!campaignId,
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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

  // Sort deliverables by order
  const sortedDeliverables = [...(campaign.deliverables || [])].sort((a, b) => a.order - b.order);

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
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Value</p>
                <p className="text-xl font-bold">{formatCurrency(campaign.value)}</p>
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
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Creators</p>
                <p className="text-xl font-bold">{campaign.creators?.length || 0}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deliverables Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Deliverables Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedDeliverables.length === 0 ? (
                <div className="text-center py-8">
                  <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No deliverables yet</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Add Deliverable
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedDeliverables.map((deliverable, index) => {
                    const typeInfo = deliverableTypeConfig[deliverable.type] || {
                      label: deliverable.type,
                      icon: FileCheck,
                      color: 'text-gray-600',
                    };
                    const statusInfo = deliverableStatusConfig[deliverable.status] || deliverableStatusConfig.pending;
                    const Icon = typeInfo.icon;
                    const isCompleted = deliverable.status === 'completed';
                    const isOverdue = deliverable.status === 'overdue';

                    return (
                      <div
                        key={deliverable.id}
                        className={cn(
                          'relative flex gap-4 p-4 rounded-lg border transition-colors',
                          isCompleted
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                            : isOverdue
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        {/* Timeline connector */}
                        {index < sortedDeliverables.length - 1 && (
                          <div className="absolute left-[30px] top-[60px] bottom-[-20px] w-0.5 bg-gray-200 dark:bg-gray-700" />
                        )}

                        {/* Icon */}
                        <div
                          className={cn(
                            'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center z-10',
                            isCompleted
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : isOverdue
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-gray-100 dark:bg-gray-700'
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Icon className={cn('h-5 w-5', typeInfo.color)} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {typeInfo.label}
                            </h4>
                            <Badge className={cn(statusInfo.bgColor, statusInfo.color, 'text-xs')}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {deliverable.title && deliverable.title !== typeInfo.label && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {deliverable.title}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {deliverable.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {formatDate(deliverable.due_date)}
                              </span>
                            )}
                            {deliverable.owner_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {deliverable.owner_name}
                              </span>
                            )}
                            {deliverable.completed_at && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed: {formatDate(deliverable.completed_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Creators */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                Creators
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.creators && campaign.creators.length > 0 ? (
                <div className="space-y-3">
                  {campaign.creators.map((creator) => (
                    <div key={creator.id} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
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

          {/* Campaign Owner */}
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

          {/* Tags */}
          {campaign.tags && campaign.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {campaign.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                View Contract
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
