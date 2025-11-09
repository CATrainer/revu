'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Youtube, Instagram, TrendingUp, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { createProfile, ProfileData, autoDetectProfile, AutoDetectResult } from '@/lib/monetization-api';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDetect, setAutoDetect] = useState<AutoDetectResult | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    primary_platform: 'youtube',
    follower_count: 0,
    engagement_rate: 0,
    niche: '',
    platform_url: '',
    avg_content_views: undefined,
    content_frequency: undefined,
    time_available_hours_per_week: undefined
  });

  useEffect(() => {
    loadAutoDetect();
  }, []);

  const loadAutoDetect = async () => {
    try {
      setIsLoading(true);
      const result = await autoDetectProfile();
      setAutoDetect(result);
      
      // Pre-fill form with detected data
      setFormData({
        primary_platform: result.profile_data.primary_platform || 'youtube',
        follower_count: result.profile_data.follower_count || 0,
        engagement_rate: result.profile_data.engagement_rate || 0,
        niche: result.profile_data.niche || '',
        platform_url: result.profile_data.platform_url || '',
        avg_content_views: result.profile_data.avg_content_views,
        content_frequency: result.profile_data.content_frequency,
        time_available_hours_per_week: result.profile_data.time_available_hours_per_week
      });
      
      // If can auto-create, do it immediately
      if (result.can_auto_create) {
        await handleAutoCreate(result.profile_data as ProfileData);
      }
    } catch (err: any) {
      console.error('Failed to auto-detect:', err);
      setError(err.message || 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoCreate = async (data: ProfileData) => {
    try {
      setIsSubmitting(true);
      await createProfile(data);
      router.push('/monetization');
    } catch (err: any) {
      console.error('Auto-create failed:', err);
      setError(err.message || 'Failed to create profile');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Only validate fields that are shown (missing fields)
    const missingFields = autoDetect?.missing_fields || [];
    
    if (missingFields.includes('follower_count') && formData.follower_count < 1000) {
      setError('Follower count must be at least 1,000');
      return;
    }
    if (missingFields.includes('engagement_rate') && (formData.engagement_rate < 0.1 || formData.engagement_rate > 100)) {
      setError('Engagement rate must be between 0.1% and 100%');
      return;
    }
    if (missingFields.includes('niche') && !formData.niche.trim()) {
      setError('Please specify your niche');
      return;
    }

    setIsSubmitting(true);

    try {
      await createProfile(formData);
      router.push('/monetization');
    } catch (err: any) {
      console.error('Failed to create profile:', err);
      setError(err.message || 'Failed to create profile');
      setIsSubmitting(false);
    }
  };

  const platformIcons = {
    youtube: Youtube,
    instagram: Instagram,
    tiktok: TrendingUp,
    twitch: Users
  };

  const PlatformIcon = platformIcons[formData.primary_platform as keyof typeof platformIcons] || Sparkles;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="text-secondary-dark">Detecting your profile data...</p>
        </div>
      </div>
    );
  }

  // If auto-creating, show loading state
  if (isSubmitting && autoDetect?.can_auto_create) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <h2 className="text-2xl font-bold text-primary-dark">Profile Created!</h2>
          <p className="text-secondary-dark">Using data from {autoDetect.data_source}...</p>
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
        </div>
      </div>
    );
  }

  const missingFields = autoDetect?.missing_fields || [];
  const hasData = autoDetect?.data_source !== null;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950 mb-4">
            <PlatformIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-dark">
            {hasData ? 'Complete Your Profile' : 'Creator Profile Setup'}
          </h1>
          <p className="text-secondary-dark mt-2">
            {hasData 
              ? `We found data from ${autoDetect?.is_demo ? 'demo mode' : autoDetect?.data_source}. Just fill in the missing details.`
              : 'Tell us about your platform and audience to get personalized monetization opportunities'
            }
          </p>
        </div>

        {/* Data Source Alert */}
        {hasData && autoDetect?.data_source && (
          <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-900 dark:text-purple-100">
              {autoDetect.is_demo 
                ? 'Using demo data. Disable demo mode to use your real platform data.'
                : `Auto-filled from your ${autoDetect.data_source} connection.`
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="dashboard-card p-6 space-y-6">
          {/* Only show fields that are missing or allow editing */}
          {missingFields.includes('primary_platform') && (
            <div className="space-y-2">
              <Label htmlFor="platform">Primary Platform *</Label>
            <Select
              value={formData.primary_platform}
              onValueChange={(value) =>
                setFormData({ ...formData, primary_platform: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4" />
                    YouTube
                  </div>
                </SelectItem>
                <SelectItem value="instagram">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </div>
                </SelectItem>
                <SelectItem value="tiktok">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    TikTok
                  </div>
                </SelectItem>
                <SelectItem value="twitch">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Twitch
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            </div>
          )}

          {/* Follower Count */}
          {missingFields.includes('follower_count') && (
            <div className="space-y-2">
              <Label htmlFor="followers">Follower Count *</Label>
            <Input
              id="followers"
              type="number"
              min="1000"
              value={formData.follower_count || ''}
              onChange={(e) =>
                setFormData({ ...formData, follower_count: parseInt(e.target.value) || 0 })
              }
              placeholder="e.g., 50000"
              required
            />
            <p className="text-xs text-secondary-dark">
              Minimum 1,000 followers required
            </p>
            </div>
          )}

          {/* Engagement Rate */}
          {missingFields.includes('engagement_rate') && (
            <div className="space-y-2">
              <Label htmlFor="engagement">Engagement Rate (%) *</Label>
            <Input
              id="engagement"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              value={formData.engagement_rate || ''}
              onChange={(e) =>
                setFormData({ ...formData, engagement_rate: parseFloat(e.target.value) || 0 })
              }
              placeholder="e.g., 6.5"
              required
            />
            <p className="text-xs text-secondary-dark">
              Average likes/comments as % of followers
            </p>
            </div>
          )}

          {/* Niche - Always show since it's hard to auto-detect */}
          {missingFields.includes('niche') && (
            <div className="space-y-2">
              <Label htmlFor="niche">Niche/Category *</Label>
            <Input
              id="niche"
              value={formData.niche}
              onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
              placeholder="e.g., Gaming, Wellness, Tech, Fashion"
              required
            />
            </div>
          )}

          {/* Platform URL (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="url">Profile URL (Optional)</Label>
            <Input
              id="url"
              type="url"
              value={formData.platform_url}
              onChange={(e) => setFormData({ ...formData, platform_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="views">Avg Content Views (Optional)</Label>
              <Input
                id="views"
                type="number"
                min="0"
                value={formData.avg_content_views || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    avg_content_views: parseInt(e.target.value) || undefined
                  })
                }
                placeholder="e.g., 25000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Posts Per Week (Optional)</Label>
              <Input
                id="frequency"
                type="number"
                min="0"
                value={formData.content_frequency || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    content_frequency: parseInt(e.target.value) || undefined
                  })
                }
                placeholder="e.g., 3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time Available (hours/week) (Optional)</Label>
            <Input
              id="time"
              type="number"
              min="0"
              value={formData.time_available_hours_per_week || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  time_available_hours_per_week: parseInt(e.target.value) || undefined
                })
              }
              placeholder="e.g., 10"
            />
            <p className="text-xs text-secondary-dark">
              How many hours per week can you dedicate to monetization efforts?
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating Profile...
              </>
            ) : (
              missingFields.length > 0 
                ? 'Complete Setup & Continue'
                : 'Create Profile & Continue'
            )}
          </Button>
        </form>

        {/* Show what was auto-filled */}
        {hasData && missingFields.length > 0 && (
          <div className="dashboard-card p-4 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-secondary-dark mb-2">Auto-filled from {autoDetect?.data_source}:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {!missingFields.includes('primary_platform') && (
                <div><span className="text-secondary-dark">Platform:</span> <span className="font-medium">{formData.primary_platform}</span></div>
              )}
              {!missingFields.includes('follower_count') && formData.follower_count > 0 && (
                <div><span className="text-secondary-dark">Followers:</span> <span className="font-medium">{formData.follower_count.toLocaleString()}</span></div>
              )}
              {!missingFields.includes('engagement_rate') && formData.engagement_rate > 0 && (
                <div><span className="text-secondary-dark">Engagement:</span> <span className="font-medium">{formData.engagement_rate}%</span></div>
              )}
              {formData.avg_content_views && (
                <div><span className="text-secondary-dark">Avg Views:</span> <span className="font-medium">{formData.avg_content_views.toLocaleString()}</span></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
