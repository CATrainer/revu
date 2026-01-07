'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Invitation {
  id: string;
  agency_id: string;
  agency_name: string;
  agency_logo_url: string | null;
  invited_at: string;
  expires_at: string;
}

interface JoinRequest {
  id: string;
  agency_id: string;
  agency_name: string;
  agency_logo_url: string | null;
  requested_at: string;
  status: string;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invitationsRes, requestsRes] = await Promise.all([
        api.get('/creator/agency/invitations'),
        api.get('/creator/agency/join-requests'),
      ]);
      setInvitations(invitationsRes.data);
      setJoinRequests(requestsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setActionLoading(invitationId);
      await api.post(`/creator/agency/invitations/${invitationId}/accept`);
      // Reload to reflect changes
      window.location.href = '/dashboard/opportunities';
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to accept invitation';
      alert(message);
      setActionLoading(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setActionLoading(invitationId);
      await api.post(`/creator/agency/invitations/${invitationId}/decline`);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to decline invitation';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      await api.delete(`/creator/agency/join-requests/${requestId}`);
      setJoinRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to cancel request';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="dashboard-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
          <p className="text-secondary-dark mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  const hasContent = invitations.length > 0 || joinRequests.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/opportunities"
          className="inline-flex items-center text-sm text-secondary-dark hover:text-primary-dark mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Opportunities
        </Link>
        <h1 className="text-2xl font-bold text-primary-dark">Agency Invitations</h1>
        <p className="text-secondary-dark mt-1">
          Manage invitations and join requests from agencies
        </p>
      </div>

      {!hasContent ? (
        <div className="dashboard-card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-dark mb-2">
            No invitations or pending requests
          </h3>
          <p className="text-secondary-dark max-w-md mx-auto mb-6">
            You don&apos;t have any pending agency invitations or join requests. Search for your agency to request to join.
          </p>
          <Link
            href="/dashboard/find-agency"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
          >
            Find My Agency
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Invitations Section */}
          {invitations.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-primary-dark mb-4">
                Pending Invitations
              </h2>
              <div className="space-y-4">
                {invitations.map((invitation) => {
                  const expired = isExpired(invitation.expires_at);
                  const isLoading = actionLoading === invitation.id;

                  return (
                    <div
                      key={invitation.id}
                      className={`dashboard-card p-6 ${expired ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {invitation.agency_logo_url ? (
                            <img
                              src={invitation.agency_logo_url}
                              alt={invitation.agency_name}
                              className="w-14 h-14 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                              <Building2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-primary-dark">
                              {invitation.agency_name}
                            </h3>
                            <p className="text-sm text-secondary-dark mt-1">
                              Invited on {formatDate(invitation.invited_at)}
                            </p>
                            {expired ? (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                Expired on {formatDate(invitation.expires_at)}
                              </p>
                            ) : (
                              <p className="text-sm text-secondary-dark mt-1 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Expires {formatDate(invitation.expires_at)}
                              </p>
                            )}
                          </div>
                        </div>

                        {!expired && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeclineInvitation(invitation.id)}
                              disabled={isLoading}
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-secondary-dark hover:text-primary-dark rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleAcceptInvitation(invitation.id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              Accept
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Join Requests Section */}
          {joinRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-primary-dark mb-4">
                Your Join Requests
              </h2>
              <div className="space-y-4">
                {joinRequests.map((request) => {
                  const isLoading = actionLoading === request.id;

                  return (
                    <div key={request.id} className="dashboard-card p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {request.agency_logo_url ? (
                            <img
                              src={request.agency_logo_url}
                              alt={request.agency_name}
                              className="w-14 h-14 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                              <Building2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-primary-dark">
                              {request.agency_name}
                            </h3>
                            <p className="text-sm text-secondary-dark mt-1">
                              Requested on {formatDate(request.requested_at)}
                            </p>
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 mt-2">
                              <Clock className="h-3 w-3" />
                              Pending Review
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Cancel Request
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
