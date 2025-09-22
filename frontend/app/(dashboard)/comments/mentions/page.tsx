'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function MentionsPage() {
  return (
    <div className="space-y-6 px-4 md:px-0">{/* Mobile padding */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">{/* Stack on mobile */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">@ Mentions</h1>
          <p className="mt-1 text-sm md:text-base text-secondary-dark">Track posts that mention your handle or brand and take action.</p>
        </div>
        <Link href="/comments" className="text-sm text-brand-primary hover:underline">Back to Interactions</Link>
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Mentions Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-secondary-dark">This section will aggregate mentions across platforms with filters for platform, sentiment, and priority. Selecting an item opens the full context and reply actions.</div>
          <div className="mt-4 text-xs text-secondary-dark">Coming soon</div>
        </CardContent>
      </Card>
    </div>
  );
}
