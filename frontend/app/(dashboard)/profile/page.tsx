'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2, Save, User } from 'lucide-react';
import { pushToast } from '@/components/ui/toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    bio: (user as any)?.bio || '',
    location: (user as any)?.location || '',
    website: (user as any)?.website || '',
    avatar_url: (user as any)?.avatar_url || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Profile updated successfully - page will refresh with new data
      pushToast('Profile updated successfully', 'success');
      
      // Refresh page to get updated user data
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      pushToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      pushToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      pushToast('Image must be less than 5MB', 'error');
      return;
    }

    setUploadingPhoto(true);

    try {
      // Create FormData for upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      // Upload to backend
      const response = await fetch('/api/v1/users/avatar', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      
      // Update form data with new avatar URL
      setFormData(prev => ({ ...prev, avatar_url: data.avatar_url }));
      pushToast('Profile photo updated', 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      pushToast('Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your public profile information
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Photo */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>
              This photo will be displayed on your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                {formData.avatar_url ? (
                  <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                ) : (
                  <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-3xl">
                    {formData.full_name?.charAt(0) || <User className="h-16 w-16" />}
                  </AvatarFallback>
                )}
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                JPG, PNG or GIF
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Max size: 5MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                  placeholder="Your full name"
                />
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-slate-50 dark:bg-slate-800"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Brief description for your profile. Max 500 characters.
                </p>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="City, Country"
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, website: e.target.value }))
                  }
                  placeholder="https://yourwebsite.com"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Account Info (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>View your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Account Type
              </Label>
              <p className="text-sm text-slate-900 dark:text-slate-100 mt-1">
                {user?.user_kind === 'business' ? 'Business' : 'Content Creator'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Member Since
              </Label>
              <p className="text-sm text-slate-900 dark:text-slate-100 mt-1">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Account Status
              </Label>
              <p className="text-sm text-slate-900 dark:text-slate-100 mt-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
                  Active
                </span>
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                User ID
              </Label>
              <p className="text-sm text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {user?.id ? user.id.slice(0, 8) : 'N/A'}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
