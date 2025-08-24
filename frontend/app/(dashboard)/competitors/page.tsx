// frontend/app/(dashboard)/competitors/page.tsx
"use client";

import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Array<{ name: string; platform: string }>>([]);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('Google');

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-dark mb-8">Competitor Tracking</h1>
      {competitors.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No competitors added"
          description="Start tracking your competitors to benchmark your performance."
          action={{
            label: "Add Competitor",
            onClick: () => setCompetitors([{ name: 'Local Bistro', platform: 'Google' }])
          }}
        />
      ) : (
        <div className="space-y-6">
          <Card className="card-background border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-primary-dark">Add Competitor</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 items-center">
              <Input placeholder="Business or Creator name" value={name} onChange={(e) => setName(e.target.value)} className="w-64 card-background border-[var(--border)]" />
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm">
                {['Google','YouTube','Instagram','TikTok','Facebook','X/Twitter'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Button className="button-primary" onClick={() => { if (!name.trim()) return; setCompetitors([{ name, platform }, ...competitors]); setName(''); }}>Add</Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((c, idx) => (
              <Card key={idx} className="card-background border-[var(--border)]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-primary-dark font-medium">{c.name}</div>
                      <div className="text-xs text-secondary-dark">Platform: {c.platform}</div>
                    </div>
                    <Button variant="outline" className="border-[var(--border)]" onClick={() => setCompetitors(competitors.filter((_, i) => i !== idx))}>Remove</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}