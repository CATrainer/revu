'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { creatorAgencyApi, PendingInvitation } from '@/lib/agency-api';

export function AgencyInvitationsBanner() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await creatorAgencyApi.getInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      setActionLoading(invitationId);
      await creatorAgencyApi.acceptInvitation(invitationId);
      // Reload the page to show updated agency status
      window.location.reload();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      alert('Failed to accept invitation. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      setActionLoading(invitationId);
      await creatorAgencyApi.declineInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      alert('Failed to decline invitation. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading || invitations.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl border border-holo-teal/30 p-6 shadow-glow-teal backdrop-blur-md">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-holo-teal/20 to-holo-teal-dark/20 border border-holo-teal/30">
            <Building2 className="h-5 w-5 text-holo-teal" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-holo-teal">Agency Invitations</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-holo-teal/20 text-holo-teal">
                {invitations.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              You have pending invitations to join agencies
            </p>
          </div>
        </div>
        <button className="p-2 rounded-lg hover:bg-holo-teal/10 transition-colors">
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-holo-teal" />
          ) : (
            <ChevronDown className="h-5 w-5 text-holo-teal" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-card-border"
            >
              <div className="flex items-center gap-3">
                {invitation.agency_logo_url ? (
                  <img
                    src={invitation.agency_logo_url}
                    alt={invitation.agency_name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{invitation.agency_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDate(invitation.expires_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDecline(invitation.id);
                  }}
                  disabled={actionLoading === invitation.id}
                  className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Decline"
                >
                  {actionLoading === invitation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccept(invitation.id);
                  }}
                  disabled={actionLoading === invitation.id}
                  className="px-3 py-1.5 rounded-lg bg-holo-teal text-white text-sm font-medium hover:bg-holo-teal/90 transition-colors flex items-center gap-1"
                >
                  {actionLoading === invitation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Accept
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
