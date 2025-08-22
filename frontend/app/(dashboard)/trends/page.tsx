'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TrendsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Trends</h1>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Trending Now</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-[var(--border)]">
              <div className="text-sm text-secondary-dark">Audio</div>
              <div className="font-medium text-primary-dark">Trend #{i + 1}</div>
              <div className="text-xs text-green-600">+{(Math.random() * 1200 + 40).toFixed(0)}%</div>
              <Button size="sm" className="mt-2 button-primary">Try This</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Optimal Posting Times heatmap
        </div>
        <div className="h-64 card-background border-[var(--border)] rounded-lg flex items-center justify-center text-secondary-dark">
          Competitor Content Performance
        </div>
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Content Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-secondary-dark space-y-2">
            <li>Quick 30s reels focusing on behind-the-scenes prep</li>
            <li>Carousel: 5 mistakes when cooking steak</li>
            <li>Duet with rising creators in the same niche</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
