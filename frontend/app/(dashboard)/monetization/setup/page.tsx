'use client';

import { useState } from 'react';
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
import { Loader2, Youtube, Instagram, TrendingUp, Users } from 'lucide-react';
import { createProfile, ProfileData } from '@/lib/monetization-api';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.follower_count < 1000) {
      setError('Follower count must be at least 1,000');
      return;
    }
    if (formData.engagement_rate < 0.1 || formData.engagement_rate > 100) {
      setError('Engagement rate must be between 0.1% and 100%');
      return;
    }
    if (!formData.niche.trim()) {
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

  const PlatformIcon = platformIcons[formData.primary_platform];

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950 mb-4">
            <PlatformIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-dark">
            Creator Profile Setup
          </h1>
          <p className="text-secondary-dark mt-2">
            Tell us about your platform and audience to get personalized monetization opportunities
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="dashboard-card p-6 space-y-6">
          {/* Platform */}
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

          {/* Follower Count */}
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

          {/* Engagement Rate */}
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

          {/* Niche */}
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
              'Create Profile & Continue'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
