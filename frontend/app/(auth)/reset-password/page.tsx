'use client';

import { Suspense } from 'react';
import { ResetPasswordForm } from './reset-password-form';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import Link from 'next/link';

function LoadingState() {
  return (
    <div className="min-h-screen section-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold brand-text">Revu</h1>
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-primary-dark">
            Loading...
          </h2>
        </div>
        
        <Card className="card-background">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}