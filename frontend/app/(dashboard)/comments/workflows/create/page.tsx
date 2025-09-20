'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WorkflowCondition, WorkflowAction } from '@/lib/api/workflows';

interface DraftWorkflow {
  name: string;
  trigger: {
    type: 'sentiment' | 'keyword' | 'platform' | 'mention_type' | 'volume_spike' | '';
    value?: string;
  };
  conditions: Array<{ field: string; op: string; value: string }>;
  actions: Array<
    | { type: 'tag'; config: { tag?: string } }
    | { type: 'assign'; config: { assignee?: string } }
    | { type: 'notify'; config: { channel?: 'email' | 'slack'; target?: string } }
    | { type: 'template_reply'; config: { template?: string } }
  >;
}
function ActionsBuilder({
  value,
  onChange,
}: {
  value: Array<
    | { type: 'tag'; config: { tag?: string } }
    | { type: 'assign'; config: { assignee?: string } }
    | { type: 'notify'; config: { channel?: 'email' | 'slack'; target?: string } }
    | { type: 'template_reply'; config: { template?: string } }
  >;
  onChange: (
    v: Array<
      | { type: 'tag'; config: { tag?: string } }
      | { type: 'assign'; config: { assignee?: string } }
      | { type: 'notify'; config: { channel?: 'email' | 'slack'; target?: string } }
      | { type: 'template_reply'; config: { template?: string } }
    >
  ) => void;
}) {
  const add = (t: 'tag' | 'assign' | 'notify' | 'template_reply') => {
    const base =
      t === 'tag'
        ? { type: 'tag', config: { tag: '' } as { tag?: string } }
        : t === 'assign'
        ? { type: 'assign', config: { assignee: '' } as { assignee?: string } }
        : t === 'notify'
        ? { type: 'notify', config: { channel: 'email' as 'email' | 'slack', target: '' } }
        : { type: 'template_reply', config: { template: '' } as { template?: string } };
    onChange([...(value || []), base as any]);
  };
  const update = (i: number, patch: any) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch } as any;
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark" onClick={() => add('tag')}>Add Tag</Button>
        <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark" onClick={() => add('assign')}>Add Assign</Button>
        <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark" onClick={() => add('notify')}>Add Notify</Button>
        <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark" onClick={() => add('template_reply')}>Add Template Reply</Button>
      </div>
      {(value || []).length === 0 ? (
        <div className="text-sm text-secondary-dark">No actions added yet.</div>
      ) : (
        <div className="space-y-2">
          {value.map((a, i) => (
            <div key={i} className="p-3 rounded-md border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-primary-dark">{a.type.replace('_', ' ')}</div>
                <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark" onClick={() => remove(i)}>Remove</Button>
              </div>
              {a.type === 'tag' && (
                <div className="space-y-2">
                  <label className="text-xs text-secondary-dark">Tag</label>
                  <Input placeholder="e.g., Needs Review" value={a.config.tag || ''} onChange={(e) => update(i, { config: { ...a.config, tag: e.target.value } })} />
                </div>
              )}
              {a.type === 'assign' && (
                <div className="space-y-2">
                  <label className="text-xs text-secondary-dark">Assignee</label>
                  <Input placeholder="e.g., @jane or team name" value={a.config.assignee || ''} onChange={(e) => update(i, { config: { ...a.config, assignee: e.target.value } })} />
                </div>
              )}
              {a.type === 'notify' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-secondary-dark">Channel</label>
                    <select className="rounded-md border border-[var(--border)] bg-background px-2 py-1 text-sm text-primary-dark" value={a.config.channel || 'email'} onChange={(e) => update(i, { config: { ...a.config, channel: e.target.value as 'email' | 'slack' } })}>
                      <option value="email">Email</option>
                      <option value="slack">Slack</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-secondary-dark">Target</label>
                    <Input placeholder="e.g., ops@brand.com or #alerts" value={a.config.target || ''} onChange={(e) => update(i, { config: { ...a.config, target: e.target.value } })} />
                  </div>
                </div>
              )}
              {a.type === 'template_reply' && (
                <div className="space-y-2">
                  <label className="text-xs text-secondary-dark">Template</label>
                  <Input placeholder="e.g., Pricing" value={a.config.template || ''} onChange={(e) => update(i, { config: { ...a.config, template: e.target.value } })} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const steps = ['Name', 'Trigger', 'Conditions', 'Actions', 'Review'] as const;

type Step = typeof steps[number];

export default function CreateWorkflowPage() {
  const [step, setStep] = useState<Step>('Name');
  const [draft, setDraft] = useState<DraftWorkflow>({
    name: '',
    trigger: { type: '' },
    conditions: [],
    actions: [],
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const canNext = () => {
    if (step === 'Name') return draft.name.trim().length > 0;
    if (step === 'Trigger') return draft.trigger.type !== '';
    return true;
  };

  const stepIndex = steps.indexOf(step);
  const next = () => setStep(steps[Math.min(steps.length - 1, stepIndex + 1)]);
  const prev = () => setStep(steps[Math.max(0, stepIndex - 1)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Create Workflow</h1>
          <p className="mt-1 text-secondary-dark">Step-by-step wizard. Actions remain open for now. Scoping not included.</p>
        </div>
        <Link href="/comments/workflows" className="text-sm text-brand-primary hover:underline">Back to Workflows</Link>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-xs">
        {steps.map((s) => (
          <div key={s} className={`px-2 py-1 rounded border ${s === step ? 'brand-background brand-text' : 'border-[var(--border)] text-secondary-dark'}`}>{s}</div>
        ))}
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">{step}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'Name' && (
            <div className="space-y-3">
              <label className="text-sm text-secondary-dark">Workflow name</label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g., Tag negative comments" />
              <div className="text-xs text-secondary-dark">Give your workflow a clear, descriptive name.</div>
            </div>
          )}

          {step === 'Trigger' && (
            <div className="space-y-4">
              <div className="text-sm text-secondary-dark">Choose what starts this workflow:</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(
                  [
                    { key: 'sentiment', label: 'Sentiment (e.g., Negative)' },
                    { key: 'keyword', label: 'Keyword (e.g., pricing)' },
                    { key: 'platform', label: 'Platform (e.g., YouTube)' },
                    { key: 'mention_type', label: 'Mention Type (@ mention)' },
                    { key: 'volume_spike', label: 'Volume Spike (e.g., 5x)' },
                  ] as Array<{ key: DraftWorkflow['trigger']['type']; label: string }>
                ).map((t) => (
                  <button
                    key={t.key}
                    className={`text-left rounded-md border px-3 py-2 ${draft.trigger.type === t.key ? 'border-primary' : 'border-[var(--border)] hover-background'}`}
                    onClick={() => setDraft({ ...draft, trigger: { type: t.key } })}
                  >
                    <div className="text-sm text-primary-dark font-medium">{t.label}</div>
                  </button>
                ))}
              </div>
              {draft.trigger.type === 'keyword' && (
                <div className="space-y-2">
                  <label className="text-sm text-secondary-dark">Keyword</label>
                  <Input placeholder="e.g., pricing" value={draft.trigger.value || ''} onChange={(e) => setDraft({ ...draft, trigger: { ...draft.trigger, value: e.target.value } })} />
                </div>
              )}
              {draft.trigger.type === 'platform' && (
                <div className="space-y-2">
                  <label className="text-sm text-secondary-dark">Platform</label>
                  <select className="rounded-md border border-[var(--border)] bg-background px-2 py-1 text-sm text-primary-dark" value={draft.trigger.value || ''} onChange={(e) => setDraft({ ...draft, trigger: { ...draft.trigger, value: e.target.value } })}>
                    <option value="">Select…</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">X/Twitter</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 'Conditions' && (
            <div className="space-y-3">
              <div className="text-sm text-secondary-dark">Optionally refine when this workflow should run:</div>
              <ConditionBuilder
                value={draft.conditions}
                onChange={(val) => setDraft({ ...draft, conditions: val })}
              />
            </div>
          )}

          {step === 'Actions' && (
            <div className="space-y-4">
              <div className="text-sm text-secondary-dark">Choose one or more actions to execute when the workflow triggers:</div>

              <ActionsBuilder
                value={draft.actions}
                onChange={(val) => setDraft({ ...draft, actions: val })}
              />

              <div className="text-xs text-secondary-dark">Supported now: Tag, Assign, Notify (email/Slack), Template Reply. You can add multiple actions.</div>
            </div>
          )}

          {step === 'Review' && (
            <div className="space-y-3 text-sm">
              <div><span className="text-secondary-dark">Name:</span> <span className="text-primary-dark font-medium">{draft.name || '—'}</span></div>
              <div><span className="text-secondary-dark">Trigger:</span> <span className="text-primary-dark font-medium">{draft.trigger.type || '—'}{draft.trigger.value ? ` → ${draft.trigger.value}` : ''}</span></div>
              <div>
                <div className="text-secondary-dark">Conditions:</div>
                {draft.conditions.length === 0 ? (
                  <div className="text-secondary-dark">—</div>
                ) : (
                  <ul className="list-disc pl-5">
                    {draft.conditions.map((c, i) => (<li key={i}>{c.field} {c.op} {c.value}</li>))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-secondary-dark">Actions:</div>
                {draft.actions.length === 0 ? (
                  <div className="text-secondary-dark">—</div>
                ) : (
                  <ul className="list-disc pl-5">
                    {draft.actions.map((a, i) => (
                      <li key={i}>
                        {a.type}
                        {a.type === 'tag' && a.config.tag ? ` → ${a.config.tag}` : ''}
                        {a.type === 'assign' && a.config.assignee ? ` → ${a.config.assignee}` : ''}
                        {a.type === 'notify' && (a.config.channel || a.config.target) ? ` → ${a.config.channel || ''} ${a.config.target || ''}` : ''}
                        {a.type === 'template_reply' && a.config.template ? ` → ${a.config.template}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="pt-2">
                <Button className="button-primary">Save Workflow</Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" className="border-[var(--border)] text-secondary-dark" disabled={step === 'Name'} onClick={prev}>Back</Button>
            <div className="text-xs text-secondary-dark">Step {stepIndex + 1} of {steps.length}</div>
            {step !== 'Review' ? (
              <Button className="button-primary" onClick={next} disabled={!canNext()}>Next</Button>
            ) : (
              <Button className="button-primary" disabled={saving} onClick={async () => {
                try {
                  setSaving(true);
                  const body = {
                    name: draft.name,
                    status: 'active' as const,
                    trigger: draft.trigger.type ? { type: draft.trigger.type, value: draft.trigger.value } : null,
                    conditions: draft.conditions as unknown as WorkflowCondition[],
                    actions: draft.actions as unknown as WorkflowAction[],
                  };
                  const { createWorkflow } = await import('@/lib/api/workflows');
                  await createWorkflow(body);
                  router.push('/comments/workflows/active');
                } catch (e) {
                  console.error(e);
                  alert('Failed to save workflow');
                } finally {
                  setSaving(false);
                }
              }}>Finish</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConditionBuilder({ value, onChange }: { value: Array<{ field: string; op: string; value: string }>; onChange: (v: Array<{ field: string; op: string; value: string }>) => void }) {
  const add = () => onChange([...(value || []), { field: 'platform', op: 'is', value: 'youtube' }]);
  const update = (i: number, patch: Partial<{ field: string; op: string; value: string }>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {(value || []).map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <select className="rounded-md border border-[var(--border)] bg-background px-2 py-1 text-sm text-primary-dark" value={c.field} onChange={(e) => update(i, { field: e.target.value })}>
            <option value="platform">Platform</option>
            <option value="channel">Channel</option>
            <option value="video">Video</option>
            <option value="time">Time of day</option>
            <option value="language">Language</option>
            <option value="sentiment">Sentiment</option>
            <option value="tags">Tags</option>
          </select>
          <select className="rounded-md border border-[var(--border)] bg-background px-2 py-1 text-sm text-primary-dark" value={c.op} onChange={(e) => update(i, { op: e.target.value })}>
            <option value="is">is</option>
            <option value="is_not">is not</option>
            <option value="contains">contains</option>
            <option value="not_contains">does not contain</option>
          </select>
          <Input className="w-48" placeholder="value" value={c.value} onChange={(e) => update(i, { value: e.target.value })} />
          <Button variant="outline" size="sm" className="border-[var(--border)] text-secondary-dark" onClick={() => remove(i)}>Remove</Button>
        </div>
      ))}
      <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark" onClick={add}>Add condition</Button>
    </div>
  );
}
