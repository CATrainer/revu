'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { agencyApi, type AgencyCreator, type AgencyMember, type AgencyInvitation } from '@/lib/agency-api';
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
  Grid3X3,
  BarChart3,
  FolderKanban,
  Filter,
  Download,
  Eye,
  Edit,
  Send,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Youtube,
  Instagram,
  Star,
  Plus,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  X,
} from 'lucide-react';

// Types
type AvailabilityStatus = 'available' | 'busy' | 'limited' | 'unavailable';
type PlatformType = 'youtube' | 'instagram' | 'tiktok' | 'twitter';

interface CreatorProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  last_login_at: string | null;
  platforms: {
    type: PlatformType;
    handle: string;
    followers: number;
    engagement_rate: number;
  }[];
  total_reach: number;
  active_campaigns: number;
  completed_campaigns: number;
  total_earnings: number;
  avg_rating: number;
  availability_status: AvailabilityStatus;
  groups: string[];
  tags: string[];
  rate_card: {
    youtube_integration: number;
    youtube_dedicated: number;
    instagram_post: number;
    instagram_story: number;
  } | null;
}

interface CreatorAvailability {
  id: string;
  name: string;
  avatar: string | null;
  status: AvailabilityStatus;
  current_campaigns: number;
  max_campaigns: number;
  next_available: string | null;
  scheduled_deliverables: {
    date: string;
    campaign: string;
    type: string;
  }[];
  weekly_capacity: {
    day: string;
    available: boolean;
    campaigns: string[];
  }[];
}

interface CreatorGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  creator_count: number;
  created_at: string;
}

interface PerformanceMetric {
  creator_id: string;
  creator_name: string;
  avatar: string | null;
  campaigns_completed: number;
  total_views: number;
  avg_engagement_rate: number;
  revenue_generated: number;
  on_time_delivery_rate: number;
  brand_rating: number;
  trend: 'up' | 'down' | 'stable';
}

