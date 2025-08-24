'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function TrendsPage() {
  const { interactions, currentWorkspace } = useStore();
  const scoped = useMemo(() => {
    let list = interactions.filter(i => i.kind === 'comment' || i.kind === 'review');
    if (currentWorkspace) {
      list = list.filter(i => i.workspaceId === currentWorkspace.id || (currentWorkspace.id === 'agency' && i.workspaceId === 'agency'));
    }
    return list;
  }, [interactions, currentWorkspace]);

  // 30-day trend
  const byDay = useMemo(() => Array.from({ length: 30 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - idx));
    const key = d.toDateString();
    const count = scoped.filter(i => new Date(i.createdAt).toDateString() === key).length;
    return { day: d.toISOString().slice(5,10), count };
  }), [scoped]);

  // Optimal hours heat-like bars: counts per hour over last 14 days
  const byHour = useMemo(() => {
    const hours = Array.from({ length: 24 }).map((_, h) => {
      const count = scoped.filter(i => (Date.now() - +new Date(i.createdAt)) < 14*86400_000 && new Date(i.createdAt).getHours() === h).length;
      return { hour: `${h}:00`, count };
    });
    return hours;
  }, [scoped]);

  // Simple topic extraction: top words in comments (very naive)
  const topics = useMemo(() => {
    const freq: Record<string, number> = {};
    scoped.forEach(i => {
      const words = i.content.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(w => w.length > 3 && !['with','from','that','this','have','your','they','just','like','really','there','about','were','been','what','when','will'].includes(w));
      words.slice(0, 12).forEach(w => { freq[w] = (freq[w]||0)+1; });
    });
    return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [scoped]);

  const colors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#14b8a6','#a78bfa','#f97316','#10b981','#3b82f6','#eab308'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Trends</h1>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Trending Now</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Viral audio: summer vibes','Behind-the-scenes prep','Quick tips: air fryer'].map((title, i) => (
            <div key={i} className="p-4 rounded-lg border border-[var(--border)]">
              <div className="text-sm text-secondary-dark">Idea</div>
              <div className="font-medium text-primary-dark">{title}</div>
              <div className="text-xs text-green-600">+{(800 + i*120)}% momentum</div>
              <Button size="sm" className="mt-2 button-primary">Try This</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">30-day Mentions</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay}><XAxis dataKey="day"/><YAxis/><Tooltip/><Line dataKey="count" stroke="#6366f1" /></LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Best Hours (last 14 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour}><XAxis dataKey="hour" hide/><YAxis hide/><Tooltip/><Bar dataKey="count" fill="#22c55e"/></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Top Topics</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topics} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {topics.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Content Opportunities</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-secondary-dark space-y-2">
              <li>Quick 30s reels focusing on behind-the-scenes prep</li>
              <li>Carousel: 5 mistakes when cooking steak</li>
              <li>Duet with rising creators in the same niche</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
