'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  DollarSign,
  User,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Loader2,
  Trash2,
  Ban,
} from 'lucide-react';
import { opportunityApi, type AgencyOpportunityListItem, type OpportunityStatus } from '@/lib/agency-api';
import { toast } from 'sonner';

const statusConfig: Record<OpportunityStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: Eye },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: XCircle },
};

export default function AgencyOpportunitiesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<AgencyOpportunityListItem[]>([]);

  useEffect(() => {
    fetchOpportunities();
  }, [statusFilter]);

  const fetchOpportunities = async () => {
    setIsLoading(true);
    try {
      const params: { status?: OpportunityStatus } = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter as OpportunityStatus;
      }
      const data = await opportunityApi.list(params);
      setOpportunities(data);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      toast.error('Failed to load opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      await opportunityApi.send(id);
      toast.success('Opportunity sent to creator!');
      fetchOpportunities();
    } catch (error) {
      toast.error('Failed to send opportunity');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this opportunity?')) return;
    try {
      await opportunityApi.cancel(id);
      toast.success('Opportunity cancelled');
      fetchOpportunities();
    } catch (error) {
      toast.error('Failed to cancel opportunity');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    try {
      await opportunityApi.delete(id);
      toast.success('Draft deleted');
      fetchOpportunities();
    } catch (error) {
      toast.error('Failed to delete draft');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await opportunityApi.complete(id);
      toast.success('Opportunity marked as completed!');
      fetchOpportunities();
    } catch (error) {
      toast.error('Failed to complete opportunity');
    }
  };

  const filteredOpportunities = opportunities.filter(
    (opp) =>
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.creator_full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Sponsorship Opportunities
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Create and manage sponsorship deals for your creators
          </p>
        </div>
        <Button asChild className="bg-green-600 hover:bg-green-700">
          <Link href="/agency/opportunities/new">
            <Plus className="mr-2 h-4 w-4" />
            New Opportunity
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search opportunities..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Opportunities List */}
      {filteredOpportunities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No opportunities found' : 'No opportunities yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : "Create your first sponsorship opportunity to send to your creators. They'll be able to accept and start planning the sponsored content."}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <Link href="/agency/opportunities/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Opportunity
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOpportunities.map((opportunity) => {
            const status = statusConfig[opportunity.status];
            const StatusIcon = status.icon;

            return (
              <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {opportunity.title}
                        </h3>
                        <Badge className={status.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {opportunity.brand_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {opportunity.creator_full_name || 'Unknown Creator'}
                        </span>
                        {opportunity.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due {new Date(opportunity.deadline).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-xs">
                          Created {new Date(opportunity.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {opportunity.status === 'draft' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleSend(opportunity.id)}
                        >
                          <Send className="mr-1 h-4 w-4" />
                          Send
                        </Button>
                      )}
                      {opportunity.status === 'accepted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                          onClick={() => handleComplete(opportunity.id)}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/agency/opportunities/${opportunity.id}`}>
                          View
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/agency/opportunities/${opportunity.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {opportunity.status === 'draft' && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/agency/opportunities/${opportunity.id}/edit`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(opportunity.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Draft
                              </DropdownMenuItem>
                            </>
                          )}
                          {['sent', 'viewed', 'accepted'].includes(opportunity.status) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleCancel(opportunity.id)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Cancel Opportunity
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
