'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Briefcase } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { creatorAgencyApi, creatorOpportunityApi, type CreatorAgency, type CreatorOpportunityCounts } from '@/lib/agency-api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AgencyBadge() {
  const { user } = useAuth();
  const [agency, setAgency] = useState<CreatorAgency | null>(null);
  const [opportunityCounts, setOpportunityCounts] = useState<CreatorOpportunityCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only fetch for creator users (not agency users)
    if (!user || user.user_kind === 'agency') {
      setIsLoading(false);
      return;
    }

    const fetchAgencyData = async () => {
      try {
        const agencyData = await creatorAgencyApi.getMyAgency();
        setAgency(agencyData);

        // Only fetch opportunity counts if creator is linked to an agency
        if (agencyData) {
          const counts = await creatorOpportunityApi.getCounts();
          setOpportunityCounts(counts);
        }
      } catch (error) {
        // Creator not linked to an agency - this is expected
        console.debug('Creator not linked to agency or error fetching:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgencyData();
  }, [user]);

  // Don't render anything for agency users or while loading
  if (isLoading || !agency || user?.user_kind === 'agency') {
    return null;
  }

  const pendingCount = opportunityCounts?.pending || 0;

  return (
    <TooltipProvider>
      <div className="hidden md:flex items-center gap-2">
        {/* Agency Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/dashboard/opportunities"
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-pill glass-panel border border-border backdrop-blur-md hover:border-purple-300 transition-all group"
            >
              <Building2 className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {agency.agency_name}
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>You&apos;re managed by {agency.agency_name}</p>
          </TooltipContent>
        </Tooltip>

        {/* Pending Opportunities Badge */}
        {pendingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/opportunities"
                className="relative flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-pill bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>{pendingCount}</span>
                {/* Pulse indicator */}
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-400 animate-pulse"></span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{pendingCount} pending opportunit{pendingCount === 1 ? 'y' : 'ies'} from your agency</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
