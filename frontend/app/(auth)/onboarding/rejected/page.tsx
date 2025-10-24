'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { XCircle, Mail, RefreshCw, Loader2 } from 'lucide-react';
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

export default function RejectedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/onboarding/status');
        setStatus(response.data);

        // If somehow the status changed, redirect appropriately
        if (response.data.approval_status === 'approved') {
          router.push('/dashboard');
        } else if (response.data.approval_status === 'pending') {
          router.push('/onboarding/pending');
        }
      } catch (error) {
        console.error('Failed to fetch onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [router]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen section-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-red-500" />
          <p className="text-secondary-dark">Loading application status...</p>
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
        <Card className="card-background border-red-200 dark:border-red-800">
          <CardContent className="p-8 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 mb-6">
              <XCircle className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold text-primary-dark mb-3">
              Application Not Approved
            </h1>

            {/* Description */}
            <p className="text-lg text-secondary-dark mb-6">
              Thank you for your interest in Repruv. Unfortunately, we're unable to approve your
              application at this time.
            </p>

            {/* Rejection Reason (if provided) */}
            {status?.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-primary-dark mb-2 text-left">
                  Reason for Decision
                </h3>
                <p className="text-secondary-dark text-left whitespace-pre-wrap">
                  {status.rejection_reason}
                </p>
              </div>
            )}

            {/* What You Can Do */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3 text-left">
                <RefreshCw className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-primary-dark mb-2">What You Can Do</h3>
                  <ul className="text-sm text-secondary-dark space-y-2">
                    <li>
                      • <strong>Reapply later:</strong> We review our criteria regularly. You're
                      welcome to reapply in the future.
                    </li>
                    <li>
                      • <strong>Questions?</strong> Email us at support@repruv.com to discuss your
                      application.
                    </li>
                    <li>
                      • <strong>Stay updated:</strong> Follow us on social media to learn about new
                      opportunities and updates.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3 text-left">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-primary-dark mb-2">Need More Information?</h3>
                  <p className="text-sm text-secondary-dark mb-3">
                    If you have questions about this decision or would like to discuss your
                    application, please reach out to our team.
                  </p>
                  <Button
                    onClick={() => (window.location.href = 'mailto:support@repruv.com')}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>

            {/* Alternative Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="flex items-center gap-2"
              >
                Return to Homepage
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
                className="flex items-center gap-2"
              >
                Log Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-xs text-secondary-dark mt-6">
          We appreciate your interest in Repruv and wish you success in your content creation
          journey.
        </p>
      </motion.div>
    </div>
  );
}
