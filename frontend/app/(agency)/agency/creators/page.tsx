'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { agencyApi } from '@/lib/agency-api';
import {
  creatorDirectoryApi,
  type CreatorProfile,
  type CreatorGroup,
} from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  MoreVertical,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  BarChart3,
  FolderKanban,
  Download,
  Eye,
  Edit,
  Send,
  DollarSign,
  TrendingUp,
  Youtube,
  Instagram,
  Plus,
  Sparkles,
  X,
  Check,
  Info,
  UserCheck,
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

// Types for Repruv connection status
type ConnectionStatus = 'external' | 'pending' | 'connected' | 'declined';

interface EnhancedCreator extends CreatorProfile {
  uses_repruv: boolean;
  connection_status: ConnectionStatus;
  last_sync_time?: string;
}

// Platform icons
const platformIcons: Record<string, React.ElementType> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Sparkles,
  twitter: Sparkles,
  twitch: Sparkles,
};

// Connection status config with descriptions
const connectionStatusConfig: Record<ConnectionStatus, { label: string; color: string; description: string }> = {
  external: {
    label: 'External',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    description: 'Creator not using Repruv. Basic info only.',
  },
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    description: 'Awaiting creator consent to connect accounts.',
  },
  connected: {
    label: 'Connected',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    description: 'Creator using Repruv and sharing data. Full metrics available.',
  },
  declined: {
    label: 'Declined',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    description: 'Creator declined the connection request.',
  },
};

