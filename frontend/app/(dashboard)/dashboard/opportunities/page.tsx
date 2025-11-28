'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';

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

export default function CreatorOpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [counts, setCounts] = useState<OpportunityCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadOpportunities();
    loadCounts();
  }, [activeTab]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'pending'
        ? '/creator/opportunities/pending'
        : '/creator/opportunities/';
      const data = await api.get(endpoint);
      setOpportunities(data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const data = await api.get('/creator/opportunities/count');
      setCounts(data);
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-secondary-dark hover:text-primary-dark mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">Sponsorship Opportunities</h1>
            <p className="text-secondary-dark mt-1">
              Opportunities from your agency for brand partnerships
            </p>
          </div>
        </div>
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
              ? 'brand-background brand-text'
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
              ? 'brand-background brand-text'
              : 'bg-gray-100 dark:bg-gray-800 text-secondary-dark hover:text-primary-dark'
          }`}
        >
          All Opportunities
        </button>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="dashboard-card p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-secondary-dark mt-4">Loading opportunities...</p>
        </div>
      ) : opportunities.length === 0 ? (
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
                      <span className="text-sm text-secondary-dark flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {opp.agency_name}
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
