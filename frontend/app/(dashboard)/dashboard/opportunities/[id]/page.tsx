'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowLeft,
  ExternalLink,
  FileText,
  ListChecks,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface OpportunityDetail {
  id: string;
  agency_id: string;
  agency_name: string;
  agency_logo_url: string | null;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  description: string;
  requirements: {
    deliverables?: string[];
    content_guidelines?: string;
    talking_points?: string[];
    restrictions?: string[];
  };
  compensation: {
    type?: string;
    amount?: number;
    currency?: string;
    payment_terms?: string;
    product_value?: number;
    notes?: string;
  };
  deadline: string | null;
  content_deadline: string | null;
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  sent_at: string | null;
  viewed_at: string | null;
  project_id: string | null;
  created_at: string;
}

const statusConfig = {
  sent: { label: 'New', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Eye },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500', icon: XCircle },
};

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [notes, setNotes] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadOpportunity();
    }
  }, [params.id]);

  const loadOpportunity = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/creator/opportunities/${params.id}`);
      setOpportunity(data);
    } catch (error) {
      console.error('Failed to load opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActionLoading('accept');
      await api.post(`/creator/opportunities/${params.id}/accept`, {
        notes: notes || undefined,
      });
      router.push('/dashboard/opportunities');
    } catch (error) {
      console.error('Failed to accept opportunity:', error);
      alert('Failed to accept opportunity. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    try {
      setActionLoading('decline');
      await api.post(`/creator/opportunities/${params.id}/decline`, {
        reason: notes || undefined,
      });
      router.push('/dashboard/opportunities');
    } catch (error) {
      console.error('Failed to decline opportunity:', error);
      alert('Failed to decline opportunity. Please try again.');
    } finally {
      setActionLoading(null);
      setShowDeclineModal(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="dashboard-card p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-secondary-dark mt-4">Loading opportunity...</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="dashboard-card p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary-dark mb-2">Opportunity not found</h3>
          <p className="text-secondary-dark mb-4">This opportunity may have been removed or you don&apos;t have access.</p>
          <Link
            href="/dashboard/opportunities"
            className="inline-flex items-center text-green-600 hover:text-green-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to opportunities
          </Link>
        </div>
      </div>
    );
  }

  const config = statusConfig[opportunity.status];
  const StatusIcon = config.icon;
  const canRespond = ['sent', 'viewed'].includes(opportunity.status);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/opportunities"
          className="inline-flex items-center text-sm text-secondary-dark hover:text-primary-dark mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Opportunities
        </Link>
      </div>

      {/* Main Card */}
      <div className="dashboard-card p-8 mb-6">
        {/* Status & Agency */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${config.color}`}>
            <StatusIcon className="h-4 w-4" />
            {config.label}
          </span>
          <span className="text-secondary-dark flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            From {opportunity.agency_name}
          </span>
        </div>

        {/* Title & Brand */}
        <h1 className="text-2xl font-bold text-primary-dark mb-2">{opportunity.title}</h1>
        <p className="text-lg text-secondary-dark flex items-center gap-2 mb-6">
          <DollarSign className="h-5 w-5" />
          Brand: <span className="font-semibold text-primary-dark">{opportunity.brand_name}</span>
        </p>

        {/* Dates */}
        <div className="flex flex-wrap gap-6 mb-8 text-sm">
          {opportunity.sent_at && (
            <div className="flex items-center gap-2 text-secondary-dark">
              <Clock className="h-4 w-4" />
              <span>Received: {formatDate(opportunity.sent_at)}</span>
            </div>
          )}
          {opportunity.deadline && (
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Calendar className="h-4 w-4" />
              <span>Response Due: {formatDate(opportunity.deadline)}</span>
            </div>
          )}
          {opportunity.content_deadline && (
            <div className="flex items-center gap-2 text-secondary-dark">
              <FileText className="h-4 w-4" />
              <span>Content Due: {formatDate(opportunity.content_deadline)}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-primary-dark mb-3">Description</h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-secondary-dark whitespace-pre-wrap">{opportunity.description}</p>
          </div>
        </div>

        {/* Compensation */}
        {opportunity.compensation && Object.keys(opportunity.compensation).length > 0 && (
          <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Compensation
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {opportunity.compensation.amount && (
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Payment</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-100">
                    {formatCurrency(opportunity.compensation.amount, opportunity.compensation.currency)}
                  </p>
                </div>
              )}
              {opportunity.compensation.product_value && (
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Product Value</p>
                  <p className="text-lg font-semibold text-green-800 dark:text-green-100">
                    {formatCurrency(opportunity.compensation.product_value, opportunity.compensation.currency)}
                  </p>
                </div>
              )}
              {opportunity.compensation.payment_terms && (
                <div className="md:col-span-2">
                  <p className="text-sm text-green-700 dark:text-green-300">Payment Terms</p>
                  <p className="text-green-800 dark:text-green-100">{opportunity.compensation.payment_terms}</p>
                </div>
              )}
              {opportunity.compensation.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-green-700 dark:text-green-300">Notes</p>
                  <p className="text-green-800 dark:text-green-100">{opportunity.compensation.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requirements */}
        {opportunity.requirements && Object.keys(opportunity.requirements).length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-primary-dark mb-4 flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Requirements
            </h2>

            {opportunity.requirements.deliverables && opportunity.requirements.deliverables.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-secondary-dark mb-2">Deliverables</h3>
                <ul className="space-y-2">
                  {opportunity.requirements.deliverables.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-primary-dark">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunity.requirements.talking_points && opportunity.requirements.talking_points.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-secondary-dark mb-2">Key Talking Points</h3>
                <ul className="space-y-2">
                  {opportunity.requirements.talking_points.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-primary-dark">
                      <span className="text-green-500">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunity.requirements.content_guidelines && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-secondary-dark mb-2">Content Guidelines</h3>
                <p className="text-primary-dark">{opportunity.requirements.content_guidelines}</p>
              </div>
            )}

            {opportunity.requirements.restrictions && opportunity.requirements.restrictions.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-secondary-dark mb-2">Restrictions</h3>
                <ul className="space-y-2">
                  {opportunity.requirements.restrictions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-red-600 dark:text-red-400">
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {canRespond && (
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-primary-dark mb-4">Your Response</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-dark mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or questions for your agency..."
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-primary-dark resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleAccept}
                disabled={!!actionLoading}
                className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'accept' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Accept Opportunity
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={!!actionLoading}
                className="py-3 px-6 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle className="h-5 w-5" />
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Project Link */}
        {opportunity.project_id && opportunity.status === 'accepted' && (
          <div className="border-t pt-6">
            <Link
              href={`/monetization/project/${opportunity.project_id}`}
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
            >
              <ExternalLink className="h-5 w-5" />
              Go to Project
            </Link>
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-primary-dark mb-4">Decline Opportunity?</h3>
            <p className="text-secondary-dark mb-4">
              Are you sure you want to decline this opportunity? Your agency will be notified.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-dark mb-2">
                Reason (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Let your agency know why you're declining..."
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 text-primary-dark resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 py-2 px-4 border rounded-lg text-secondary-dark hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={actionLoading === 'decline'}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'decline' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
