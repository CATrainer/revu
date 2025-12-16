'use client';

import Link from 'next/link';
import { Building2, ArrowRight, Briefcase, MessageSquare, Search } from 'lucide-react';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
}

interface AgencyWidgetProps {
  isConnected: boolean;
  agencyId: string | null;
  agencyName: string | null;
  agencyLogoUrl: string | null;
  newOpportunities: number;
  lastMessageDate: string | null;
}

export function AgencyWidget({
  isConnected,
  agencyId,
  agencyName,
  agencyLogoUrl,
  newOpportunities,
  lastMessageDate,
}: AgencyWidgetProps) {
  if (!isConnected) {
    return (
      <div className="glass-panel rounded-2xl border border-holo-blue/20 p-6 shadow-glass backdrop-blur-md h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Agency</h3>
          <div className="p-2 rounded-xl bg-gradient-to-br from-holo-blue/20 to-holo-blue-dark/20 border border-holo-blue/30">
            <Building2 className="h-5 w-5 text-holo-blue" />
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="p-4 rounded-full bg-holo-blue/10 border border-holo-blue/30 mb-4">
            <Search className="h-8 w-8 text-holo-blue" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Connect with an agency to access brand deals and sponsorships
          </p>
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-holo-blue to-holo-purple text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Search className="h-4 w-4" />
            Find an Agency
          </Link>
        </div>
      </div>
    );
  }

  const lastMessageFormatted = lastMessageDate
    ? formatTimeAgo(lastMessageDate)
    : null;

  return (
    <div className="glass-panel rounded-2xl border border-holo-blue/20 p-6 shadow-glass backdrop-blur-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Agency</h3>
        <div className="p-2 rounded-xl bg-gradient-to-br from-holo-blue/20 to-holo-blue-dark/20 border border-holo-blue/30">
          <Building2 className="h-5 w-5 text-holo-blue" />
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {/* Agency Info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
          {agencyLogoUrl ? (
            <img
              src={agencyLogoUrl}
              alt={agencyName || 'Agency'}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-holo-blue/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-holo-blue" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{agencyName}</p>
            <p className="text-xs text-muted-foreground">Connected</p>
          </div>
        </div>

        {/* New Opportunities */}
        <Link
          href="/dashboard/opportunities"
          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Briefcase className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm text-foreground">New Opportunities</span>
          </div>
          <div className="flex items-center gap-2">
            {newOpportunities > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold">
                {newOpportunities}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">0</span>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        {/* Last Message */}
        {lastMessageFormatted && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="p-2 rounded-lg bg-holo-purple/20">
              <MessageSquare className="h-4 w-4 text-holo-purple" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last contact</p>
              <p className="text-sm text-foreground">{lastMessageFormatted}</p>
            </div>
          </div>
        )}
      </div>

      <Link
        href="/dashboard/opportunities"
        className="mt-4 flex items-center justify-center gap-2 text-sm text-holo-blue hover:text-holo-blue/80 font-medium transition-colors group"
      >
        View Opportunities
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
