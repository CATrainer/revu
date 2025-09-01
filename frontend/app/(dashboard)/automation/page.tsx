// frontend/app/(dashboard)/automation/page.tsx
"use client";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PollingConfig = {
  channel_id: string;
  polling_enabled: boolean;
  polling_interval_minutes: number;
  last_polled_at?: string | null;
  updated_at?: string | null;
};

type Stats = {
  total_comments_processed: number;
  responses_generated: number;
};

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
};

async function fetchPolling(): Promise<PollingConfig> {
  const { data } = await api.get<PollingConfig>('/polling/config');
  return data;
}

async function updatePolling(payload: Partial<PollingConfig>): Promise<PollingConfig> {
  const { data } = await api.put<PollingConfig>('/polling/config', payload);
  return data;
}

async function fetchStats(): Promise<Stats> {
  const { data } = await api.get<Stats>('/polling/stats');
  return data;
}

async function fetchRules(): Promise<Rule[]> {
  const { data } = await api.get<Rule[]>('/automation/rules');
  return data;
}

export default function AutomationPage() {
  const qc = useQueryClient();
  const { data: polling, isLoading: loadingPolling } = useQuery({ queryKey: ['polling-config'], queryFn: fetchPolling });
  const { data: stats } = useQuery({ queryKey: ['polling-stats'], queryFn: fetchStats, refetchInterval: 60_000 });
  const { data: rules } = useQuery({ queryKey: ['automation-rules'], queryFn: fetchRules, refetchInterval: 60_000 });

  const updateMut = useMutation({
    mutationFn: updatePolling,
    onSuccess: async () => {
      pushToast('Polling settings updated', 'success');
      await qc.invalidateQueries({ queryKey: ['polling-config'] });
    },
    onError: (e) => pushToast(`Failed to update: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const enabled = polling?.polling_enabled ?? false;
  const interval = polling?.polling_interval_minutes ?? 15;

  // Rule builder state
  const [open, setOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [classification, setClassification] = useState('');
  const [action, setAction] = useState<'generate' | 'delete' | 'flag'>('generate');
  const [requireApproval, setRequireApproval] = useState(false);
  const [limit, setLimit] = useState<number | ''>('');

  const createRule = useMutation({
    mutationFn: async () => {
      const payload: {
        name: string;
        classification?: string;
        action: 'generate' | 'delete' | 'flag';
        require_approval: boolean;
        response_limit_per_run?: number;
        channel_id?: string | null;
      } = {
        name: ruleName,
        classification: classification || undefined,
        action,
        require_approval: requireApproval,
        response_limit_per_run: limit === '' ? undefined : Number(limit),
        channel_id: polling?.channel_id,
      };
      const { data } = await api.post('/automation/rules', payload);
      return data;
    },
    onSuccess: async () => {
      pushToast('Rule created', 'success');
      setOpen(false);
      setRuleName('');
      setClassification('');
      setAction('generate');
      setRequireApproval(false);
      setLimit('');
      await qc.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (e) => pushToast(`Failed to create rule: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data } = await api.patch(`/automation/rules/${id}/enabled`, { enabled });
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (e) => pushToast(`Failed to update rule: ${String((e as Error)?.message || e)}`, 'error'),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Automation</h1>

      <Card>
        <CardHeader>
          <CardTitle>Polling Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Button
            variant={enabled ? 'default' : 'secondary'}
            onClick={() => updateMut.mutate({ polling_enabled: !enabled })}
            disabled={updateMut.isPending || loadingPolling}
          >
            {enabled ? 'Disable Polling' : 'Enable Polling'}
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
                  <option key={val} value={val}>
                    {val} min
                  </option>
                );
              })}
            </select>
          </div>

          <div className="text-xs text-muted-foreground ml-auto">
            Last polled: {polling?.last_polled_at ? new Date(polling.last_polled_at).toLocaleString() : '—'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded border">
            <div className="text-xs text-muted-foreground">Total comments processed</div>
            <div className="text-xl font-semibold">{stats?.total_comments_processed ?? 0}</div>
          </div>
          <div className="p-3 rounded border">
            <div className="text-xs text-muted-foreground">Responses generated</div>
            <div className="text-xl font-semibold">{stats?.responses_generated ?? 0}</div>
          </div>
          <div className="p-3 rounded border">
            <div className="text-xs text-muted-foreground">Polling interval</div>
            <div className="text-xl font-semibold">{interval} min</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Automation Rules</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Create New Rule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Automation Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="rule-name">Rule name</Label>
                    <Input id="rule-name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g., Reply to simple positives" />
                  </div>
                  <div className="space-y-1">
                    <Label>Trigger: classification</Label>
                    <select className="border rounded px-2 py-1 w-full" value={classification} onChange={(e) => setClassification(e.target.value)}>
                      <option value="">Any</option>
                      <option value="simple_positive">Simple positive</option>
                      <option value="question">Question</option>
                      <option value="negative">Negative</option>
                      <option value="spam">Spam</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Action</Label>
                    <select className="border rounded px-2 py-1 w-full" value={action} onChange={(e) => setAction(e.target.value as 'generate' | 'delete' | 'flag')}>
                      <option value="generate">Generate response</option>
                      <option value="flag">Flag for review</option>
                      <option value="delete">Delete comment</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="require-approval" type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} />
                    <Label htmlFor="require-approval">Requires approval</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="limit">Max responses per run</Label>
                    <Input id="limit" type="number" min={1} placeholder="Optional" value={limit} onChange={(e) => setLimit(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setOpen(false)} disabled={createRule.isPending}>Cancel</Button>
                  <Button onClick={() => createRule.mutate()} disabled={!ruleName || createRule.isPending}>Save Rule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!rules?.length ? (
            <div className="text-sm text-muted-foreground">No rules configured.</div>
          ) : (
            <div className="space-y-2">
              {rules?.map((r) => (
                <div key={r.id} className="p-3 rounded border flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">Priority {r.priority}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs px-2 py-1 rounded border ${r.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      {r.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toggleRule.mutate({ id: r.id, enabled: !r.enabled })} disabled={toggleRule.isPending}>
                      {r.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}