'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

function WaitlistSuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  return (
    <div className="min-h-screen section-background py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="card-background shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-[var(--success)]" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary-dark">You&apos;re on the list!</CardTitle>
            <CardDescription className="text-secondary-dark">
              Thank you for joining the waiting list{email ? `, ${email}` : ''}. We’ll notify you early when access opens in the next couple of weeks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Button asChild className="w-full bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-white">
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function WaitlistSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WaitlistSuccessContent />
    </Suspense>
  );
}
