'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { pushToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Youtube,
  Instagram,
  Music2,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

interface FormData {
  agency_name: string;
  contact_name: string;
  contact_role: string;
  agency_website: string;
  creator_count: number;
  platforms: string[];
  avg_audience_size: string;
  partner_interest: 'yes' | 'maybe' | 'no' | '';
  biggest_challenge: string;
  required_features: string;
  creator_emails: string[];
  referral_source: string;
}

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'text-black dark:text-white' },
  { id: 'facebook', name: 'Facebook', icon: null, color: 'text-blue-600' },
  { id: 'twitter', name: 'Twitter/X', icon: null, color: 'text-blue-400' },
  { id: 'linkedin', name: 'LinkedIn', icon: null, color: 'text-blue-700' },
];

const AUDIENCE_RANGES = [
  '0 - 100K total',
  '100K - 500K total',
  '500K - 1M total',
  '1M - 5M total',
  '5M - 10M total',
  '10M+ total',
];

const CREATOR_RANGES = [
  { value: '1-5', label: '1-5 creators' },
  { value: '6-10', label: '6-10 creators' },
  { value: '11-25', label: '11-25 creators' },
  { value: '26-50', label: '26-50 creators' },
  { value: '51+', label: '51+ creators' },
];

const REFERRAL_SOURCES = [
  'Social Media',
  'Search Engine',
  'Industry Contact',
  'Creator Referral',
  'Event/Conference',
  'Partnership Outreach',
  'Other',
];

