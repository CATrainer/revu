'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Clock, Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

interface OnboardingStatus {
  account_type: 'creator' | 'agency' | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  application_submitted: boolean;
  application_submitted_at: string | null;
  rejection_reason: string | null;
}

export default function PendingPage() {
  const router = useRouter();
  const { user, logout, checkAuth } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/onboarding/status');
        setStatus(response.data);

        // If approved, redirect to dashboard
        if (response.data.approval_status === 'approved') {
          await checkAuth();
          router.push('/dashboard');
        }
        // If rejected, redirect to rejected page
        else if (response.data.approval_status === 'rejected') {
          router.push('/onboarding/rejected');
        }
      } catch (error) {
        console.error('Failed to fetch onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();

    // Poll every 30 seconds to check for status updates
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [router, checkAuth]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen section-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-green-500" />
          <p className="text-secondary-dark">Loading your application status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen section-background flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="absolute top-4 left-4">
        <Button
          variant="outline"
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
          className="flex items-center gap-2"
        >
          Log out
        </Button>
      </div>

      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6" aria-label="Repruv home">
            <div className="flex items-center justify-center">
              <Image
                src="/logo/text_light.png"
                alt="Repruv"
                width={180}
                height={48}
                className="h-12 w-auto dark:hidden"
                priority
              />
              <Image
                src="/logo/text_dark.png"
                alt="Repruv"
                width={180}
                height={48}
                className="h-12 w-auto hidden dark:inline"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Status Card */}
        <Card className="card-background">
          <CardContent className="p-8 text-center">
            {/* Animated Icon */}
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-6"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Clock className="w-10 h-10 text-white" />
            </motion.div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold text-primary-dark mb-3">
              Application Under Review
            </h1>

            {/* Description */}
            <p className="text-lg text-secondary-dark mb-6">
              Thank you for submitting your {status?.account_type || 'creator'} application! Our team
              is currently reviewing your information.
            </p>

            {/* Timeline */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 mb-8">
              <div className="space-y-4">
                {/* Submitted */}
                <div className="flex items-start gap-3 text-left">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-primary-dark">Application Submitted</p>
                    {status?.application_submitted_at && (
                      <p className="text-sm text-secondary-dark">
                        {formatDate(status.application_submitted_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Under Review */}
                <div className="flex items-start gap-3 text-left">
                  <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-medium text-primary-dark">Under Review</p>
                    <p className="text-sm text-secondary-dark">
                      Our team is reviewing your application
                    </p>
                  </div>
                </div>

                {/* Decision Pending */}
                <div className="flex items-start gap-3 text-left opacity-50">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-primary-dark">Decision</p>
                    <p className="text-sm text-secondary-dark">You'll receive an email notification</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3 text-left">
                <Mail className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-primary-dark mb-2">What's Next?</h3>
                  <ul className="text-sm text-secondary-dark space-y-2">
                    <li>
                      • We'll review your application within <strong>1-2 business days</strong>
                    </li>
                    <li>
                      • You'll receive an email at <strong>{user?.email}</strong> with our decision
                    </li>
                    <li>• This page will automatically update when your application is processed</li>
                    <li>• If approved, you'll get instant access to your dashboard</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <p className="text-sm text-secondary-dark">
                Have questions? Email us at{' '}
                <a
                  href="mailto:support@repruv.com"
                  className="text-green-600 hover:text-green-700 underline"
                >
                  support@repruv.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auto-refresh Notice */}
        <p className="text-center text-xs text-secondary-dark mt-4">
          This page automatically checks for updates every 30 seconds
        </p>
      </motion.div>
    </div>
  );
}
