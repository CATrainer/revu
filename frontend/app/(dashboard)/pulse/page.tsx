'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateAllDemoData } from '@/lib/demo-data';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';

export default function PulsePage() {
  const { interactions, setInteractions } = useStore();
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (interactions.length === 0) {
      const { interactions } = generateAllDemoData();
      setInteractions(interactions);
    }
  }, [interactions.length, setInteractions]);

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
            Sentiment (40%), Response Rate (20%), Engagement Velocity (20%), Crisis (20%)
          </div>
        </CardContent>
      </Card>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">AI Narrative: What people are saying</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ul className="list-disc pl-5 text-secondary-dark space-y-2">
            <li>Customers praise friendly staff and quick service</li>
            <li>Recent viral content driving positive engagement on TikTok</li>
            <li>Occasional complaints about delivery times during peak hours</li>
            <li>Competitor mentions are increasing in the last 7 days</li>
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

      {/* Charts placeholders (Recharts/wordcloud would go here) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Line chart (30-day trend)
        </div>
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Sentiment pie chart
        </div>
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Platform breakdown bar chart
        </div>
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Word cloud of trending topics
        </div>
      </div>
    </div>
  );
}
