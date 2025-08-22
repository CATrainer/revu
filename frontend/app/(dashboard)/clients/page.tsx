'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAgencyClients } from '@/lib/demo-data';
import { Badge } from '@/components/ui/badge';

export default function ClientsPage() {
  const { currentWorkspace, interactions } = useStore();

  // Basic guard: only show for Agency; others get a friendly message
  const isAgency = currentWorkspace?.type === 'Agency';

  const clients = useMemo(() => getAgencyClients(), []);

  const metricsByClient = useMemo(() => {
    const map = new Map<string, { total: number; unread: number; needs: number; positive: number; negative: number }>();
    clients.forEach((c) => map.set(c, { total: 0, unread: 0, needs: 0, positive: 0, negative: 0 }));
    interactions
      .filter((i) => i.workspaceId === (currentWorkspace?.id || ''))
      .forEach((i) => {
        const match = /\(Client: ([^)]+)\)/.exec(i.content);
        const client = match?.[1];
        if (!client || !map.has(client)) return;
        const row = map.get(client)!;
        row.total += 1;
        if (i.status === 'Unread') row.unread += 1;
        if (i.status === 'Needs Response') row.needs += 1;
        if (i.sentiment === 'Positive') row.positive += 1;
        if (i.sentiment === 'Negative') row.negative += 1;
      });
    return map;
  }, [clients, interactions, currentWorkspace?.id]);

  if (!isAgency) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-primary-dark">Clients</h1>
        <Card className="card-background">
          <CardContent className="p-6 text-secondary-dark">
            This section is available for Agency workspaces. Switch to the Agency workspace from the selector to preview demo clients.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Clients</h1>
        <Button className="button-primary">Add Client</Button>
      </div>

      {/* Client summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {clients.map((c) => {
          const m = metricsByClient.get(c) || { total: 0, unread: 0, needs: 0, positive: 0, negative: 0 };
          return (
            <Card key={c} className="card-background">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-dark">{c}</h3>
                    <p className="text-sm text-secondary-dark">Last 90 days</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-dark">{m.total}</div>
                    <div className="text-xs text-secondary-dark">Interactions</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Badge variant="secondary">Unread: {m.unread}</Badge>
                  <Badge variant="secondary">Needs: {m.needs}</Badge>
                  <Badge variant="secondary">+ {m.positive}</Badge>
                  <Badge variant="secondary">- {m.negative}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <a href={`/engagement?client=${encodeURIComponent(c)}`} className="text-sm brand-text hover:underline">Open Engagement</a>
                  <a href={`/analytics?client=${encodeURIComponent(c)}`} className="text-sm text-secondary-dark hover:underline">Analytics</a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
