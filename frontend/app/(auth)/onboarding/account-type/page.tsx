'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Users, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { pushToast } from '@/components/ui/toast';

type AccountType = 'creator' | 'agency';

export default function AccountTypePage() {
  const router = useRouter();
  const { user, logout, checkAuth } = useAuth();
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectType = async (type: AccountType) => {
    setSelectedType(type);
    setIsSubmitting(true);

    try {
      await api.post('/onboarding/account-type', { account_type: type });
      
      // Refresh user state to get updated account_type
      await checkAuth();
      
      // Redirect to appropriate application form
      if (type === 'creator') {
        router.push('/onboarding/creator-application');
      } else {
        router.push('/onboarding/agency-application');
      }
    } catch (error) {
      console.error('Failed to set account type:', error);
      pushToast('Failed to set account type. Please try again.', 'error');
      setIsSubmitting(false);
      setSelectedType(null);
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
        className="max-w-4xl w-full"
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
            Let's get started by selecting your account type. This helps us tailor your experience.
          </p>
        </div>

        {/* Account Type Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Creator Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-300 ${
                selectedType === 'creator'
                  ? 'border-green-500 shadow-lg shadow-green-500/20'
                  : 'card-background hover:border-green-400'
              }`}
              onClick={() => !isSubmitting && handleSelectType('creator')}
            >
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-primary-dark mb-3">
                  Content Creator
                </h2>
                <p className="text-secondary-dark mb-6">
                  I'm an individual creator managing my own social media presence and looking to streamline comment engagement.
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
                  {isSubmitting && selectedType === 'creator' ? (
                    'Processing...'
                  ) : (
                    <>
                      Continue as Creator
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Agency Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-300 ${
                selectedType === 'agency'
                  ? 'border-green-500 shadow-lg shadow-green-500/20'
                  : 'card-background hover:border-green-400'
              }`}
              onClick={() => !isSubmitting && handleSelectType('agency')}
            >
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mb-4">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-primary-dark mb-3">
                  Agency / Manager
                </h2>
                <p className="text-secondary-dark mb-6">
                  I manage multiple creators or represent an agency and need to coordinate engagement across multiple accounts.
                </p>
                <ul className="text-left text-sm text-secondary-dark space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>Manage multiple creator accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>Team collaboration features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>Bulk onboarding and management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>Priority partner support</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting && selectedType === 'agency' ? (
                    'Processing...'
                  ) : (
                    <>
                      Continue as Agency
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-secondary-dark mt-6">
          Don't worry, you can always contact us to change your account type later.
        </p>
      </motion.div>
    </div>
  );
}
