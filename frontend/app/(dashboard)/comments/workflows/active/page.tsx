// frontend/app/(dashboard)/comments/workflows/active/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listWorkflows, activateWorkflow, pauseWorkflow, type WorkflowOut } from '@/lib/api/workflows';

export default function ActiveWorkflowsPage() {
  const [items, setItems] = useState<WorkflowOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listWorkflows();
      setItems(data);
      setError(null);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to load workflows';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (wf: WorkflowOut) => {
    // Optimistic
    setItems((prev) => prev.map((it) => it.id === wf.id ? { ...it, status: it.status === 'active' ? 'paused' : 'active' } : it));
    try {
      if (wf.status === 'active') await pauseWorkflow(wf.id);
      else await activateWorkflow(wf.id);
    } catch (e: unknown) {
      console.error(e);
      // Revert on failure
      setItems((prev) => prev.map((it) => it.id === wf.id ? { ...it, status: wf.status } : it));
      alert('Failed to toggle workflow');
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-0">{/* Mobile padding */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">{/* Stack on mobile */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Active Workflows</h1>
          <p className="mt-1 text-sm md:text-base text-secondary-dark">View, pause and resume workflows that are currently running.</p>
        </div>
        <Link href="/comments/workflows" className="text-sm text-brand-primary hover:underline">Back to Workflows</Link>
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Your active workflows</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-secondary-dark">Loading…</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-secondary-dark">No workflows yet. Create one to get started.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((wf) => (
                <div key={wf.id} className="rounded-md border border-[var(--border)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-primary-dark font-medium">{wf.name}</div>
                      {wf.description ? (
                        <div className="text-xs text-secondary-dark mt-1">{wf.description}</div>
                      ) : null}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ${
                      wf.status === 'active' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : wf.status === 'paused' ? 'text-amber-700 border-amber-200 bg-amber-50' : 'text-secondary-dark border-[var(--border)]'
                    }`}>{wf.status}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark" onClick={() => toggle(wf)}>{wf.status === 'active' ? 'Pause' : 'Resume'}</Button>
                    <Link href={`/comments/workflows/create`}><Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark">Edit</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Link href="/comments/workflows/create"><Button className="button-primary">Create Workflow</Button></Link>
            <Link href="/comments/workflows/approvals"><Button variant="outline" className="border-[var(--border)] text-secondary-dark">Go to Approvals</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
