"use client";
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

// Lightweight types for builder
type PollingConfig = {
  channel_id: string | null;
  polling_enabled: boolean;
  polling_interval_minutes: number;
};

type TestReport = {
  rule_summary: { id: string; name: string; enabled: boolean; action_type: string; priority: number; require_approval: boolean; response_limit_per_run?: number | null };
  tested_count: number;
  predicted_matches: number;
  actions_breakdown: Record<string, number>;
  estimated_api_cost_usd: number;
  issues: string[];
  conflicts: Array<{ id: string; name: string; priority: number; action_type: string; overlap_keywords: string[] }>;
  suggestions: string[];
};

type ParseNaturalResponse = {
  saved?: boolean;
  message?: string;
  parsed_rule?: {
    conditions?: { classification?: string; keywords?: string[]; author_status?: string; operator?: 'AND'|'OR' };
    action?: { type?: VisualRule['action']['type']; config?: Record<string, unknown> };
    limits?: Record<string, unknown>;
    timing?: Record<string, unknown>;
    scope?: Record<string, unknown>;
    require_approval?: boolean;
  };
  improvements?: string[];
  similar_rules?: Array<{ id?: string; name?: string; priority?: number; action_type?: string; overlap_keywords?: string[] }>;
  examples?: Array<{ name: string; nl: string; rule: unknown }>
};

type VisualRule = {
  name: string;
  enabled: boolean;
  priority: number;
  operator: 'AND' | 'OR';
  conditions: {
    classification?: string;
    keywords?: string[];
    author_status?: 'any' | 'owner' | 'subscriber' | 'new';
  };
  scope: { type: 'all' | 'videos' | 'categories' | 'new_uploads'; values?: string[] };
  action: { type: 'generate_response' | 'delete_comment' | 'flag_for_review'; config?: Record<string, unknown> };
  require_approval: boolean;
  response_limit_per_run?: number | '';
  timing?: { days?: string[]; start?: string; end?: string };
};

function buildPreview(rule: VisualRule): string {
  const parts: string[] = [];
  // Scope
  if (rule.scope.type === 'all') parts.push('Apply to all videos');
  if (rule.scope.type === 'videos' && rule.scope.values?.length) parts.push(`Apply to specific videos (${rule.scope.values.length})`);
  if (rule.scope.type === 'categories' && rule.scope.values?.length) parts.push(`Apply to categories: ${rule.scope.values.join(', ')}`);
  if (rule.scope.type === 'new_uploads') parts.push('Apply only to new uploads');
  // Conditions
  const conds: string[] = [];
  if (rule.conditions.classification) conds.push(`classification is "${rule.conditions.classification}"`);
  if (rule.conditions.keywords?.length) conds.push(`content includes any of [${rule.conditions.keywords.join(', ')}]`);
  if (rule.conditions.author_status && rule.conditions.author_status !== 'any') conds.push(`author is ${rule.conditions.author_status}`);
  if (conds.length) parts.push(`${rule.operator} of: ${conds.join('; ')}`);
  // Action
  const act = rule.action.type;
  if (act === 'generate_response') parts.push('Action: generate a concise reply');
  if (act === 'flag_for_review') parts.push('Action: flag for review');
  if (act === 'delete_comment') parts.push('Action: delete comment');
  if (rule.require_approval) parts.push('Requires approval');
  if (typeof rule.response_limit_per_run === 'number' && rule.response_limit_per_run > 0) parts.push(`Max ${rule.response_limit_per_run} per run`);
  if (rule.timing?.days?.length || rule.timing?.start || rule.timing?.end) parts.push('Apply on schedule');
  return parts.join('. ') + '.';
}

type Overrides = {
  conditions: { classification?: string; keywords?: string[]; author_status?: string; operator?: 'AND'|'OR' };
  action: { type: VisualRule['action']['type']; config?: Record<string, unknown> };
  limits?: Record<string, unknown>;
  timing?: { days?: string[]; start?: string; end?: string };
  scope?: { type?: VisualRule['scope']['type']; values?: string[] };
  require_approval?: boolean;
  response_limit_per_run?: number;
  priority?: number;
  enabled?: boolean;
};