export default function AgencyCreatorsPage() {
  const queryClient = useQueryClient();
  const { formatAmount, currency: userCurrency } = useCurrency();

  // UI State
  const [activeTab, setActiveTab] = useState('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  
  // Dialog states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [showCreatorDetail, setShowCreatorDetail] = useState<EnhancedCreator | null>(null);
  const [editingGroup, setEditingGroup] = useState<CreatorGroup | null>(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({ email: '', name: '' });
  const [newGroupForm, setNewGroupForm] = useState({ name: '', description: '', color: 'bg-green-500' });

  // Fetch creators from API
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['agency-creators-directory'],
    queryFn: () => creatorDirectoryApi.getCreators(),
  });

  // Fetch join requests
  const { data: joinRequests = [] } = useQuery({
    queryKey: ['agency-join-requests'],
    queryFn: () => agencyApi.getJoinRequests(),
  });

  // Fetch pending invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ['agency-invitations'],
    queryFn: () => agencyApi.getInvitations('pending'),
  });

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ['agency-creator-groups'],
    queryFn: () => creatorDirectoryApi.getGroups(),
  });

  // Transform creators to include Repruv status
  // In production, this would come from the API based on whether creator has a linked account
  const enhancedCreators: EnhancedCreator[] = useMemo(() => {
    return creators.map(creator => ({
      ...creator,
      uses_repruv: creator.relationship_status === 'active',
      connection_status: (creator.relationship_status === 'active' ? 'connected' :
        creator.relationship_status === 'potential' ? 'external' : 'pending') as ConnectionStatus,
      last_sync_time: creator.last_campaign_date || undefined,
    }));
  }, [creators]);

  // Filter creators based on search and group
  const filteredCreators = useMemo(() => {
    return enhancedCreators.filter(creator => {
      const matchesSearch =
        creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.niches?.some(n => n.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesGroup = groupFilter === 'all' ||
        groups.find(g => g.id === groupFilter)?.creator_ids.includes(creator.id);
      
      return matchesSearch && matchesGroup;
    });
  }, [enhancedCreators, searchQuery, groupFilter, groups]);

  // Mutations
  const inviteCreatorMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      await agencyApi.inviteCreator(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-invitations'] });
      toast.success('Invitation sent successfully');
      setShowInviteDialog(false);
      setInviteForm({ email: '', name: '' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to send invitation');
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => agencyApi.acceptJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['agency-creators-directory'] });
      toast.success('Request accepted');
    },
    onError: () => toast.error('Failed to accept request'),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => agencyApi.rejectJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-join-requests'] });
      toast.success('Request rejected');
    },
    onError: () => toast.error('Failed to reject request'),
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => agencyApi.cancelInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: () => toast.error('Failed to cancel invitation'),
  });

  const removeCreatorMutation = useMutation({
    mutationFn: (creatorId: string) => agencyApi.removeCreator(creatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-creators-directory'] });
      toast.success('Creator removed');
      setShowCreatorDetail(null);
    },
    onError: () => toast.error('Failed to remove creator'),
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: Partial<CreatorGroup>) => creatorDirectoryApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-creator-groups'] });
      toast.success('Group created');
      setShowNewGroupDialog(false);
      setNewGroupForm({ name: '', description: '', color: 'bg-green-500' });
    },
    onError: () => toast.error('Failed to create group'),
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatorGroup> }) =>
      creatorDirectoryApi.updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-creator-groups'] });
      toast.success('Group updated');
      setShowEditGroupDialog(false);
      setEditingGroup(null);
    },
    onError: () => toast.error('Failed to update group'),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => creatorDirectoryApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-creator-groups'] });
      toast.success('Group deleted');
    },
    onError: () => toast.error('Failed to delete group'),
  });

  // Format helpers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return formatAmount(amount, userCurrency, { decimals: 0 });
  };

  // Export CSV functionality
  const handleExport = () => {
    const headers = ['Name', 'Email', 'Handle', 'Platforms', 'Followers', 'Engagement Rate', 'Campaigns', 'Revenue', 'Connection Status'];
    const rows = filteredCreators.map(creator => [
      creator.name,
      creator.email || '',
      creator.handle,
      creator.platforms.map(p => p.platform).join('; '),
      creator.platforms.reduce((sum, p) => sum + p.followers, 0).toString(),
      `${creator.avg_engagement_rate}%`,
      creator.total_campaigns.toString(),
      creator.total_revenue.toString(),
      creator.connection_status,
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creators-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Creators exported to CSV');
  };

  // Loading state
  if (creatorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Creators</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Manage your creator roster and relationships
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4" />
              Invite Creator
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="directory" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Directory</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
              {(joinRequests.length + invitations.length) > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {joinRequests.length + invitations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Directory Tab */}
          <TabsContent value="directory" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search creators, niches..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Creator Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Creator</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                    <TableHead className="text-right">Eng. Rate</TableHead>
                    <TableHead className="text-right">Campaigns</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreators.map(creator => (
                    <TableRow 
                      key={creator.id} 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" 
                      onClick={() => setShowCreatorDetail(creator)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={creator.avatar_url || undefined} />
                              <AvatarFallback className="bg-green-100 text-green-700">
                                {creator.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            {/* Repruv Connected Badge */}
                            {creator.uses_repruv && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">Connected via Repruv</p>
                                  {creator.last_sync_time && (
                                    <p className="text-xs text-gray-400">Last synced: {new Date(creator.last_sync_time).toLocaleDateString()}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{creator.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">@{creator.handle}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {creator.platforms.slice(0, 3).map(platform => {
                            const Icon = platformIcons[platform.platform] || Sparkles;
                            return (
                              <Tooltip key={platform.platform}>
                                <TooltipTrigger asChild>
                                  <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="capitalize">{platform.platform}: {formatNumber(platform.followers)} followers</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(creator.platforms.reduce((sum, p) => sum + p.followers, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-medium',
                          creator.avg_engagement_rate >= 5 ? 'text-green-600' :
                          creator.avg_engagement_rate >= 2 ? 'text-amber-600' : 'text-gray-600'
                        )}>
                          {creator.avg_engagement_rate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{creator.total_campaigns}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(creator.total_revenue)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowCreatorDetail(creator); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Send className="mr-2 h-4 w-4" />
                              Send Opportunity
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (confirm('Remove this creator?')) removeCreatorMutation.mutate(creator.id); 
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredCreators.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No creators found</h3>
                  <p className="text-gray-500 mb-4">Try adjusting your filters or invite new creators</p>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Creator
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            {/* Summary Stats with Tooltips */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                          <Users className="h-5 w-5 text-sky-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total Creators</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{enhancedCreators.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total number of creators in your roster</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connected</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {enhancedCreators.filter(c => c.uses_repruv).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Creators using Repruv with real-time data sync enabled</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Engagement</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {enhancedCreators.length > 0 
                              ? (enhancedCreators.reduce((sum, c) => sum + c.avg_engagement_rate, 0) / enhancedCreators.length).toFixed(1) 
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Average engagement rate calculated as (likes + comments) / reach × 100</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(enhancedCreators.reduce((sum, c) => sum + c.total_revenue, 0))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total revenue generated through all creator campaigns</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Performance Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Creator Performance</CardTitle>
                    <CardDescription>Performance metrics for connected creators with real-time data</CardDescription>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Performance data is only available for creators connected via Repruv. External creators will not appear in this table.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 ml-auto">
                            Campaigns <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>Total completed campaigns with your agency</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 ml-auto">
                            Engagement <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>Average engagement rate: (likes + comments) / views × 100</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 ml-auto">
                            On-Time <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>Percentage of deliverables completed by the due date</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enhancedCreators.filter(c => c.uses_repruv).map(creator => (
                      <TableRow key={creator.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={creator.avatar_url || undefined} />
                              <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                                {creator.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{creator.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{creator.total_campaigns}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-medium',
                            creator.avg_engagement_rate >= 5 ? 'text-green-600' :
                            creator.avg_engagement_rate >= 2 ? 'text-amber-600' : 'text-gray-600'
                          )}>
                            {creator.avg_engagement_rate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-medium',
                            creator.on_time_delivery_rate >= 95 ? 'text-green-600' :
                            creator.on_time_delivery_rate >= 80 ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {creator.on_time_delivery_rate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(creator.total_revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {enhancedCreators.filter(c => c.uses_repruv).length === 0 && (
                  <div className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No performance data</h3>
                    <p className="text-gray-500">Performance metrics are available for connected creators only</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-4">
            <div className="flex justify-end">
              <Button className="bg-green-600 hover:bg-green-700 gap-2" onClick={() => setShowNewGroupDialog(true)}>
                <Plus className="h-4 w-4" />
                New Group
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map(group => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white", group.color)}>
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{group.description}</p>
                        )}
                        <div className="mt-3">
                          <Badge variant="secondary">{group.creator_count} creators</Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setActiveTab('directory'); setGroupFilter(group.id); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Members
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingGroup(group); setShowEditGroupDialog(true); }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Group
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => { if (confirm('Delete this group? Creators will not be removed.')) deleteGroupMutation.mutate(group.id); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {groups.length === 0 && (
              <Card className="p-12">
                <div className="text-center">
                  <FolderKanban className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No groups yet</h3>
                  <p className="text-gray-500 mb-4">Create groups to organize your creators by niche, platform, or campaign type</p>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowNewGroupDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            {/* Join Requests */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Join Requests ({joinRequests.length})
              </h3>
              {joinRequests.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending join requests from creators</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-amber-100 text-amber-700">
                                {(request.user_full_name || request.user_email).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {request.user_full_name || 'Unnamed Creator'}
                              </p>
                              <p className="text-sm text-gray-500">{request.user_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                              onClick={() => rejectRequestMutation.mutate(request.id)} 
                              disabled={rejectRequestMutation.isPending}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Decline
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700" 
                              onClick={() => acceptRequestMutation.mutate(request.id)} 
                              disabled={acceptRequestMutation.isPending}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Invitations */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Sent Invitations ({invitations.length})
              </h3>
              {invitations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending invitations</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <Card key={invitation.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gray-200 text-gray-500">
                                {invitation.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{invitation.email}</p>
                              <p className="text-sm text-gray-500">Sent {new Date(invitation.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {new Date(invitation.expires_at).toLocaleDateString()}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                              onClick={() => cancelInvitationMutation.mutate(invitation.id)} 
                              disabled={cancelInvitationMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Invite Creator Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Creator</DialogTitle>
              <DialogDescription>
                Send an invitation to a creator to join your agency. If they already use Repruv, they&apos;ll receive a connection request. Otherwise, they&apos;ll be added as an external creator.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Creator Name</Label>
                <Input
                  id="invite-name"
                  placeholder="John Smith"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))}
                />
                <p className="text-xs text-gray-500">Optional - helps you identify the creator</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="creator@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => inviteCreatorMutation.mutate({ email: inviteForm.email })}
                disabled={!inviteForm.email || inviteCreatorMutation.isPending}
              >
                {inviteCreatorMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Group Dialog */}
        <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>Organize your creators into groups for easier management and filtering</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name *</Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Tech Creators, Gaming, Beauty"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">Description</Label>
                <Textarea
                  id="group-description"
                  placeholder="Describe what this group is for..."
                  rows={2}
                  value={newGroupForm.description}
                  onChange={(e) => setNewGroupForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'].map(color => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all",
                        color,
                        newGroupForm.color === color && "ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-100"
                      )}
                      onClick={() => setNewGroupForm(f => ({ ...f, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => createGroupMutation.mutate({ 
                  name: newGroupForm.name, 
                  description: newGroupForm.description || undefined, 
                  color: newGroupForm.color 
                })}
                disabled={!newGroupForm.name || createGroupMutation.isPending}
              >
                {createGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog open={showEditGroupDialog} onOpenChange={setShowEditGroupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
            </DialogHeader>
            {editingGroup && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-group-name">Group Name *</Label>
                  <Input
                    id="edit-group-name"
                    value={editingGroup.name}
                    onChange={(e) => setEditingGroup(g => g ? { ...g, name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-group-description">Description</Label>
                  <Textarea
                    id="edit-group-description"
                    rows={2}
                    value={editingGroup.description || ''}
                    onChange={(e) => setEditingGroup(g => g ? { ...g, description: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "h-8 w-8 rounded-lg transition-all",
                          color,
                          editingGroup.color === color && "ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-100"
                        )}
                        onClick={() => setEditingGroup(g => g ? { ...g, color } : null)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowEditGroupDialog(false); setEditingGroup(null); }}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => editingGroup && updateGroupMutation.mutate({ 
                  id: editingGroup.id, 
                  data: { 
                    name: editingGroup.name, 
                    description: editingGroup.description || undefined, 
                    color: editingGroup.color 
                  } 
                })}
                disabled={!editingGroup?.name || updateGroupMutation.isPending}
              >
                {updateGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Creator Detail Slide-over */}
        {showCreatorDetail && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreatorDetail(null)} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl overflow-y-auto animate-in slide-in-from-right">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold">Creator Profile</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowCreatorDetail(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={showCreatorDetail.avatar_url || undefined} />
                      <AvatarFallback className="bg-green-100 text-green-700 text-xl">
                        {showCreatorDetail.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {showCreatorDetail.uses_repruv && (
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{showCreatorDetail.name}</h3>
                    <p className="text-gray-500">@{showCreatorDetail.handle}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className={connectionStatusConfig[showCreatorDetail.connection_status].color}>
                            {connectionStatusConfig[showCreatorDetail.connection_status].label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {connectionStatusConfig[showCreatorDetail.connection_status].description}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500">Total Followers</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatNumber(showCreatorDetail.platforms.reduce((sum, p) => sum + p.followers, 0))}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500">Engagement Rate</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{showCreatorDetail.avg_engagement_rate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500">Campaigns</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{showCreatorDetail.total_campaigns}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(showCreatorDetail.total_revenue)}</p>
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Platforms</h4>
                  <div className="space-y-3">
                    {showCreatorDetail.platforms.map(platform => {
                      const Icon = platformIcons[platform.platform] || Sparkles;
                      return (
                        <div key={platform.platform} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{platform.handle}</p>
                              <p className="text-xs text-gray-500 capitalize">{platform.platform}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{formatNumber(platform.followers)}</p>
                            {platform.avg_engagement_rate && (
                              <p className="text-xs text-gray-500">{platform.avg_engagement_rate}% eng.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Niches */}
                {showCreatorDetail.niches && showCreatorDetail.niches.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Niches</h4>
                    <div className="flex flex-wrap gap-2">
                      {showCreatorDetail.niches.map(niche => (
                        <Badge key={niche} variant="secondary">{niche}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Standard Rate */}
                {showCreatorDetail.standard_rate && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">Standard Rate</p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                      {formatCurrency(showCreatorDetail.standard_rate)}
                    </p>
                  </div>
                )}

                {/* Contact Info */}
                {showCreatorDetail.email && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Contact</h4>
                    <p className="text-gray-900 dark:text-gray-100">{showCreatorDetail.email}</p>
                    {showCreatorDetail.phone && (
                      <p className="text-gray-600 dark:text-gray-400">{showCreatorDetail.phone}</p>
                    )}
                  </div>
                )}

                {/* Notes */}
                {showCreatorDetail.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{showCreatorDetail.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700">
                    <Send className="h-4 w-4 mr-2" />
                    Send Opportunity
                  </Button>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
