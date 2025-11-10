'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { pushToast } from '@/components/ui/toast';
import { ArrowLeft, ArrowRight, Check, Youtube, Instagram, Music2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

type Platform = 'youtube' | 'instagram' | 'tiktok';

interface PlatformInfo {
  enabled: boolean;
  email?: string;
  username?: string;
}

interface FormData {
  full_name: string;
  creator_name: string;
  platforms: Record<Platform, PlatformInfo>;
  follower_range: string;
  content_type: string;
  why_repruv: string;
  biggest_challenge: string;
  referral_source: string;
}

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'text-black dark:text-white' },
] as const;

const FOLLOWER_RANGES = [
  '0 - 10K',
  '10K - 50K',
  '50K - 100K',
  '100K - 500K',
  '500K - 1M',
  '1M+',
];

const REFERRAL_SOURCES = [
  'Social Media',
  'Search Engine',
  'Friend/Colleague',
  'YouTube/TikTok Video',
  'Blog/Article',
  'Event/Conference',
  'Other',
];

export default function CreatorApplicationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: user?.full_name || '',
    creator_name: '',
    platforms: {
      youtube: { enabled: false },
      instagram: { enabled: false },
      tiktok: { enabled: false },
    },
    follower_range: '',
    content_type: '',
    why_repruv: '',
    biggest_challenge: '',
    referral_source: '',
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updatePlatform = (platform: Platform, updates: Partial<PlatformInfo>) => {
    setFormData((prev) => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: {
          ...prev.platforms[platform],
          ...updates,
        },
      },
    }));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return formData.full_name.trim().length > 0 && formData.creator_name.trim().length > 0;
      case 2:
        const hasEnabledPlatform = Object.values(formData.platforms).some((p) => p.enabled);
        if (!hasEnabledPlatform) {
          pushToast('Please select at least one platform', 'error');
          return false;
        }
        // Check that enabled platforms have required info
        for (const [platform, info] of Object.entries(formData.platforms)) {
          if (info.enabled && !info.username?.trim()) {
            pushToast(`Please enter username for ${platform}`, 'error');
            return false;
          }
        }
        return formData.follower_range.length > 0;
      case 3:
        return (
          formData.content_type.trim().length > 0 &&
          formData.why_repruv.trim().length > 0 &&
          formData.biggest_challenge.trim().length > 0 &&
          formData.referral_source.length > 0
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      // Send formData directly - backend expects CreatorApplicationData schema
      await api.post('/onboarding/creator-application', formData);

      // Note: No need to call checkAuth() here - the backend updates the user state,
      // and the pending page will fetch the latest status when it mounts.
      // Calling checkAuth() here was causing loading issues during navigation.

      pushToast('Application submitted successfully!', 'success');
      router.push('/onboarding/pending');
    } catch (error: any) {
      console.error('Failed to submit application:', error);
      pushToast(
        error.response?.data?.detail || 'Failed to submit application. Please try again.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen section-background flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        className="max-w-3xl w-full"
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
          <h1 className="text-3xl font-extrabold text-primary-dark bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 bg-clip-text text-transparent">
            Creator Application
          </h1>
          <p className="mt-2 text-md text-secondary-dark">
            Tell us about yourself and your content creation journey
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    i <= step
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-400'
                  }`}
                >
                  {i < step ? <Check className="w-5 h-5" /> : i}
                </div>
                {i < 3 && (
                  <div
                    className={`w-full h-1 mx-2 transition-all ${
                      i < step ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{ width: '100px' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-secondary-dark px-1">
            <span>Basic Info</span>
            <span>Platforms</span>
            <span>About You</span>
          </div>
        </div>

        {/* Form Card */}
        <Card className="card-background">
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Information */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.full_name}
                      onChange={(e) => updateField('full_name', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="creator_name">Creator/Channel Name *</Label>
                    <Input
                      id="creator_name"
                      type="text"
                      placeholder="Your brand or channel name"
                      value={formData.creator_name}
                      onChange={(e) => updateField('creator_name', e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-secondary-dark mt-1">
                      The name you use for your content creation
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Platform Information */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <Label className="mb-4 block">Select Your Platforms *</Label>
                    <div className="space-y-4">
                      {PLATFORMS.map((platform) => (
                        <div
                          key={platform.id}
                          className={`border rounded-lg p-4 transition-all ${
                            formData.platforms[platform.id as Platform].enabled
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={platform.id}
                              checked={formData.platforms[platform.id as Platform].enabled}
                              onCheckedChange={(checked) =>
                                updatePlatform(platform.id as Platform, { enabled: !!checked })
                              }
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <platform.icon className={`w-5 h-5 ${platform.color}`} />
                                <Label htmlFor={platform.id} className="cursor-pointer">
                                  {platform.name}
                                </Label>
                              </div>

                              {formData.platforms[platform.id as Platform].enabled && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="space-y-3 mt-3"
                                >
                                  <div>
                                    <Label htmlFor={`${platform.id}_username`} className="text-sm">
                                      Username/Handle *
                                    </Label>
                                    <Input
                                      id={`${platform.id}_username`}
                                      type="text"
                                      placeholder={`@your${platform.id}handle`}
                                      value={
                                        formData.platforms[platform.id as Platform].username || ''
                                      }
                                      onChange={(e) =>
                                        updatePlatform(platform.id as Platform, {
                                          username: e.target.value,
                                        })
                                      }
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`${platform.id}_email`} className="text-sm">
                                      Account Email (Optional)
                                    </Label>
                                    <Input
                                      id={`${platform.id}_email`}
                                      type="email"
                                      placeholder="account@example.com"
                                      value={formData.platforms[platform.id as Platform].email || ''}
                                      onChange={(e) =>
                                        updatePlatform(platform.id as Platform, {
                                          email: e.target.value,
                                        })
                                      }
                                      className="mt-1"
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="follower_range">Total Follower Range *</Label>
                    <select
                      id="follower_range"
                      value={formData.follower_range}
                      onChange={(e) => updateField('follower_range', e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select range</option>
                      {FOLLOWER_RANGES.map((range) => (
                        <option key={range} value={range}>
                          {range}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-secondary-dark mt-1">
                      Combined followers across all platforms
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 3: About You */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="content_type">What type of content do you create? *</Label>
                    <Textarea
                      id="content_type"
                      placeholder="e.g., Gaming, Beauty, Tech Reviews, Vlogs, Educational content..."
                      value={formData.content_type}
                      onChange={(e) => updateField('content_type', e.target.value)}
                      className="mt-2"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-secondary-dark mt-1">
                      {formData.content_type.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="why_repruv">Why are you interested in Repruv? *</Label>
                    <Textarea
                      id="why_repruv"
                      placeholder="Tell us what drew you to Repruv and what you hope to achieve..."
                      value={formData.why_repruv}
                      onChange={(e) => updateField('why_repruv', e.target.value)}
                      className="mt-2"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-secondary-dark mt-1">
                      {formData.why_repruv.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="biggest_challenge">
                      What's your biggest challenge with managing comments? *
                    </Label>
                    <Textarea
                      id="biggest_challenge"
                      placeholder="e.g., Volume, spam, keeping up with engagement, maintaining tone..."
                      value={formData.biggest_challenge}
                      onChange={(e) => updateField('biggest_challenge', e.target.value)}
                      className="mt-2"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-secondary-dark mt-1">
                      {formData.biggest_challenge.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="referral_source">How did you hear about us? *</Label>
                    <select
                      id="referral_source"
                      value={formData.referral_source}
                      onChange={(e) => updateField('referral_source', e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select source</option>
                      {REFERRAL_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || isSubmitting}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white flex items-center gap-2"
                >
                  {isSubmitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Submit Application
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-secondary-dark mt-6">
          We'll review your application and get back to you within 1-2 business days.
        </p>
      </motion.div>
    </div>
  );
}