export default function AgencyApplicationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCreatorEmail, setNewCreatorEmail] = useState('');
  const [formData, setFormData] = useState<FormData>({
    agency_name: '',
    contact_name: user?.full_name || '',
    contact_role: '',
    agency_website: '',
    creator_count: 0,
    platforms: [],
    avg_audience_size: '',
    partner_interest: '',
    biggest_challenge: '',
    required_features: '',
    creator_emails: [],
    referral_source: '',
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const addCreatorEmail = () => {
    const email = newCreatorEmail.trim();
    if (!email) return;

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      pushToast('Please enter a valid email address', 'error');
      return;
    }

    if (formData.creator_emails.includes(email)) {
      pushToast('This email is already added', 'error');
      return;
    }

    if (formData.creator_emails.length >= 10) {
      pushToast('Maximum 10 creator emails allowed', 'error');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      creator_emails: [...prev.creator_emails, email],
    }));
    setNewCreatorEmail('');
  };

  const removeCreatorEmail = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      creator_emails: prev.creator_emails.filter((e) => e !== email),
    }));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.agency_name.trim()) {
          pushToast('Agency name is required', 'error');
          return false;
        }
        if (!formData.contact_name.trim()) {
          pushToast('Contact name is required', 'error');
          return false;
        }
        if (!formData.contact_role.trim()) {
          pushToast('Contact role is required', 'error');
          return false;
        }
        return true;
      case 2:
        if (formData.creator_count <= 0) {
          pushToast('Please enter the number of creators you manage', 'error');
          return false;
        }
        if (formData.platforms.length === 0) {
          pushToast('Please select at least one platform', 'error');
          return false;
        }
        if (!formData.avg_audience_size) {
          pushToast('Please select average audience size', 'error');
          return false;
        }
        return true;
      case 3:
        if (!formData.partner_interest) {
          pushToast('Please indicate partnership interest', 'error');
          return false;
        }
        if (!formData.biggest_challenge.trim()) {
          pushToast('Please describe your biggest challenge', 'error');
          return false;
        }
        if (!formData.required_features.trim()) {
          pushToast('Please describe required features', 'error');
          return false;
        }
        if (!formData.referral_source) {
          pushToast('Please tell us how you heard about Repruv', 'error');
          return false;
        }
        return true;
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
      // Send formData directly - backend expects AgencyApplicationData schema
      await api.post('/onboarding/agency-application', formData);

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
          <h1 className="text-3xl font-extrabold text-primary-dark bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 bg-clip-text text-transparent">
            Agency Partner Application
          </h1>
          <p className="mt-2 text-md text-secondary-dark">
            Tell us about your agency and the creators you represent
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
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-400'
                  }`}
                >
                  {i < step ? <Check className="w-5 h-5" /> : i}
                </div>
                {i < 3 && (
                  <div
                    className={`w-full h-1 mx-2 transition-all ${
                      i < step ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{ width: '100px' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-secondary-dark px-1">
            <span>Agency Info</span>
            <span>Portfolio</span>
            <span>Partnership</span>
          </div>
        </div>

        {/* Form Card */}
        <Card className="card-background">
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Agency Information */}
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
                    <Label htmlFor="agency_name">Agency Name *</Label>
                    <Input
                      id="agency_name"
                      type="text"
                      placeholder="Your agency or company name"
                      value={formData.agency_name}
                      onChange={(e) => updateField('agency_name', e.target.value)}
                      className="mt-2"
                      maxLength={150}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact_name">Contact Name *</Label>
                    <Input
                      id="contact_name"
                      type="text"
                      placeholder="Your full name"
                      value={formData.contact_name}
                      onChange={(e) => updateField('contact_name', e.target.value)}
                      className="mt-2"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact_role">Your Role *</Label>
                    <Input
                      id="contact_role"
                      type="text"
                      placeholder="e.g., Founder, Manager, Partnership Lead"
                      value={formData.contact_role}
                      onChange={(e) => updateField('contact_role', e.target.value)}
                      className="mt-2"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Label htmlFor="agency_website">Agency Website (Optional)</Label>
                    <Input
                      id="agency_website"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      value={formData.agency_website}
                      onChange={(e) => updateField('agency_website', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Portfolio Information */}
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
                    <Label htmlFor="creator_count">Number of Creators You Manage *</Label>
                    <Input
                      id="creator_count"
                      type="number"
                      min="1"
                      placeholder="e.g., 10"
                      value={formData.creator_count || ''}
                      onChange={(e) => updateField('creator_count', parseInt(e.target.value) || 0)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="mb-3 block">Platforms You Work With *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {PLATFORMS.map((platform) => (
                        <div
                          key={platform.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            formData.platforms.includes(platform.id)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                          }`}
                          onClick={() => togglePlatform(platform.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={platform.id}
                              checked={formData.platforms.includes(platform.id)}
                              onCheckedChange={() => togglePlatform(platform.id)}
                            />
                            {platform.icon && <platform.icon className={`w-4 h-4 ${platform.color}`} />}
                            <Label htmlFor={platform.id} className="cursor-pointer text-sm">
                              {platform.name}
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="avg_audience_size">Average Combined Audience Size *</Label>
                    <select
                      id="avg_audience_size"
                      value={formData.avg_audience_size}
                      onChange={(e) => updateField('avg_audience_size', e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select range</option>
                      {AUDIENCE_RANGES.map((range) => (
                        <option key={range} value={range}>
                          {range}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-secondary-dark mt-1">
                      Total followers across all creators you manage
                    </p>
                  </div>

                  <div>
                    <Label className="mb-2 block">Creator Emails (Optional, up to 10)</Label>
                    <div className="flex gap-2 mb-3">
                      <Input
                        type="email"
                        placeholder="creator@example.com"
                        value={newCreatorEmail}
                        onChange={(e) => setNewCreatorEmail(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCreatorEmail();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addCreatorEmail}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                    {formData.creator_emails.length > 0 && (
                      <div className="space-y-2">
                        {formData.creator_emails.map((email, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded"
                          >
                            <span className="text-sm">{email}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCreatorEmail(email)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-secondary-dark mt-2">
                      We may reach out to verify creator relationships
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Partnership Details */}
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
                    <Label className="mb-3 block">
                      Interested in becoming a preferred agency partner? *
                    </Label>
                    <div className="space-y-2">
                      {[
                        { value: 'yes', label: 'Yes, very interested!' },
                        { value: 'maybe', label: 'Maybe, tell me more' },
                        { value: 'no', label: 'Not at this time' },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            formData.partner_interest === option.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                          }`}
                          onClick={() =>
                            updateField('partner_interest', option.value as 'yes' | 'maybe' | 'no')
                          }
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="partner_interest"
                              value={option.value}
                              checked={formData.partner_interest === option.value}
                              onChange={() =>
                                updateField('partner_interest', option.value as 'yes' | 'maybe' | 'no')
                              }
                              className="w-4 h-4"
                            />
                            <Label className="cursor-pointer">{option.label}</Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="biggest_challenge">
                      What's your biggest challenge managing creators' comments? *
                    </Label>
                    <Textarea
                      id="biggest_challenge"
                      placeholder="Tell us about the challenges you face..."
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
                    <Label htmlFor="required_features">
                      What features are most important to your agency? *
                    </Label>
                    <Textarea
                      id="required_features"
                      placeholder="e.g., Bulk management, team collaboration, white-label options..."
                      value={formData.required_features}
                      onChange={(e) => updateField('required_features', e.target.value)}
                      className="mt-2"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-secondary-dark mt-1">
                      {formData.required_features.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="referral_source">How did you hear about Repruv? *</Label>
                    <select
                      id="referral_source"
                      value={formData.referral_source}
                      onChange={(e) => updateField('referral_source', e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white flex items-center gap-2"
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
          Our partnerships team will review your application and reach out within 1-2 business days.
        </p>
      </motion.div>
    </div>
  );
}
