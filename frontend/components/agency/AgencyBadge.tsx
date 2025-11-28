'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  ChevronRight,
  LogOut,
  Briefcase,
  Bell,
  X,
  Loader2,
} from 'lucide-react';
import { creatorAgencyApi, creatorOpportunityApi, CreatorAgency, CreatorOpportunityCounts } from '@/lib/agency-api';

export function AgencyBadge() {
  const [agency, setAgency] = useState<CreatorAgency | null>(null);
  const [opportunityCounts, setOpportunityCounts] = useState<CreatorOpportunityCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    loadAgencyData();
  }, []);

  const loadAgencyData = async () => {
    try {
      setLoading(true);
      const [agencyData, counts] = await Promise.all([
        creatorAgencyApi.getMyAgency(),
        creatorOpportunityApi.getCounts().catch(() => null),
      ]);
      setAgency(agencyData);
      setOpportunityCounts(counts);
    } catch (error) {
      console.error('Failed to load agency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAgency = async () => {
    try {
      setLeaving(true);
      await creatorAgencyApi.leaveAgency();
      setAgency(null);
      setShowLeaveModal(false);
    } catch (error) {
      console.error('Failed to leave agency:', error);
      alert('Failed to leave agency. Please try again.');
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl border border-holo-purple/20 p-6 shadow-glass backdrop-blur-md animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!agency) {
    return null;
  }

  const pendingCount = opportunityCounts?.pending || 0;

  return (
    <>
      <div className="glass-panel rounded-2xl border border-holo-purple/20 p-6 shadow-glass backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {agency.agency_logo_url ? (
              <img
                src={agency.agency_logo_url}
                alt={agency.agency_name}
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-holo-purple/20 to-holo-purple-light/20 border border-holo-purple/30 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-holo-purple" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{agency.agency_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-holo-purple/20 text-holo-purple font-medium">
                  Agency
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                You're represented by this agency
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Leave agency"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Opportunities Section */}
        <div className="space-y-2">
          <Link
            href="/dashboard/opportunities"
            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-holo-purple/10 to-transparent hover:from-holo-purple/20 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-holo-purple/20">
                <Briefcase className="h-4 w-4 text-holo-purple" />
              </div>
              <span className="font-medium text-foreground">Sponsorship Opportunities</span>
            </div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-holo-pink/20 text-holo-pink text-xs font-semibold">
                  <Bell className="h-3 w-3" />
                  {pendingCount} pending
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-holo-purple transition-colors" />
            </div>
          </Link>
        </div>
      </div>

      {/* Leave Agency Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Leave Agency</h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to leave <span className="font-semibold text-foreground">{agency.agency_name}</span>?
              You will no longer receive opportunities from them and any pending opportunities will be cancelled.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                disabled={leaving}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveAgency}
                disabled={leaving}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {leaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Leave Agency
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