// Status config
const availabilityConfig: Record<AvailabilityStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  limited: { label: 'Limited', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  busy: { label: 'Busy', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  unavailable: { label: 'Unavailable', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const platformIcons: Record<PlatformType, React.ElementType> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Sparkles,
  twitter: Sparkles,
};

export default function AgencyCreatorsPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);

  // Data states
  const [creators, setCreators] = useState<AgencyCreator[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<CreatorProfile[]>([]);
  const [joinRequests, setJoinRequests] = useState<AgencyMember[]>([]);
  const [invitations, setInvitations] = useState<AgencyInvitation[]>([]);
  const [availability, setAvailability] = useState<CreatorAvailability[]>([]);
  const [groups, setGroups] = useState<CreatorGroup[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetric[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [creatorsData, requestsData, invitationsData] = await Promise.all([
        agencyApi.getCreators(),
        agencyApi.getJoinRequests(),
        agencyApi.getInvitations('pending'),
      ]);
      setCreators(creatorsData);
      setJoinRequests(requestsData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      await agencyApi.inviteCreator(inviteEmail);
      toast.success('Invitation sent!');
      setInviteEmail('');
      setIsInviteModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await agencyApi.acceptJoinRequest(requestId);
      toast.success('Request accepted!');
      fetchData();
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await agencyApi.rejectJoinRequest(requestId);
      toast.success('Request rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await agencyApi.cancelInvitation(invitationId);
      toast.success('Invitation cancelled');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const handleRemoveCreator = async (creatorId: string) => {
    if (!confirm('Are you sure you want to remove this creator from your agency?')) {
      return;
    }
    try {
      await agencyApi.removeCreator(creatorId);
      toast.success('Creator removed from agency');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove creator');
    }
  };

  // Filter creators
  const filteredProfiles = creatorProfiles.filter(creator => {
    const matchesSearch =
      creator.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || creator.availability_status === statusFilter;
    const matchesGroup = groupFilter === 'all' || creator.groups.includes(groupFilter);
    return matchesSearch && matchesStatus && matchesGroup;
  });

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Creators</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage and track your creator roster
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 gap-2">
                <UserPlus className="h-4 w-4" />
                Invite Creator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a Creator</DialogTitle>
                <DialogDescription>
                  Send an invitation to a creator to join your agency.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Creator&apos;s Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="creator@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail || isInviting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="directory" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Directory</span>
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Availability</span>
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search creators, tags..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="limited">Limited</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Creator Grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map(creator => (
              <Card
                key={creator.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedCreator(creator)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {creator.full_name?.split(' ').map(n => n[0]).join('') || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {creator.full_name || 'Unnamed Creator'}
                        </h3>
                        <Badge className={availabilityConfig[creator.availability_status].color}>
                          {availabilityConfig[creator.availability_status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                        {creator.email}
                      </p>
                      <div className="flex items-center gap-3 text-sm">
                        {creator.platforms.slice(0, 2).map(platform => {
                          const Icon = platformIcons[platform.type];
                          return (
                            <span key={platform.type} className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <Icon className="h-3.5 w-3.5" />
                              {formatNumber(platform.followers)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCreator(creator); }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Send className="mr-2 h-4 w-4" />
                          Send Opportunity
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => { e.stopPropagation(); handleRemoveCreator(creator.id); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Reach</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatNumber(creator.total_reach)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Campaigns</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {creator.completed_campaigns}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {creator.avg_rating}
                      </p>
                    </div>
                  </div>
                  {creator.tags && creator.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {creator.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProfiles.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No creators found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your filters or invite new creators
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Creator Availability Grid</CardTitle>
              <CardDescription>View and manage creator capacity for the week</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Week Header */}
              <div className="grid grid-cols-8 gap-2 mb-4">
                <div className="font-medium text-sm text-gray-500 dark:text-gray-400">Creator</div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="font-medium text-sm text-gray-500 dark:text-gray-400 text-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Creator Rows */}
              <div className="space-y-2">
                {availability.map(creator => (
                  <div key={creator.id} className="grid grid-cols-8 gap-2 items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                          {creator.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {creator.name}
                        </p>
                        <Badge className={cn("text-xs", availabilityConfig[creator.status].color)}>
                          {creator.current_campaigns}/{creator.max_campaigns}
                        </Badge>
                      </div>
                    </div>
                    {creator.weekly_capacity.map((day, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-10 rounded-lg flex items-center justify-center text-xs",
                          day.available
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : day.campaigns.length > 0
                            ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                        )}
                        title={day.campaigns.join(', ') || 'No campaigns'}
                      >
                        {day.available ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : day.campaigns.length > 0 ? (
                          <span>{day.campaigns.length}</span>
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-green-700 dark:text-green-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                    <span className="text-xs text-orange-700 dark:text-orange-400">2</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Has campaigns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <X className="h-3 w-3 text-gray-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Unavailable</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Deliverables */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Deliverables</CardTitle>
              <CardDescription>Upcoming deliverables from all creators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availability.flatMap(creator =>
                  creator.scheduled_deliverables.map((deliverable, idx) => (
                    <div
                      key={`${creator.id}-${idx}`}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                            {creator.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {deliverable.type}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {creator.name} - {deliverable.campaign}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {new Date(deliverable.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Campaigns Done</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {performance.reduce((sum, p) => sum + p.campaigns_completed, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Views</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(performance.reduce((sum, p) => sum + p.total_views, 0))}
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Engagement</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {(performance.reduce((sum, p) => sum + p.avg_engagement_rate, 0) / performance.length).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Revenue Generated</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(performance.reduce((sum, p) => sum + p.revenue_generated, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Creator Performance</CardTitle>
              <CardDescription>Performance metrics for all creators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Creator</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Campaigns</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Views</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Engagement</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">On-Time</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Rating</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map(metric => (
                      <tr key={metric.creator_id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                                {metric.creator_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {metric.creator_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                          {metric.campaigns_completed}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                          {formatNumber(metric.total_views)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                          {metric.avg_engagement_rate}%
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                          {formatCurrency(metric.revenue_generated)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "font-medium",
                            metric.on_time_delivery_rate >= 95 ? "text-green-600" :
                            metric.on_time_delivery_rate >= 85 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {metric.on_time_delivery_rate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-gray-900 dark:text-gray-100">{metric.brand_rating}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {metric.trend === 'up' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600 inline" />
                          ) : metric.trend === 'down' ? (
                            <ArrowDownRight className="h-4 w-4 text-red-600 inline" />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 gap-2">
                  <Plus className="h-4 w-4" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Organize your creators into groups for easier management
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">Group Name</Label>
                    <Input id="group-name" placeholder="e.g., Tech Creators" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-description">Description</Label>
                    <Textarea id="group-description" placeholder="Describe this group..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      {['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'].map(color => (
                        <button
                          key={color}
                          className={cn("h-8 w-8 rounded-lg", color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700">
                    Create Group
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(group => (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white", group.color)}>
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {group.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="secondary">
                          {group.creator_count} creators
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Creators
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Group
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
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
                <CardContent className="py-8">
                  <div className="text-center">
                    <Clock className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No pending requests</p>
                  </div>
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
                            <AvatarFallback className="bg-yellow-100 text-yellow-700">
                              {(request.user_full_name || request.user_email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {request.user_full_name || 'Unnamed'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {request.user_email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptRequest(request.id)}
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

          {/* Pending Invitations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Pending Invitations ({invitations.length})
            </h3>
            {invitations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8">
                  <div className="text-center">
                    <Mail className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No pending invitations</p>
                  </div>
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
                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-500">
                              {invitation.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {invitation.email}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Sent {new Date(invitation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            <Clock className="mr-1 h-3 w-3" />
                            Expires {new Date(invitation.expires_at).toLocaleDateString()}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleCancelInvitation(invitation.id)}
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

      {/* Creator Detail Slide-over */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedCreator(null)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Creator Profile
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCreator(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedCreator.avatar_url || undefined} />
                  <AvatarFallback className="bg-green-100 text-green-700 text-xl">
                    {selectedCreator.full_name?.split(' ').map(n => n[0]).join('') || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {selectedCreator.full_name || 'Unnamed Creator'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">{selectedCreator.email}</p>
                  <Badge className={cn("mt-2", availabilityConfig[selectedCreator.availability_status].color)}>
                    {availabilityConfig[selectedCreator.availability_status].label}
                  </Badge>
                </div>
              </div>

              {selectedCreator.bio && (
                <p className="text-gray-600 dark:text-gray-300">{selectedCreator.bio}</p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Reach</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatNumber(selectedCreator.total_reach)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Campaigns</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedCreator.completed_campaigns}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Earnings</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(selectedCreator.total_earnings)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {selectedCreator.avg_rating}
                  </p>
                </div>
              </div>

              {/* Platforms */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Platforms
                </h4>
                <div className="space-y-3">
                  {selectedCreator.platforms.map(platform => {
                    const Icon = platformIcons[platform.type];
                    return (
                      <div key={platform.type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {platform.handle}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {platform.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {formatNumber(platform.followers)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {platform.engagement_rate}% eng.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rate Card */}
              {selectedCreator.rate_card && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Rate Card
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">YT Integration</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(selectedCreator.rate_card.youtube_integration)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">YT Dedicated</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(selectedCreator.rate_card.youtube_dedicated)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">IG Post</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(selectedCreator.rate_card.instagram_post)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">IG Story</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(selectedCreator.rate_card.instagram_story)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Groups & Tags */}
              <div className="space-y-3">
                {selectedCreator.groups.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCreator.groups.map(group => (
                        <Badge key={group} variant="secondary">{group}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCreator.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCreator.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
  );
}
