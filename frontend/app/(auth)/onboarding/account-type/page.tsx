'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Users, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { pushToast } from '@/components/ui/toast';

export default function AccountTypePage() {
  const router = useRouter();
  const { logout, checkAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinueAsCreator = async () => {
    setIsSubmitting(true);

    try {
      await api.post('/onboarding/account-type', { account_type: 'creator' });
      
      // Refresh user state to get updated account_type
      await checkAuth();
      
      // Redirect to creator application form
      router.push('/onboarding/creator-application');
    } catch (error) {
      console.error('Failed to set account type:', error);
      pushToast('Failed to continue. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

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
        className="max-w-xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6" aria-label="Repruv home">
            <div className="flex items-center justify-center">
              <Image src="/logo/text_light.png" alt="Repruv" width={180} height={48} className="h-12 w-auto dark:hidden" priority />
              <Image src="/logo/text_dark.png" alt="Repruv" width={180} height={48} className="h-12 w-auto hidden dark:inline" priority />
            </div>
          </Link>
          <h1 className="text-4xl font-extrabold text-primary-dark bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 bg-clip-text text-transparent">
            Welcome to Repruv!
          </h1>
          <p className="mt-3 text-lg text-secondary-dark max-w-2xl mx-auto">
            Let's get you set up as a content creator. We just need a few details to personalize your experience.
          </p>
        </div>

        {/* Creator Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className={`cursor-pointer transition-all duration-300 border-green-500 shadow-lg shadow-green-500/20`}
            onClick={() => !isSubmitting && handleContinueAsCreator()}
          >
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-primary-dark mb-3">
                Content Creator
              </h2>
              <p className="text-secondary-dark mb-6">
                Manage your social media presence and streamline comment engagement with AI-powered tools.
              </p>
              <ul className="text-left text-sm text-secondary-dark space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>AI-powered comment replies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Multi-platform support (YouTube, Instagram, TikTok)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Fan insights and analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Automated moderation</span>
                </li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Processing...'
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agency Link */}
        <div className="text-center mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-blue-800 dark:text-blue-300">Are you an agency?</span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
            Agencies have a separate signup process with instant access.
          </p>
          <Link 
            href="/signup/agency" 
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign up as an Agency →
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
