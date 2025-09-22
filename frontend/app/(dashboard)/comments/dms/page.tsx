// frontend/app/(dashboard)/comments/dms/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DMsPage() {
  return (
    <div className="space-y-6 px-4 md:px-0">{/* Mobile padding */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">{/* Stack on mobile */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Direct Messages</h1>
          <p className="mt-1 text-sm md:text-base text-secondary-dark">View, triage and respond to DMs from your connected platforms.</p>
        </div>
        <Link href="/comments" className="text-sm text-brand-primary hover:underline">Back to Interactions</Link>
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-secondary-dark">This section will list DM threads across platforms with filters for unread, assigned, priority and platform. Selecting a thread opens a conversation view on the right for replying.</div>
          <div className="mt-4">
            <Button variant="outline" className="border-[var(--border)] text-secondary-dark">Coming soon</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
