'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  ChevronRight,
  Briefcase,
  Search,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Agency {
  agency_id: string;
  agency_name: string;
  agency_slug: string;
  agency_logo_url: string | null;
  role: string;
  joined_at: string | null;
}

interface Opportunity {
  id: string;
  agency_name: string;
  title: string;
  brand_name: string;
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  deadline: string | null;
  sent_at: string | null;
}

interface OpportunityCounts {
  pending: number;
  accepted: number;
  declined: number;
  completed: number;
  total: number;
}

const statusConfig = {
  sent: { label: 'New', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Eye },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500', icon: XCircle },
};

export default function OpportunitiesPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [counts, setCounts] = useState<OpportunityCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadAgencyStatus();
  }, []);

  useEffect(() => {
    if (agency) {
      loadOpportunities();
      loadCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agency, activeTab]);

  const loadAgencyStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/agency/current');
      setAgency(response.data);
    } catch (error) {
      console.error('Failed to load agency status:', error);
      setAgency(null);
    } finally {
      setLoading(false);
    }
  };

  const loadOpportunities = async () => {
    try {
      const endpoint = activeTab === 'pending'
        ? '/creator/opportunities/pending'
        : '/creator/opportunities/';
      const response = await api.get(endpoint);
      setOpportunities(response.data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    }
  };

  const loadCounts = async () => {
    try {
      const response = await api.get('/creator/opportunities/count');
      setCounts(response.data);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="dashboard-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
          <p className="text-secondary-dark mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Not connected to agency state
  if (!agency) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary-dark">Opportunities</h1>
          <p className="text-secondary-dark mt-1">
            Brand partnership opportunities from your agency
          </p>
        </div>

        <div className="dashboard-card p-12 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          
          <h2 className="text-xl font-semibold text-primary-dark mb-3">
            Connect with an Agency
          </h2>
          
          <p className="text-secondary-dark mb-6 max-w-sm mx-auto">
            Opportunities are sent by talent agencies to their creators. Connect with your agency to receive brand partnership opportunities.
          </p>

          <Link
            href="/dashboard/find-agency"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Search className="h-5 w-5" />
            Find My Agency
          </Link>

          <p className="text-sm text-secondary-dark mt-6">
            Already have an invitation?{' '}
            <Link href="/dashboard/invitations" className="text-green-600 hover:text-green-700 font-medium">
              Check your invitations
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Connected to agency - show opportunities
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header with Agency Info */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-secondary-dark mb-2">
          <Building2 className="h-4 w-4" />
          <span>{agency.agency_name}</span>
        </div>
        <h1 className="text-2xl font-bold text-primary-dark">Opportunities</h1>
        <p className="text-secondary-dark mt-1">
          Brand partnership opportunities from your agency
        </p>
      </div>

      {/* Stats Cards */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="dashboard-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-dark">{counts.pending}</p>
                <p className="text-sm text-secondary-dark">Pending</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-dark">{counts.accepted}</p>
                <p className="text-sm text-secondary-dark">Accepted</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-dark">{counts.completed}</p>
                <p className="text-sm text-secondary-dark">Completed</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-dark">{counts.total}</p>
                <p className="text-sm text-secondary-dark">Total</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-secondary-dark hover:text-primary-dark'
          }`}
        >
          Pending Review
          {counts && counts.pending > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">{counts.pending}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-secondary-dark hover:text-primary-dark'
          }`}
        >
          All Opportunities
        </button>
      </div>

      {/* Opportunities List */}
      {opportunities.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-dark mb-2">
            {activeTab === 'pending' ? 'No pending opportunities' : 'No opportunities yet'}
          </h3>
          <p className="text-secondary-dark max-w-md mx-auto">
            {activeTab === 'pending'
              ? "You're all caught up! Check back later for new opportunities from your agency."
              : "Your agency hasn't sent you any opportunities yet. They'll appear here when they do."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => {
            const config = statusConfig[opp.status];
            const StatusIcon = config.icon;

            return (
              <Link
                key={opp.id}
                href={`/dashboard/opportunities/${opp.id}`}
                className="dashboard-card p-6 block hover:border-green-200 dark:hover:border-green-800 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-primary-dark group-hover:text-green-600 transition-colors mb-1">
                      {opp.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-secondary-dark">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {opp.brand_name}
                      </span>
                      {opp.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {formatDate(opp.deadline)}
                        </span>
                      )}
                      {opp.sent_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Received: {formatDate(opp.sent_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
