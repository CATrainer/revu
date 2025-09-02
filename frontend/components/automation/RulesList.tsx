"use client";
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

export type RuleLite = { id: string; name: string; enabled: boolean; priority: number; channel_id?: string | null };
export type RuleMetric = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  action_type: 'generate_response' | 'delete_comment' | 'flag_for_review' | string;
  triggers_today: number;
  success_rate: number; // 0..1
  issues_count: number;
  status: 'active' | 'paused' | 'error';
};

export type RulesListProps = {
  onEdit?: (id: string) => void;
  onTest?: (id: string) => void;
};

export default function RulesList({ onEdit, onTest }: RulesListProps) {
  const qc = useQueryClient();
  const { data: rules, isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => (await api.get<RuleLite[]>('/automation/rules')).data,
    refetchInterval: 60_000,
  });
  const { data: metrics } = useQuery({
    queryKey: ['automation-rules-metrics'],
    queryFn: async () => (await api.get<RuleMetric[]>('/automation/rules/metrics')).data,
    refetchInterval: 60_000,
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => (await api.patch(`/automation/rules/${id}/enabled`, { enabled })).data,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['automation-rules'] }),
        qc.invalidateQueries({ queryKey: ['automation-rules-metrics'] }),
      ]);
    },
    onError: (e) => pushToast(`Toggle failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const duplicateMut = useMutation({
    mutationFn: async (id: string) => (await api.post(`/automation/rules/${id}/duplicate`)).data,
    onSuccess: async () => {
      pushToast('Rule duplicated', 'success');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['automation-rules'] }),
        qc.invalidateQueries({ queryKey: ['automation-rules-metrics'] }),
      ]);
    },
    onError: (e) => pushToast(`Duplicate failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/automation/rules/${id}`)).data,
    onSuccess: async () => {
      pushToast('Rule deleted', 'success');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['automation-rules'] }),
        qc.invalidateQueries({ queryKey: ['automation-rules-metrics'] }),
      ]);
    },
    onError: (e) => pushToast(`Delete failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  // Filters
  const [status, setStatus] = useState<'all'|'active'|'paused'|'error'>('all');
  const [atype, setAtype] = useState<'all'|'generate_response'|'delete_comment'|'flag_for_review'>('all');
  const [scope, setScope] = useState<'all'|'channel'|'global'>('all');

  const merged = useMemo(() => {
    const byId = new Map<string, RuleLite>();
    (rules || []).forEach(r => byId.set(r.id, r));
    const withMetrics: RuleMetric[] = (metrics || []).map(m => ({
      ...m,
      // ensure enabled from base rules if present
      enabled: byId.get(m.id)?.enabled ?? m.enabled,
      priority: byId.get(m.id)?.priority ?? m.priority,
      name: byId.get(m.id)?.name ?? m.name,
    }));
    // include any rules lacking metrics
    const missing = (rules || []).filter(r => !(metrics || []).some(m => m.id === r.id)).map(r => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled,
      priority: r.priority,
      action_type: 'generate_response',
      triggers_today: 0,
      success_rate: 0,
      issues_count: 0,
      status: r.enabled ? 'active' : 'paused',
    } as RuleMetric));
    return [...withMetrics, ...missing];
  }, [rules, metrics]);

  const filtered = useMemo(() => {
    return merged.filter(m => {
      if (status !== 'all' && m.status !== status) return false;
      if (atype !== 'all' && m.action_type !== atype) return false;
      if (scope !== 'all') {
        const base = (rules || []).find(r => r.id === m.id);
        const isChannel = !!base?.channel_id;
        if (scope === 'channel' && !isChannel) return false;
        if (scope === 'global' && isChannel) return false;
      }
      return true;
    });
  }, [merged, status, atype, scope, rules]);

  const testMut = useMutation({
    mutationFn: async (id: string) => (await api.post(`/automation/rules/${id}/test`, { sample: 5 })).data,
    onSuccess: () => pushToast('Test executed. Check analytics for details.', 'success'),
    onError: (e) => pushToast(`Test failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  if (isLoading && !rules) {
    return <div className="text-sm text-muted-foreground">Loading rules…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select className="border rounded px-2 py-1 text-sm" value={scope} onChange={(e) => setScope(e.target.value as 'all'|'channel'|'global')}>
          <option value="all">All scopes</option>
          <option value="channel">Channel-specific</option>
          <option value="global">Global</option>
        </select>
  <select className="border rounded px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as 'all'|'active'|'paused'|'error')}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="error">With issues</option>
        </select>
  <select className="border rounded px-2 py-1 text-sm" value={atype} onChange={(e) => setAtype(e.target.value as 'all'|'generate_response'|'delete_comment'|'flag_for_review')}>
          <option value="all">All actions</option>
          <option value="generate_response">Generate</option>
          <option value="flag_for_review">Flag</option>
          <option value="delete_comment">Delete</option>
        </select>
      </div>

      {!filtered.length ? (
        <div className="text-sm text-muted-foreground">No rules found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <Card key={r.id} className={statusClass(r)}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  {r.name}
                  {r.issues_count > 0 && <span title={`${r.issues_count} issues`} className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />}
                </CardTitle>
                <div className="text-xs px-2 py-0.5 rounded border bg-white">Priority {r.priority}</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Badge color={r.status}>{labelForStatus(r.status)}</Badge>
                  <div className="text-xs text-muted-foreground">Action: {labelForAction(r.action_type)}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Metric label="Triggers (today)" value={r.triggers_today} />
                  <Metric label="Success rate" value={`${Math.round(r.success_rate * 100)}%`} />
                  <Metric label="Issues" value={r.issues_count} warn={r.issues_count > 0} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleMut.mutate({ id: r.id, enabled: !r.enabled })}>
                    {r.enabled ? 'Pause' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit ? onEdit(r.id) : pushToast('Rule editor coming soon', 'info')}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => duplicateMut.mutate(r.id)}>Duplicate</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteMut.mutate(r.id)}>Delete</Button>
                  <Button size="sm" onClick={() => onTest ? onTest(r.id) : testMut.mutate(r.id)} disabled={testMut.isPending}>Test</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className={`p-2 rounded border ${warn ? 'border-amber-300 bg-amber-50' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: 'active'|'paused'|'error' }) {
  const cls = color === 'active' ? 'bg-green-50 text-green-900 border-green-200'
    : color === 'paused' ? 'bg-gray-50 text-gray-900 border-gray-200'
    : 'bg-amber-50 text-amber-900 border-amber-200';
  return <div className={`text-xs px-2 py-1 rounded border ${cls}`}>{children}</div>;
}

function labelForStatus(s: 'active'|'paused'|'error') {
  return s === 'active' ? 'Active' : s === 'paused' ? 'Paused' : 'With issues';
}

function labelForAction(a: string) {
  return a === 'generate_response' ? 'Generate response' : a === 'delete_comment' ? 'Delete' : a === 'flag_for_review' ? 'Flag' : a;
}

function statusClass(r: RuleMetric) {
  if (r.status === 'active') return '';
  if (r.status === 'paused') return 'border-gray-200';
  return 'border-amber-200';
}
