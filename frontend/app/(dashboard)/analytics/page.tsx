"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { downloadSimpleAnalyticsPDF } from '@/lib/pdf-utils';
import { useStore } from '@/lib/store';
import { summarizeKPIs } from '@/lib/profile-config';

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const client = searchParams.get('client');
  const { currentWorkspace, interactions } = useStore();
  const scoped = useMemo(() => {
    let list = interactions;
    if (currentWorkspace) {
      list = list.filter(i => i.workspaceId === currentWorkspace.id || (currentWorkspace.id === 'agency' && i.workspaceId === 'agency'));
    }
    if (client) {
      const tag = `(Client: ${client})`.toLowerCase();
      list = list.filter(i => i.content.toLowerCase().includes(tag));
    }
    return list;
  }, [interactions, currentWorkspace, client]);
  const s = summarizeKPIs(scoped);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const rangeLabel = useMemo(() => (from && to ? `${from} → ${to}` : 'Custom'), [from, to]);

  const stats: Array<[string, string]> = [
    ['Total Interactions', String(s.total)],
    ['Response Rate', `${Math.round(s.responseRate * 100)}%`],
    ['Sentiment Score', `${Math.round(Math.max(0, s.sentimentScore) * 100)}%`],
    ['Unread', String(s.unread)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold text-primary-dark">Analytics{client ? ` — ${client}` : ''}</h1>
        <Button className="button-primary" onClick={() => downloadSimpleAnalyticsPDF({ range: rangeLabel, stats })}>Export PDF</Button>
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-sm text-secondary-dark">Date Range:</span>
          <Input type="date" className="w-44 card-background border-[var(--border)]" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-secondary-dark">to</span>
          <Input type="date" className="w-44 card-background border-[var(--border)]" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="ml-auto flex gap-2">
            {['Today','7 days','30 days'].map((p) => (
              <Button
                key={p}
                size="sm"
                variant="outline"
                className="border-[var(--border)]"
                onClick={() => {
                  const today = new Date();
                  const toStr = today.toISOString().slice(0, 10);
                  const fromStr = new Date(today.getTime() - (p === 'Today' ? 0 : p === '7 days' ? 6 : 29) * 24 * 3600 * 1000)
                    .toISOString()
                    .slice(0, 10);
                  setFrom(fromStr);
                  setTo(toStr);
                }}
              >
                {p}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {stats.map(([t,v]) => (
          <Card key={t as string} className="card-background border-[var(--border)]">
            <CardContent className="p-4">
              <div className="text-sm text-secondary-dark">{t}</div>
              <div className="text-2xl font-bold text-primary-dark">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Interactions over time (line)
        </div>
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Sentiment distribution (stacked bar)
        </div>
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Platform breakdown (donut)
        </div>
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Response time trend (area)
        </div>
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Custom report builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 border border-dashed border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
            Drag and drop metrics here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
