"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Your Profile</h1>
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-dark">Coming soon. Manage your name, avatar, and preferences.</div>
        </CardContent>
      </Card>
    </div>
  );
}
