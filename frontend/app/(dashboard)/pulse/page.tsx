'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

export default function PulsePage() {
  const { interactions } = useStore();
  const { user } = useAuth();
  const [score, setScore] = useState(0);

  // Demo-data seeding removed; rely on real data when available

  const metrics = useMemo(() => {
    const last30 = interactions.filter((i) => Date.now() - +new Date(i.createdAt) < 30 * 86400_000);
    const total = last30.length || 1;
    const positive = last30.filter((i) => i.sentiment === 'Positive').length / total;
    const responseRate = 0.8; // demo
    const velocity = Math.min(1, total / 500);
    const crisis = last30.some((i) => i.priority === 'high' && i.sentiment === 'Negative') ? 0.3 : 0.9;
    const score = Math.round((positive * 0.4 + responseRate * 0.2 + velocity * 0.2 + crisis * 0.2) * 1000);
    return { score, last30 };
  }, [interactions]);

  useEffect(() => {
    let n = 0;
    const target = metrics.score;
    const id = setInterval(() => {
      n += Math.max(5, Math.round(target / 40));
      setScore(Math.min(target, n));
      if (n >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [metrics.score]);

  // build simple chart data
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dayStr = d.toISOString().slice(5, 10);
    const count = metrics.last30.filter((x) => new Date(x.createdAt).toDateString() === d.toDateString()).length;
    return { day: dayStr, count };
  });
  const sentimentOrder = ['Positive', 'Neutral', 'Mixed', 'Negative'] as const;
  const sentimentCounts = sentimentOrder.map((k) => ({ name: k, value: metrics.last30.filter(i => i.sentiment === k).length }));
  const platformCountsMap = metrics.last30.reduce<Record<string, number>>((acc, i) => { acc[i.platform] = (acc[i.platform] || 0) + 1; return acc; }, {});
  const platformCounts = Object.entries(platformCountsMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Pulse Monitor</h1>

  <Card className="card-background border-[var(--border)]">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
    <div className="text-sm text-secondary-dark">Reputation Score</div>
            <div className="text-5xl font-bold">{score}</div>
            <div className="text-xs text-green-600 flex items-center gap-2 mt-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Last updated: real-time
            </div>
          </div>
          <div className="text-sm text-secondary-dark">
    Composite score of key signals: response rate, sentiment balance, velocity, and crises.
          </div>
        </CardContent>
      </Card>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">AI Narrative: What people are saying</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ul className="list-disc pl-5 text-secondary-dark space-y-2">
            {user?.demo_access_type === 'creator' && (
              <>
                <li>Recent recipe short drove a spike in saves and positive comments</li>
                <li>Audience loves behind-the-scenes prep; consider a weekly series</li>
                <li>Minor concerns around audio levels on the last upload</li>
              </>
            )}
            {user?.demo_access_type === 'business' && (
              <>
                <li>Guests praise staff friendliness and ambience</li>
                <li>Delivery delays noted on weekends; opportunity to improve</li>
                <li>Google reviews trending upward after menu refresh</li>
              </>
            )}
            {user?.demo_access_type?.startsWith('agency_') && (
              <>
                <li>Top clients show improved response rates week-over-week</li>
                <li>Two clients have rising negative mentions — flagged for CS follow-up</li>
                <li>Creator vertical: trending audios increasing comment velocity</li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.last30.slice(0, 6).map((i) => (
            <div key={i.id} className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <div className="truncate pr-4 text-primary-dark">{i.content}</div>
              <Badge variant={i.sentiment === 'Negative' ? 'destructive' : 'default'}>
                {i.sentiment}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">30-day Activity</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days}>
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Sentiment</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentCounts} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {sentimentCounts.map((_, i) => (
                    <Cell key={i} fill={["#22c55e","#e5e7eb","#f59e0b","#ef4444"][i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-background border-[var(--border)]">
          <CardHeader><CardTitle className="text-primary-dark">Platforms</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformCounts}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
