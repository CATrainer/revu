// frontend/app/(dashboard)/dashboard/page.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import ConnectButton from '@/components/youtube/ConnectButton';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Home</h1>
        <p className="mt-2 text-secondary-dark">Connect your social accounts to get started.</p>
      </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="dashboard-card hover-raise card-hover elevated">
          <CardHeader>
            <CardTitle className="text-primary-dark">Connect YouTube</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <ConnectButton />
              <Link href="/comments" className="text-sm underline">Open comments</Link>
            </div>
          </CardContent>
        </Card>
        <Card className="dashboard-card hover-raise card-hover elevated">
          <CardHeader>
            <CardTitle className="text-primary-dark">Connect Instagram</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/settings?tab=Integrations" className="text-sm underline">Go to integrations</Link>
          </CardContent>
        </Card>
        <Card className="dashboard-card hover-raise card-hover elevated">
          <CardHeader>
            <CardTitle className="text-primary-dark">Connect TikTok</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/settings?tab=Integrations" className="text-sm underline">Go to integrations</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}