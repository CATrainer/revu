"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Billing</h1>
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-primary-dark font-medium">Pro (Demo)</div>
            <div className="text-secondary-dark text-sm">$0.00 — demo only</div>
          </div>
          <Button className="button-primary">Update Payment Method</Button>
        </CardContent>
      </Card>
    </div>
  );
}
