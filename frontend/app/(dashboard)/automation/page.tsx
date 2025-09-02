"use client";
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
// Removed modal builder imports; RuleBuilder handles UI
import Link from 'next/link';
import RulesList from '@/components/automation/RulesList';
import RuleBuilder from '@/components/automation/RuleBuilder';
import AutomationNav from '@/components/automation/AutomationNav';
import { useSearchParams } from 'next/navigation';

type PollingConfig = {
  channel_id: string | null;
  polling_enabled: boolean;
  polling_interval_minutes: number;
  last_polled_at?: string | null;
  updated_at?: string | null;
};

type TodayStats = {
  responses_generated: number;
  responses_posted: number;
  deletes_attempted: number;
  flags_set: number;
  approvals_pending: number;
  approvals_processed: number;
};

async function fetchPolling(): Promise<PollingConfig> {
  const { data } = await api.get<PollingConfig>('/polling/config');
  return data;
}

async function updatePolling(payload: Partial<PollingConfig>): Promise<PollingConfig> {
  const { data } = await api.put<PollingConfig>('/polling/config', payload);
  return data;
}

async function fetchTodayStats(channel_id?: string | null): Promise<TodayStats> {
  const { data } = await api.get<TodayStats>('/automation/today-stats', { params: channel_id ? { channel_id } : {} });
  return data;
}

async function fetchApprovalsCount(): Promise<number> {
  const { data } = await api.get<{ items: unknown[]; total: number }>('/automation/approvals', { params: { status: 'pending', limit: 1, offset: 0 } });
  return data.total ?? 0;
}

export default function AutomationPage() {
  const qc = useQueryClient();
  const search = useSearchParams();
  const { data: polling, isLoading: loadingPolling } = useQuery({ queryKey: ['polling-config'], queryFn: fetchPolling });
  const channelId = polling?.channel_id ?? null;
  const { data: today, refetch: refetchToday } = useQuery({
    queryKey: ['automation-today-stats', channelId],
    queryFn: () => fetchTodayStats(channelId || undefined),
    refetchInterval: 60_000,
  });
  const { data: approvalsTotal } = useQuery({
    queryKey: ['approvals-count'],
    queryFn: fetchApprovalsCount,
    refetchInterval: 30_000,
  });
  // RulesList handles fetching rules and metrics internally

  const updateMut = useMutation({
    mutationFn: updatePolling,
    onSuccess: async () => {
      pushToast('Automation settings updated', 'success');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['polling-config'] }),
        qc.invalidateQueries({ queryKey: ['automation-today-stats'] }),
      ]);
    },
    onError: (e) => pushToast(`Failed to update: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const enabled = polling?.polling_enabled ?? false;
  const interval = polling?.polling_interval_minutes ?? 15;

  // Tab state
  type Tab = 'Active Rules' | 'Create Rule' | 'Approval Queue' | 'Analytics';
  const tabParam = (search.get('tab') || '').toLowerCase();
  const tabFromUrl: Tab = tabParam === 'create' ? 'Create Rule' : tabParam === 'analytics' ? 'Analytics' : 'Active Rules';
  const [tab, setTab] = useState<Tab>(tabFromUrl);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  // Create rule dialog state
  // Create Rule handled in RuleBuilder

  // rule toggling handled inside RulesList

  useEffect(() => {
    refetchToday();
  }, [enabled, interval, refetchToday]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Automation</h1>
        <Link href="/help#automation" className="text-sm underline">Help</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Button
            variant={enabled ? 'default' : 'secondary'}
            onClick={() => updateMut.mutate({ polling_enabled: !enabled })}
            disabled={updateMut.isPending || loadingPolling}
          >
            {enabled ? 'Disable Automation' : 'Enable Automation'}
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Interval</span>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={interval}
              onChange={(e) => updateMut.mutate({ polling_interval_minutes: Number(e.target.value) })}
              disabled={updateMut.isPending || loadingPolling}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const val = (i + 1) * 5;
                return (
                  <option key={val} value={val}>{val} min</option>
                );
              })}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-muted-foreground">Pending approvals</div>
            <div className="px-2 py-1 text-xs rounded-full bg-amber-50 border border-amber-200 text-amber-900">
              {approvalsTotal ?? 0}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Stat label="Generated" value={today?.responses_generated ?? 0} />
          <Stat label="Posted" value={today?.responses_posted ?? 0} />
          <Stat label="Deletes" value={today?.deletes_attempted ?? 0} />
          <Stat label="Flags" value={today?.flags_set ?? 0} />
          <Stat label="Approvals processed" value={today?.approvals_processed ?? 0} />
        </CardContent>
      </Card>

  {/* Tabs with links */}
  <AutomationNav />

      {/* Panels */}
      {tab === 'Active Rules' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 text-sm text-muted-foreground">
              Need to approve items? Go to <Link href="/dashboard/automation/approvals" className="underline">Approval Queue</Link>.
            </div>
            <RulesList />
          </CardContent>
        </Card>
      )}

      {tab === 'Create Rule' && (
        <RuleBuilder />
      )}

  {/* Approval Queue tab now links directly via AutomationNav to /dashboard/automation/approvals */}

      {tab === 'Analytics' && (
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">See more in <Link href="/dashboard/analytics" className="underline">Analytics</Link>. Automation usage and LLM costs are tracked under Analytics → Usage.</div>
          </CardContent>
        </Card>
      )}

      <HelpSection />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function HelpSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Help & Examples</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>Examples:</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Reply to simple positive comments with a friendly thanks.</li>
          <li>Flag comments containing certain keywords for manual review.</li>
          <li>Delete obvious spam with links, with approvals required.</li>
        </ul>
        <div className="text-muted-foreground">Tip: Use approvals for sensitive actions. You can change the run interval to tune responsiveness.</div>
      </CardContent>
    </Card>
  );
}