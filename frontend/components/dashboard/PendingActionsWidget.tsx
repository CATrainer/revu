'use client';

import Link from 'next/link';
import { MessageCircle, Clock, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingActionsWidgetProps {
  unansweredMessages: number;
  awaitingApproval: number;
  scheduledToday: number;
  allCaughtUp: boolean;
}

interface ActionItemProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  count: number;
  href: string;
  queryParam?: string;
}

function ActionItem({ icon: Icon, iconColor, iconBg, label, count, href, queryParam }: ActionItemProps) {
  const fullHref = queryParam ? `${href}?tab=${queryParam}` : href;
  
  return (
    <Link
      href={fullHref}
      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-lg font-bold',
          count > 0 ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {count}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

export function PendingActionsWidget({
  unansweredMessages,
  awaitingApproval,
  scheduledToday,
  allCaughtUp,
}: PendingActionsWidgetProps) {
  if (allCaughtUp) {
    return (
      <div className="glass-panel rounded-2xl border border-holo-teal/20 p-6 shadow-glass backdrop-blur-md h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Pending Actions</h3>
          <div className="p-2 rounded-xl bg-gradient-to-br from-holo-teal/20 to-holo-teal-dark/20 border border-holo-teal/30">
            <CheckCircle2 className="h-5 w-5 text-holo-teal" />
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">You&apos;re all caught up!</p>
          <p className="text-sm text-muted-foreground">
            No pending actions at the moment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-holo-teal/20 p-6 shadow-glass backdrop-blur-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Pending Actions</h3>
        <div className="p-2 rounded-xl bg-gradient-to-br from-holo-teal/20 to-holo-teal-dark/20 border border-holo-teal/30">
          <Clock className="h-5 w-5 text-holo-teal" />
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <ActionItem
          icon={MessageCircle}
          iconColor="text-holo-pink"
          iconBg="bg-holo-pink/20"
          label="Unanswered messages"
          count={unansweredMessages}
          href="/interactions"
          queryParam="unanswered"
        />

        <ActionItem
          icon={Clock}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/20"
          label="Awaiting approval"
          count={awaitingApproval}
          href="/interactions"
          queryParam="awaiting_approval"
        />

        <ActionItem
          icon={Calendar}
          iconColor="text-holo-blue"
          iconBg="bg-holo-blue/20"
          label="Posts scheduled today"
          count={scheduledToday}
          href="/calendar"
        />
      </div>

      <Link
        href="/interactions"
        className="mt-4 flex items-center justify-center gap-2 text-sm text-holo-teal hover:text-holo-teal/80 font-medium transition-colors group"
      >
        View All Interactions
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
