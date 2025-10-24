'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Building2,
  Mail,
  Calendar,
  Globe,
  Hash,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';
type AccountType = 'creator' | 'agency';

interface Application {
  id: string;
  user_id: string;
  account_type: AccountType;
  application_data: any;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ApplicationPageProps {
  params: {
    id: string;
  };
}

export default function ApplicationDetailPage({ params }: ApplicationPageProps) {
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [params.id]);

  const fetchApplication = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/applications/${params.id}`);
      setApplication(response.data);
      setAdminNotes(response.data.admin_notes || '');
    } catch (error: any) {
      console.error('Failed to fetch application:', error);
      pushToast('Failed to load application', 'error');
      router.push('/admin/applications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this application?')) return;

    setIsProcessing(true);
    try {
      await api.post(`/admin/applications/${params.id}/approve`, {
        send_email: true,
      });
      pushToast('Application approved successfully!', 'success');
      router.push('/admin/applications');
    } catch (error: any) {
      console.error('Failed to approve application:', error);
      pushToast(error.response?.data?.detail || 'Failed to approve application', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      pushToast('Please provide a reason for rejection', 'error');
      return;
    }

    if (!confirm('Are you sure you want to reject this application?')) return;

    setIsProcessing(true);
    try {
      await api.post(`/admin/applications/${params.id}/reject`, {
        send_email: true,
        reason: rejectionReason,
      });
      pushToast('Application rejected', 'success');
      router.push('/admin/applications');
    } catch (error: any) {
      console.error('Failed to reject application:', error);
      pushToast(error.response?.data?.detail || 'Failed to reject application', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsProcessing(true);
    try {
      await api.patch(`/admin/applications/${params.id}/notes`, {
        admin_notes: adminNotes,
      });
      pushToast('Notes saved successfully', 'success');
      await fetchApplication();
    } catch (error: any) {
      console.error('Failed to save notes:', error);
      pushToast('Failed to save notes', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderCreatorApplication = (data: any) => {
    return (
      <div className="space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-secondary-dark">Full Name</Label>
              <p className="text-primary-dark font-medium">{data.full_name}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Creator Name</Label>
              <p className="text-primary-dark font-medium">{data.creator_name}</p>
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-3">Platforms</h3>
          <div className="space-y-3">
            {Object.entries(data.platforms || {}).map(([platform, info]: [string, any]) => {
              if (!info.enabled) return null;
              return (
                <div
                  key={platform}
                  className="border border-border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
                >
                  <p className="font-semibold text-primary-dark capitalize mb-2">{platform}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-secondary-dark">Username: </span>
                      <span className="text-primary-dark font-medium">{info.username || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-secondary-dark">Email: </span>
                      <span className="text-primary-dark font-medium">{info.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <Label className="text-sm text-secondary-dark">Follower Range</Label>
            <p className="text-primary-dark font-medium">{data.follower_range}</p>
          </div>
        </div>

        {/* About */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-3">About Creator</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-secondary-dark">Content Type</Label>
              <p className="text-primary-dark">{data.content_type}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Why Repruv?</Label>
              <p className="text-primary-dark">{data.why_repruv}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Biggest Challenge</Label>
              <p className="text-primary-dark">{data.biggest_challenge}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Referral Source</Label>
              <p className="text-primary-dark">{data.referral_source}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgencyApplication = (data: any) => {
    return (
      <div className="space-y-6">
        {/* Agency Info */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-3">Agency Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-secondary-dark">Agency Name</Label>
              <p className="text-primary-dark font-medium">{data.agency_name}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Website</Label>
              <p className="text-primary-dark font-medium">{data.agency_website || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Contact Name</Label>
              <p className="text-primary-dark font-medium">{data.contact_name}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Contact Role</Label>
              <p className="text-primary-dark font-medium">{data.contact_role}</p>
            </div>
          </div>
        </div>

        {/* Portfolio */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-3">Portfolio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-secondary-dark">Creator Count</Label>
              <p className="text-primary-dark font-medium">{data.creator_count}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Average Audience Size</Label>
              <p className="text-primary-dark font-medium">{data.avg_audience_size}</p>
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-sm text-secondary-dark">Platforms</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(data.platforms || []).map((platform: string) => (
                <span
                  key={platform}
                  className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-sm font-medium capitalize"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Creator Emails */}
        {data.creator_emails && data.creator_emails.length > 0 && (
          <div>
            <Label className="text-sm text-secondary-dark">Creator Emails ({data.creator_emails.length})</Label>
            <div className="mt-2 space-y-1">
              {data.creator_emails.map((email: string, index: number) => (
                <p key={index} className="text-sm text-primary-dark">
                  {email}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Partnership Details */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-3">Partnership Details</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-secondary-dark">Partnership Interest</Label>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                  data.partner_interest === 'yes'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : data.partner_interest === 'maybe'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {data.partner_interest === 'yes'
                  ? 'Yes, very interested!'
                  : data.partner_interest === 'maybe'
                  ? 'Maybe, tell me more'
                  : 'Not at this time'}
              </span>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Biggest Challenge</Label>
              <p className="text-primary-dark">{data.biggest_challenge}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Required Features</Label>
              <p className="text-primary-dark">{data.required_features}</p>
            </div>
            <div>
              <Label className="text-sm text-secondary-dark">Referral Source</Label>
              <p className="text-primary-dark">{data.referral_source}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-dark">Application not found</p>
      </div>
    );
  }

  const isPending = application.status === 'pending';
  const AccountIcon = application.account_type === 'creator' ? Users : Building2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/admin/applications')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Applications
        </Button>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              application.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                : application.status === 'approved'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}
          >
            {application.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800">
                  <AccountIcon
                    className={`w-6 h-6 ${
                      application.account_type === 'creator' ? 'text-green-500' : 'text-blue-500'
                    }`}
                  />
                </div>
                <div>
                  <CardTitle className="text-xl capitalize">
                    {application.account_type} Application
                  </CardTitle>
                  <p className="text-sm text-secondary-dark">
                    Submitted {formatDate(application.submitted_at)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {application.account_type === 'creator'
                ? renderCreatorApplication(application.application_data)
                : renderAgencyApplication(application.application_data)}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Admin Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add internal notes about this application..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={5}
              />
              <Button
                onClick={handleSaveNotes}
                disabled={isProcessing}
                variant="outline"
                className="w-full"
              >
                Save Notes
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          {isPending && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!showRejectForm ? (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {isProcessing ? 'Processing...' : 'Approve Application'}
                    </Button>
                    <Button
                      onClick={() => setShowRejectForm(true)}
                      disabled={isProcessing}
                      variant="outline"
                      className="w-full border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Application
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Please provide a reason for rejection. This will be sent to the applicant.
                        </p>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleReject}
                        disabled={isProcessing || !rejectionReason.trim()}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isProcessing ? 'Rejecting...' : 'Confirm Reject'}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectionReason('');
                        }}
                        disabled={isProcessing}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-secondary-dark">Application ID</p>
                <p className="text-primary-dark font-mono text-xs">{application.id}</p>
              </div>
              <div>
                <p className="text-secondary-dark">User ID</p>
                <p className="text-primary-dark font-mono text-xs">{application.user_id}</p>
              </div>
              {application.reviewed_at && (
                <div>
                  <p className="text-secondary-dark">Reviewed At</p>
                  <p className="text-primary-dark">{formatDate(application.reviewed_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
