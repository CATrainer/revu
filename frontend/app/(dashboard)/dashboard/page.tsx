// frontend/app/(dashboard)/dashboard/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { AgencyInvitationsBanner } from '@/components/agency/AgencyInvitationsBanner';
import { PlatformWarningBanner } from '@/components/dashboard/PlatformWarningBanner';
import { EngagementWidget } from '@/components/dashboard/EngagementWidget';
import { PendingActionsWidget } from '@/components/dashboard/PendingActionsWidget';
import { MonetizationWidget } from '@/components/dashboard/MonetizationWidget';
import { AgencyWidget } from '@/components/dashboard/AgencyWidget';
import { Loader2 } from 'lucide-react';

interface DashboardSummary {
  platform_warning: {
    show: boolean;
    disconnected: string[];
    connected_count: number;
    total_platforms: number;
  };
  engagement: {
    views_7d: number;
    views_change: number;
    engagement_rate: number;
    engagement_change: number;
    new_followers: number;
    new_followers_change: number;
    has_data: boolean;
  };
  pending_actions: {
    unanswered_messages: number;
    awaiting_approval: number;
    scheduled_today: number;
    total: number;
    all_caught_up: boolean;
  };
  monetization: {
    has_project: boolean;
    project_id: string | null;
    project_name: string | null;
    tasks_completed: number;
    tasks_total: number;
    progress_percent: number;
    estimated_revenue: number | null;
  };
  agency: {
    is_connected: boolean;
    agency_id: string | null;
    agency_name: string | null;
    agency_logo_url: string | null;
    new_opportunities: number;
    last_message_date: string | null;
  };
  is_demo: boolean;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('/api/v1/dashboard/dashboard-summary');
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        } else {
          setError('Failed to load dashboard data');
        }
      } catch (err) {
        console.error('Failed to fetch dashboard summary:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-holo-purple" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{error || 'Something went wrong'}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-holo-purple hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up px-4 md:px-0">
      {/* Agency Invitations Banner - Show pending invitations */}
      <AgencyInvitationsBanner />

      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          What do you need to know?
        </h1>
        <p className="text-muted-foreground">
          Your dashboard at a glance
          {summary.is_demo && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">
              Demo Mode
            </span>
          )}
        </p>
      </div>

      {/* Platform Connection Warning */}
      {summary.platform_warning.show && (
        <PlatformWarningBanner
          disconnectedPlatforms={summary.platform_warning.disconnected}
        />
      )}

      {/* Widget Grid - 2x2 Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engagement Summary Widget */}
        <EngagementWidget
          views7d={summary.engagement.views_7d}
          viewsChange={summary.engagement.views_change}
          engagementRate={summary.engagement.engagement_rate}
          engagementChange={summary.engagement.engagement_change}
          newFollowers={summary.engagement.new_followers}
          newFollowersChange={summary.engagement.new_followers_change}
          hasData={summary.engagement.has_data}
        />

        {/* Pending Actions Widget */}
        <PendingActionsWidget
          unansweredMessages={summary.pending_actions.unanswered_messages}
          awaitingApproval={summary.pending_actions.awaiting_approval}
          scheduledToday={summary.pending_actions.scheduled_today}
          allCaughtUp={summary.pending_actions.all_caught_up}
        />

        {/* Monetization Status Widget */}
        <MonetizationWidget
          hasProject={summary.monetization.has_project}
          projectId={summary.monetization.project_id}
          projectName={summary.monetization.project_name}
          tasksCompleted={summary.monetization.tasks_completed}
          tasksTotal={summary.monetization.tasks_total}
          progressPercent={summary.monetization.progress_percent}
          estimatedRevenue={summary.monetization.estimated_revenue}
        />

        {/* Agency Connection Widget */}
        <AgencyWidget
          isConnected={summary.agency.is_connected}
          agencyId={summary.agency.agency_id}
          agencyName={summary.agency.agency_name}
          agencyLogoUrl={summary.agency.agency_logo_url}
          newOpportunities={summary.agency.new_opportunities}
          lastMessageDate={summary.agency.last_message_date}
        />
      </div>
    </div>
  );
}