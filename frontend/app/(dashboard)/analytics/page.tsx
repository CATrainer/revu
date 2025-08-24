"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { downloadSimpleAnalyticsPDF } from '@/lib/pdf-utils';
import { useStore } from '@/lib/store';
import { summarizeKPIs } from '@/lib/profile-config';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

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
    ['Reputation Score', `${Math.round(Math.max(0, s.sentimentScore) * 1000)}`],
    ['Unread', String(s.unread)],
  ];

  // Chart data
  const byDay = useMemo(() => {
    const days = Array.from({ length: 30 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - idx));
      const key = d.toDateString();
      const count = scoped.filter(i => new Date(i.createdAt).toDateString() === key).length;
      const responded = scoped.filter(i => new Date(i.createdAt).toDateString() === key && i.status === 'Responded').length;
      return { day: d.toISOString().slice(5, 10), total: count, responded };
    });
    return days;
  }, [scoped]);
  const sentiments = useMemo(() => {
    const order = ['Positive','Neutral','Mixed','Negative'] as const;
    return order.map(name => ({ name, value: scoped.filter(i => i.sentiment === name).length }));
  }, [scoped]);
  const platforms = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    scoped.forEach(i => { map[i.platform] = map[i.platform] || { name: i.platform, value: 0 }; map[i.platform].value++; });
    return Object.values(map);
  }, [scoped]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold text-primary-dark">Analytics{client ? ` — ${client}` : ''}</h1>
  <Button className="button-primary" data-tour="export-report" onClick={() => { downloadSimpleAnalyticsPDF({ range: rangeLabel, stats }); try { useStore.getState().setTour({ step: 4 }); } catch {} }}>Export PDF</Button>
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

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Interactions over time</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={byDay}><XAxis dataKey="day"/><YAxis/><Tooltip/><Legend/><Line dataKey="total" stroke="#6366f1" /><Line dataKey="responded" stroke="#22c55e" /></LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Sentiment distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={sentiments}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#8b5cf6"/></BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Platform breakdown</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={platforms} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>{platforms.map((_, i) => <Cell key={i} fill={["#6366f1","#22c55e","#f59e0b","#ef4444","#14b8a6","#a78bfa"][i % 6]} />)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Response volume</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={byDay}><XAxis dataKey="day"/><YAxis/><Tooltip/><Area dataKey="responded" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2}/></AreaChart></ResponsiveContainer>
          </CardContent>
        </Card>
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