function toOverrides(rule: VisualRule): Overrides {
  const overrides: Overrides = {
    conditions: {
      classification: rule.conditions.classification || undefined,
      keywords: rule.conditions.keywords?.filter(Boolean) || undefined,
      author_status: rule.conditions.author_status || undefined,
      operator: rule.operator,
    },
    action: { type: rule.action.type, config: rule.action.config || {} },
    limits: {},
    timing: rule.timing || {},
    scope: { type: rule.scope.type, values: rule.scope.values || [] },
    require_approval: rule.require_approval,
    response_limit_per_run: typeof rule.response_limit_per_run === 'number' ? rule.response_limit_per_run : undefined,
    priority: rule.priority,
    enabled: rule.enabled,
  };
  return overrides;
}

export default function RuleBuilder() {
  const qc = useQueryClient();
  const { data: polling } = useQuery({
    queryKey: ['polling-config'],
    queryFn: async () => (await api.get<PollingConfig>('/polling/config')).data,
  });
  const channelId = polling?.channel_id ?? undefined;

  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [nlText, setNlText] = useState<string>('');
  const [state, setState] = useState<VisualRule>({
    name: '',
    enabled: false,
    priority: 0,
    operator: 'AND',
    conditions: { classification: '', keywords: [], author_status: 'any' },
    scope: { type: 'all' },
    action: { type: 'generate_response', config: { template: 'Thanks for the comment!' } },
    require_approval: false,
    response_limit_per_run: '',
    timing: { days: [], start: '', end: '' },
  });
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(toOverrides(state), null, 2));
  const [lastSavedRuleId, setLastSavedRuleId] = useState<string | null>(null);
  const [parseData, setParseData] = useState<ParseNaturalResponse | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const preview = useMemo(() => buildPreview(state), [state]);

  const parseAndSave = useMutation({
    mutationFn: async ({ confirm, name, enabled }: { confirm: boolean; name: string; enabled: boolean }) => {
      const payload: { text: string; channel_id?: string; confirm: boolean; name: string; overrides: Overrides } = {
        text: preview,
        channel_id: channelId,
        confirm,
        name,
        overrides: toOverrides({ ...state, enabled }),
      };
      const { data } = await api.post('/automation/rules/parse-natural', payload);
      return data as { saved?: boolean; record?: { id?: string } };
    },
    onSuccess: async (data: { saved?: boolean; record?: { id?: string } }) => {
      if (data?.record?.id) {
        setLastSavedRuleId(String(data.record.id));
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['automation-rules'] }),
          qc.invalidateQueries({ queryKey: ['automation-rules-metrics'] }),
        ]);
      }
    },
    onError: (e) => pushToast(`Save failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const testRun = useMutation({
    mutationFn: async (sampleSize: number) => {
      // Ensure we have a saved draft rule
      let ruleId = lastSavedRuleId;
      if (!ruleId) {
        type SaveResult = { record?: { id?: string } } | { rule_summary?: { id?: string } };
        const res = (await parseAndSave.mutateAsync({ confirm: true, name: state.name || 'Draft rule', enabled: false })) as SaveResult;
        let createdId: string | undefined;
        if ('record' in res) createdId = res.record?.id;
        if (!createdId && 'rule_summary' in res) createdId = res.rule_summary?.id as string | undefined;
        ruleId = createdId ? String(createdId) : '';
        setLastSavedRuleId(ruleId || null);
      }
      if (!ruleId) throw new Error('Could not create a draft rule to test.');
      const { data } = await api.post<TestReport>(`/automation/rules/${ruleId}/test`, { sample_size: sampleSize });
      return data;
    },
    onError: (e) => pushToast(`Test failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const parseOnly = useMutation({
    mutationFn: async () => {
      const payload = { text: nlText, channel_id: channelId, confirm: false };
      const { data } = await api.post<ParseNaturalResponse>('/automation/rules/parse-natural', payload);
      return data;
    },
    onSuccess: (data) => {
      setParseData(data);
      if (data.parsed_rule) {
        const v = fromParsedToVisual(data.parsed_rule);
        setState(v);
        setJsonText(JSON.stringify(toOverrides(v), null, 2));
        setConfidence(estimateConfidence(data.parsed_rule));
        pushToast('Parsed natural language into a rule. You can edit below before saving.', 'success');
      } else {
        setConfidence(null);
        pushToast('Could not interpret the text; see examples below.', 'info');
      }
    },
    onError: (e) => pushToast(`Parse failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const onChangeKeywords = (v: string) => {
    const arr = v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setState((s) => ({ ...s, conditions: { ...s.conditions, keywords: arr } }));
  };

  const syncJsonFromVisual = () => setJsonText(JSON.stringify(toOverrides(state), null, 2));
  const applyJsonToVisual = () => {
    try {
      const data = JSON.parse(jsonText);
      const v: VisualRule = {
        name: state.name,
        enabled: Boolean(data.enabled ?? state.enabled),
        priority: Number(data.priority ?? state.priority) || 0,
        operator: (data.conditions?.operator as 'AND' | 'OR') || 'AND',
        conditions: {
          classification: data.conditions?.classification || '',
          keywords: data.conditions?.keywords || [],
          author_status: data.conditions?.author_status || 'any',
        },
        scope: { type: (data.scope?.type as VisualRule['scope']['type']) || 'all', values: data.scope?.values || [] },
        action: { type: (data.action?.type as VisualRule['action']['type']) || 'generate_response', config: data.action?.config || {} },
        require_approval: Boolean(data.require_approval ?? state.require_approval),
        response_limit_per_run: typeof data.response_limit_per_run === 'number' ? data.response_limit_per_run : '',
        timing: data.timing || { days: [], start: '', end: '' },
      };
      setState(v);
      pushToast('Applied JSON to visual editor', 'success');
    } catch {
      pushToast('Invalid JSON', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Natural language builder */}
      <Card>
        <CardHeader><CardTitle className="text-base">Describe your rule in natural language</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="e.g., When a comment is a question, reply helpfully within 2 sentences."
            value={nlText} onChange={(e) => setNlText(e.target.value)} />
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={() => parseOnly.mutate()} disabled={!nlText || parseOnly.isPending}>Parse</Button>
            {confidence !== null && (
              <div className="text-xs px-2 py-1 rounded border bg-green-50 border-green-200 text-green-900">Confidence: {Math.round(confidence * 100)}%</div>
            )}
          </div>
          {/* Example prompts */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Examples:</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setNlText(ex)} className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">
                  {ex}
                </button>
              ))}
            </div>
          </div>
          {parseData?.improvements?.length ? (
            <div className="text-xs text-muted-foreground">Suggestions: {parseData.improvements.join(' • ')}</div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Build automation rules visually or switch to JSON mode.</div>
        <div className="flex gap-2">
          <button onClick={() => { setMode('visual'); syncJsonFromVisual(); }} className={`text-sm px-3 py-1 rounded border ${mode === 'visual' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200'}`}>Visual</button>
          <button onClick={() => { setMode('json'); syncJsonFromVisual(); }} className={`text-sm px-3 py-1 rounded border ${mode === 'json' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200'}`}>JSON</button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1: Scope + Conditions */}
          <Card>
            <CardHeader><CardTitle className="text-base">Scope</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Rule name</Label>
                <Input placeholder="e.g., Positive replies" value={state.name} onChange={(e) => setState(s => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Scope</Label>
                <select className="border rounded px-2 py-1 w-full" value={state.scope.type} onChange={(e) => setState(s => ({ ...s, scope: { ...s.scope, type: e.target.value as VisualRule['scope']['type'] } }))}>
                  <option value="all">All videos</option>
                  <option value="videos">Specific videos</option>
                  <option value="categories">Categories</option>
                  <option value="new_uploads">New uploads</option>
                </select>
              </div>
              {(state.scope.type === 'videos' || state.scope.type === 'categories') && (
                <div className="space-y-1">
                  <Label>{state.scope.type === 'videos' ? 'Video IDs (comma separated)' : 'Categories (comma separated)'}</Label>
                  <Input placeholder={state.scope.type === 'videos' ? 'abc123, def456' : 'product, support'} value={(state.scope.values || []).join(', ')} onChange={(e) => setState(s => ({ ...s, scope: { ...s.scope, values: e.target.value.split(',').map(x => x.trim()).filter(Boolean) } }))} />
                </div>
              )}

              <div className="space-y-1">
                <Label>Match operator</Label>
                <select className="border rounded px-2 py-1 w-full" value={state.operator} onChange={(e) => setState(s => ({ ...s, operator: e.target.value as 'AND' | 'OR' }))}>
                  <option value="AND">AND (all conditions)</option>
                  <option value="OR">OR (any condition)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Classification</Label>
                <select className="border rounded px-2 py-1 w-full" value={state.conditions.classification} onChange={(e) => setState(s => ({ ...s, conditions: { ...s.conditions, classification: e.target.value } }))}>
                  <option value="">Any</option>
                  <option value="simple_positive">Simple positive</option>
                  <option value="question">Question</option>
                  <option value="negative">Negative</option>
                  <option value="spam">Spam</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Keywords (comma separated)</Label>
                <Input placeholder="e.g., price, shipping" value={(state.conditions.keywords || []).join(', ')} onChange={(e) => onChangeKeywords(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Author status</Label>
                <select className="border rounded px-2 py-1 w-full" value={state.conditions.author_status} onChange={(e) => setState(s => ({ ...s, conditions: { ...s.conditions, author_status: e.target.value as 'any'|'owner'|'subscriber'|'new' } }))}>
                  <option value="any">Any</option>
                  <option value="owner">Owner</option>
                  <option value="subscriber">Subscriber</option>
                  <option value="new">New</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Column 2: Action */}
          <Card>
            <CardHeader><CardTitle className="text-base">Action</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Action type</Label>
                <select className="border rounded px-2 py-1 w-full" value={state.action.type} onChange={(e) => setState(s => ({ ...s, action: { ...s.action, type: e.target.value as VisualRule['action']['type'] } }))}>
                  <option value="generate_response">Respond</option>
                  <option value="flag_for_review">Flag</option>
                  <option value="delete_comment">Delete</option>
                </select>
              </div>

              {state.action.type === 'generate_response' && (
                <div className="space-y-1">
                  <Label>Response template</Label>
                  <Textarea placeholder="Thanks for the comment!" value={String(state.action.config?.template || '')} onChange={(e) => setState(s => ({ ...s, action: { ...s.action, config: { ...(s.action.config || {}), template: e.target.value } } }))} />
                </div>
              )}

              {state.action.type === 'flag_for_review' && (
                <div className="space-y-1">
                  <Label>Flag label (optional)</Label>
                  <Input placeholder="e.g., needs human review" value={String(state.action.config?.label || '')} onChange={(e) => setState(s => ({ ...s, action: { ...s.action, config: { ...(s.action.config || {}), label: e.target.value } } }))} />
                </div>
              )}

              {state.action.type === 'delete_comment' && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Deletes are safety-gated. Consider enabling approvals.</div>
              )}

              <div className="flex items-center gap-2">
                <input id="require-approval" type="checkbox" checked={state.require_approval} onChange={(e) => setState(s => ({ ...s, require_approval: e.target.checked }))} />
                <Label htmlFor="require-approval">Requires approval</Label>
              </div>
            </CardContent>
          </Card>

          {/* Column 3: Limits & Scheduling */}
          <Card>
            <CardHeader><CardTitle className="text-base">Limits & Scheduling</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Max per run (optional)</Label>
                <Input type="number" min={1} placeholder="e.g., 10" value={state.response_limit_per_run === '' ? '' : String(state.response_limit_per_run)} onChange={(e) => setState(s => ({ ...s, response_limit_per_run: e.target.value === '' ? '' : Math.max(1, Number(e.target.value)) }))} />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Input type="number" min={0} value={state.priority} onChange={(e) => setState(s => ({ ...s, priority: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label>Schedule (optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Start HH:MM" value={state.timing?.start || ''} onChange={(e) => setState(s => ({ ...s, timing: { ...(s.timing || {}), start: e.target.value } }))} />
                  <Input placeholder="End HH:MM" value={state.timing?.end || ''} onChange={(e) => setState(s => ({ ...s, timing: { ...(s.timing || {}), end: e.target.value } }))} />
                </div>
                <Input placeholder="Days (comma separated, e.g., Mon,Fri)" value={(state.timing?.days || []).join(', ')} onChange={(e) => setState(s => ({ ...s, timing: { ...(s.timing || {}), days: e.target.value.split(',').map(x => x.trim()).filter(Boolean) } }))} />
              </div>
              <div className="flex items-center gap-2">
                <input id="enabled" type="checkbox" checked={state.enabled} onChange={(e) => setState(s => ({ ...s, enabled: e.target.checked }))} />
                <Label htmlFor="enabled">Enable on save</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Advanced JSON</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">Edit the rule config. Fields: conditions, action, limits, timing, scope, require_approval, response_limit_per_run, priority, enabled.</div>
            <Textarea className="min-h-[260px] font-mono" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={applyJsonToVisual}>Apply to Visual</Button>
              <Button variant="outline" onClick={syncJsonFromVisual}>Sync from Visual</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview & Actions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm p-3 rounded border bg-muted/30">{preview}</div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => parseAndSave.mutate({ confirm: true, name: state.name || 'Untitled rule', enabled: state.enabled })} disabled={parseAndSave.isPending || !state.name}>Save rule</Button>
            <Button variant="outline" onClick={() => testRun.mutate(50)} disabled={testRun.isPending}>Test (last 50)</Button>
          </div>

          {/* Test results */}
          {testRun.data && (
            <div className="mt-3 p-3 rounded border space-y-2 text-sm">
              <div className="font-medium">Dry-run results</div>
              <div>Tested: {testRun.data.tested_count}, Predicted matches: {testRun.data.predicted_matches}</div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(testRun.data.actions_breakdown || {}).map(([k, v]) => (
                  <div key={k} className="p-2 rounded border"><div className="text-xs text-muted-foreground">{k}</div><div className="text-sm font-medium">{String(v)}</div></div>
                ))}
              </div>
              {!!(testRun.data.issues?.length) && (
                <div>
                  <div className="text-xs text-muted-foreground">Issues</div>
                  <ul className="list-disc pl-5">
                    {testRun.data.issues.map((i, idx) => (<li key={idx}>{i}</li>))}
                  </ul>
                </div>
              )}
              {!!(testRun.data.suggestions?.length) && (
                <div>
                  <div className="text-xs text-muted-foreground">Suggestions</div>
                  <ul className="list-disc pl-5">
                    {testRun.data.suggestions.map((i, idx) => (<li key={idx}>{i}</li>))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const EXAMPLES: string[] = [
  'When a comment is a question, reply helpfully within 2 sentences.',
  'If comment mentions giveaway or free crypto, flag for review.',
  'Delete negative or insulting comments.'
];

function fromParsedToVisual(parsed: NonNullable<ParseNaturalResponse['parsed_rule']>): VisualRule {
  const conditions = parsed.conditions || {};
  const action = parsed.action || {};
  // Map minimal subset to visual model
  const v: VisualRule = {
    name: '',
    enabled: false,
    priority: 0,
    operator: (conditions.operator as 'AND'|'OR') || 'AND',
    conditions: {
      classification: (conditions.classification as string) || '',
      keywords: (conditions.keywords as string[] | undefined) || [],
      author_status: (conditions.author_status as 'any'|'owner'|'subscriber'|'new' | undefined) || 'any',
    },
    scope: { type: 'all' },
    action: { type: (action.type as VisualRule['action']['type']) || 'generate_response', config: action.config || {} },
    require_approval: Boolean(parsed.require_approval),
    response_limit_per_run: '',
    timing: { days: [], start: '', end: '' },
  };
  return v;
}

function estimateConfidence(parsed: NonNullable<ParseNaturalResponse['parsed_rule']>): number {
  let score = 0;
  const total = 5;
  if (parsed.conditions && (parsed.conditions.classification || (parsed.conditions.keywords && parsed.conditions.keywords.length))) score++;
  if (parsed.action && parsed.action.type) score++;
  if (parsed.require_approval !== undefined) score++;
  if (parsed.limits && Object.keys(parsed.limits).length) score++;
  if (parsed.timing && Object.keys(parsed.timing).length) score++;
  return Math.max(0, Math.min(1, score / total));
}
