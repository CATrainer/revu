'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { agencyApi, type AgencyCreator, type AgencyMember, type AgencyInvitation } from '@/lib/agency-api';
import { toast } from 'sonner';

export default function AgencyCreatorsPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [creators, setCreators] = useState<AgencyCreator[]>([]);
  const [joinRequests, setJoinRequests] = useState<AgencyMember[]>([]);
  const [invitations, setInvitations] = useState<AgencyInvitation[]>([]);

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
      toast.error('Failed to load creators');
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
      fetchData(); // Refresh data
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
      toast.success('Request accepted! Creator added to your agency.');
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

  const filteredCreators = creators.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
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
            Creators
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage creators in your agency
          </p>
        </div>
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Creator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Creator</DialogTitle>
              <DialogDescription>
                Send an invitation to a creator to join your agency. They&apos;ll receive
                an email with a link to accept.
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

      {/* Tabs */}
      <Tabs defaultValue="creators">
        <TabsList>
          <TabsTrigger value="creators">
            Creators ({creators.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Join Requests ({joinRequests.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Pending Invites ({invitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Creators Tab */}
        <TabsContent value="creators" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search creators..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredCreators.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {searchQuery ? 'No creators found' : 'No creators yet'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                    {searchQuery
                      ? 'Try adjusting your search terms'
                      : "Invite creators to join your agency. Once they accept, you'll be able to send them sponsorship opportunities."}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Invite Your First Creator
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCreators.map((creator) => (
                <Card key={creator.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium text-lg">
                          {(creator.full_name || creator.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {creator.full_name || 'Unnamed Creator'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {creator.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-gray-500">
                          Joined {new Date(creator.created_at).toLocaleDateString()}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRemoveCreator(creator.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove from Agency
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Join Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {joinRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No pending requests
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    When creators request to join your agency, they&apos;ll appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {joinRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-medium text-lg">
                          {(request.user_full_name || request.user_email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {request.user_full_name || 'Unnamed'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {request.user_email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
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
        </TabsContent>

        {/* Pending Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          {invitations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Mail className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No pending invitations
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    All your invitations have been responded to.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-medium text-lg">
                          {invitation.email.charAt(0).toUpperCase()}
                        </div>
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
                          className="text-red-600 hover:bg-red-50"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
