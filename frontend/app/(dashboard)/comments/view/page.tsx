'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ViewInteractionsPage() {
  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">View Interactions</h1>
        <p className="text-sm md:text-base text-secondary-dark">Choose what you want to manage right now.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/comments/dms" className="block rounded-md border border-[var(--border)] hover-background">
          <Card className="card-background border-0">
            <CardHeader>
              <CardTitle className="text-primary-dark">Direct Messages</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-secondary-dark">
              View conversations across connected platforms in one inbox.
            </CardContent>
          </Card>
        </Link>

        <Link href="/comments" className="block rounded-md border border-[var(--border)] hover-background">
          <Card className="card-background border-0">
            <CardHeader>
              <CardTitle className="text-primary-dark">Comments</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-secondary-dark">
              Monitor and reply to public comments. Switch between feed and by-video.
            </CardContent>
          </Card>
        </Link>

        <Link href="/comments/mentions" className="block rounded-md border border-[var(--border)] hover-background">
          <Card className="card-background border-0">
            <CardHeader>
              <CardTitle className="text-primary-dark">@ Mentions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-secondary-dark">
              Track mentions of your handle or brand and take action.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
