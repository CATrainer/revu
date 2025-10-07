// frontend/app/(dashboard)/interactions/workflows/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface WorkflowDraft {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  trigger: string;
  actions: string[];
}

export default function WorkflowsPage() {
  const [drafts] = useState<WorkflowDraft[]>([
    { id: 'wf_1', name: 'Tag negative comments', status: 'active', trigger: 'Sentiment: Negative', actions: ['Add tag: Needs Review'] },
    { id: 'wf_2', name: 'Auto-reply to FAQs', status: 'paused', trigger: 'Keyword: pricing', actions: ['Reply with template: Pricing'] },
  ]);

  return (
    <div className="space-y-6 px-4 md:px-0">{/* Mobile padding */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">{/* Stack on mobile */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Workflows</h1>
          <p className="mt-1 text-sm md:text-base text-secondary-dark">Design and automate interaction handling. This is a fresh redesign replacing legacy Automations.</p>
        </div>
        <Link href="/interactions" className="text-sm text-brand-primary hover:underline">Back to Interactions</Link>
      </div>

      {/* Entry widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/interactions/workflows/active" className="block rounded-md border border-[var(--border)] hover-background">
          <Card className="card-background border-0">
            <CardHeader>
              <CardTitle className="text-primary-dark">Active Workflows</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-secondary-dark">View, pause, or resume workflows currently running.</CardContent>
          </Card>
        </Link>
        <Link href="/interactions/workflows/approvals" className="block rounded-md border border-[var(--border)] hover-background">
          <Card className="card-background border-0">
            <CardHeader>
              <CardTitle className="text-primary-dark">Approvals</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-secondary-dark">Review pending items requiring manual approval.</CardContent>
          </Card>
        </Link>
        <Link href="/interactions/workflows/create" className="block rounded-md border border-[var(--border)] hover-background">
          <Card className="card-background border-0">
            <CardHeader>
              <CardTitle className="text-primary-dark">Create Workflow</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-secondary-dark">Launch the step-by-step wizard to build a new workflow.</CardContent>
          </Card>
        </Link>
      </div>

      {/* Getting started */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Get started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-background border-[var(--border)]">
              <CardHeader><CardTitle className="text-sm text-primary-dark">1. Choose a trigger</CardTitle></CardHeader>
              <CardContent className="text-sm text-secondary-dark">Sentiment, keywords, platform, mention type, author reputation, or volume spikes.</CardContent>
            </Card>
            <Card className="card-background border-[var(--border)]">
              <CardHeader><CardTitle className="text-sm text-primary-dark">2. Add conditions</CardTitle></CardHeader>
              <CardContent className="text-sm text-secondary-dark">Refine with filters like channel, video, time of day, follower count, or language.</CardContent>
            </Card>
            <Card className="card-background border-[var(--border)]">
              <CardHeader><CardTitle className="text-sm text-primary-dark">3. Define actions</CardTitle></CardHeader>
              <CardContent className="text-sm text-secondary-dark">Tag, assign, notify, auto-reply (with templates/AI), pause/hold, or escalate.</CardContent>
            </Card>
          </div>
          <div className="mt-4">
            <Link href="/interactions/workflows/create">
              <Button className="button-primary">Create Workflow</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Existing workflows */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Your workflows</CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <div className="text-sm text-secondary-dark">No workflows yet. Click &quot;Create Workflow&quot; to get started.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((wf) => (
                <div key={wf.id} className="rounded-md border border-[var(--border)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-primary-dark font-medium">{wf.name}</div>
                      <div className="text-xs text-secondary-dark mt-1">Trigger: {wf.trigger}</div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ${
                      wf.status === 'active' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : wf.status === 'paused' ? 'text-amber-700 border-amber-200 bg-amber-50' : 'text-secondary-dark border-[var(--border)]'
                    }`}>{wf.status}</span>
                  </div>
                  <div className="mt-3 text-xs text-secondary-dark">Actions: {wf.actions.join(', ')}</div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark">Edit</Button>
                    <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark">Duplicate</Button>
                    <Button size="sm" variant="destructive">Delete</Button>
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
