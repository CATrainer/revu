'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Plus,
  Image,
  BarChart3,
  Users,
  Play,
  Heart,
  MessageSquare,
  TrendingUp,
  Globe,
  Mail,
  Instagram,
  Youtube,
  Loader2,
  Palette,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

interface MediaKitData {
  id?: string;
  creator_name: string;
  bio: string;
  tagline?: string;
  profile_image_url?: string;
  cover_image_url?: string;
  email?: string;
  website?: string;
  social_links: {
    platform: string;
    url: string;
    username: string;
    followers: number;
  }[];
  total_followers: number;
  avg_engagement_rate: number;
  avg_views: number;
  content_categories: string[];
  demographics: {
    age_ranges: { range: string; percentage: number }[];
    gender: { male: number; female: number; other: number };
    top_countries: { country: string; percentage: number }[];
  };
  featured_content: {
    title: string;
    thumbnail_url: string;
    platform: string;
    views: number;
    url: string;
  }[];
  brand_collaborations: string[];
  rate_card_url?: string;
  theme: 'modern' | 'classic' | 'bold' | 'minimal';
  accent_color: string;
}

interface MediaKitGeneratorProps {
  className?: string;
}

const themes = [
  { id: 'modern', name: 'Modern', description: 'Clean lines, gradient accents' },
  { id: 'classic', name: 'Classic', description: 'Traditional, professional' },
  { id: 'bold', name: 'Bold', description: 'High contrast, statement design' },
  { id: 'minimal', name: 'Minimal', description: 'Simple, elegant' },
];

const accentColors = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f97316', // Orange
  '#10b981', // Emerald
  '#0ea5e9', // Sky
];

export function MediaKitGenerator({ className }: MediaKitGeneratorProps) {
  const [mediaKit, setMediaKit] = useState<MediaKitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMediaKit();
  }, []);

  const loadMediaKit = async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/media-kit');
      setMediaKit(response.data);
    } catch (error) {
      console.error('Failed to load media kit:', error);
      // Initialize with defaults
      setMediaKit(getDefaultMediaKit());
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!mediaKit) return;

    try {
      setSaving(true);
      await api.put('/creator/media-kit', mediaKit);
      pushToast('Media kit saved!', 'success');
    } catch (error) {
      console.error('Failed to save:', error);
      pushToast('Failed to save media kit', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateFromProfile = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/creator/media-kit/generate');
      setMediaKit(response.data);
      pushToast('Media kit generated from your profile!', 'success');
    } catch (error) {
      console.error('Failed to generate:', error);
      // Use demo data
      setMediaKit(getDefaultMediaKit());
      pushToast('Using sample data - connect platforms for real data', 'info');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      pushToast('Preparing PDF...', 'info');
      const response = await api.get('/creator/media-kit/export', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'media-kit.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      pushToast('PDF downloaded!', 'success');
    } catch (error) {
      console.error('Failed to export:', error);
      pushToast('PDF export coming soon!', 'info');
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/creator/${mediaKit?.id || 'preview'}/media-kit`;
    await navigator.clipboard.writeText(link);
    pushToast('Link copied to clipboard!', 'success');
  };

  const updateMediaKit = (updates: Partial<MediaKitData>) => {
    if (mediaKit) {
      setMediaKit({ ...mediaKit, ...updates });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mediaKit) {
    return (
      <Card className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium">Create Your Media Kit</h3>
        <p className="text-muted-foreground mb-4">
          Generate a professional media kit to share with brands
        </p>
        <Button onClick={handleGenerateFromProfile}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate from Profile
        </Button>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Media Kit</h1>
          <p className="text-sm text-muted-foreground">
            Create a professional media kit to share with brands
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="customize">
            <Palette className="h-4 w-4 mr-2" />
            Customize
          </TabsTrigger>
        </TabsList>

        {/* Edit Tab */}
        <TabsContent value="edit" className="space-y-6 mt-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Creator Name</label>
                  <Input
                    value={mediaKit.creator_name}
                    onChange={(e) => updateMediaKit({ creator_name: e.target.value })}
                    placeholder="Your name or brand"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tagline</label>
                  <Input
                    value={mediaKit.tagline || ''}
                    onChange={(e) => updateMediaKit({ tagline: e.target.value })}
                    placeholder="e.g., 'Tech Reviews & Tutorials'"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={mediaKit.bio}
                  onChange={(e) => updateMediaKit({ bio: e.target.value })}
                  placeholder="Tell brands about yourself..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={mediaKit.email || ''}
                    onChange={(e) => updateMediaKit({ email: e.target.value })}
                    placeholder="business@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Website</label>
                  <Input
                    value={mediaKit.website || ''}
                    onChange={(e) => updateMediaKit({ website: e.target.value })}
                    placeholder="https://yoursite.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mediaKit.content_categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                  >
                    {cat}
                  </span>
                ))}
                <Button variant="outline" size="sm" className="rounded-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Previous Collaborations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Collaborations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mediaKit.brand_collaborations.map((brand, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm"
                  >
                    {brand}
                  </span>
                ))}
                <Button variant="outline" size="sm" className="rounded-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Brand
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Refresh Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Stats & Analytics</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically pulled from your connected platforms
                  </p>
                </div>
                <Button variant="outline" onClick={handleGenerateFromProfile} disabled={generating}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh Stats
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-6">
          <div
            ref={previewRef}
            className={cn(
              'max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden',
              mediaKit.theme === 'bold' && 'bg-gray-900 text-white'
            )}
            style={{ '--accent': mediaKit.accent_color } as React.CSSProperties}
          >
            {/* Header Section */}
            <div
              className="p-8 text-center"
              style={{ background: `linear-gradient(135deg, ${mediaKit.accent_color}20, ${mediaKit.accent_color}05)` }}
            >
              {mediaKit.profile_image_url ? (
                <img
                  src={mediaKit.profile_image_url}
                  alt={mediaKit.creator_name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white"
                  style={{ backgroundColor: mediaKit.accent_color }}
                >
                  {mediaKit.creator_name.charAt(0)}
                </div>
              )}
              <h1 className="text-3xl font-bold">{mediaKit.creator_name}</h1>
              {mediaKit.tagline && (
                <p className="text-lg text-muted-foreground mt-1">{mediaKit.tagline}</p>
              )}
              <p className="mt-4 max-w-xl mx-auto text-muted-foreground">{mediaKit.bio}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 p-8 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-5 w-5" style={{ color: mediaKit.accent_color }} />
                </div>
                <p className="text-2xl font-bold">{formatNumber(mediaKit.total_followers)}</p>
                <p className="text-sm text-muted-foreground">Total Followers</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Heart className="h-5 w-5" style={{ color: mediaKit.accent_color }} />
                </div>
                <p className="text-2xl font-bold">{mediaKit.avg_engagement_rate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Engagement Rate</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Play className="h-5 w-5" style={{ color: mediaKit.accent_color }} />
                </div>
                <p className="text-2xl font-bold">{formatNumber(mediaKit.avg_views)}</p>
                <p className="text-sm text-muted-foreground">Avg. Views</p>
              </div>
            </div>

            {/* Platforms */}
            <div className="p-8 border-t">
              <h2 className="text-xl font-bold mb-4">Platforms</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mediaKit.social_links.map((link, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/50 text-center">
                    {link.platform === 'YouTube' && <Youtube className="h-6 w-6 mx-auto mb-2 text-red-500" />}
                    {link.platform === 'Instagram' && <Instagram className="h-6 w-6 mx-auto mb-2 text-pink-500" />}
                    {link.platform === 'TikTok' && <Play className="h-6 w-6 mx-auto mb-2" />}
                    <p className="font-medium">{link.platform}</p>
                    <p className="text-sm text-muted-foreground">@{link.username}</p>
                    <p className="font-bold mt-1">{formatNumber(link.followers)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Demographics */}
            <div className="p-8 border-t">
              <h2 className="text-xl font-bold mb-4">Audience Demographics</h2>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-medium mb-3">Age Distribution</p>
                  <div className="space-y-2">
                    {mediaKit.demographics.age_ranges.map((age, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="w-16 text-sm">{age.range}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${age.percentage}%`,
                              backgroundColor: mediaKit.accent_color,
                            }}
                          />
                        </div>
                        <span className="w-12 text-sm text-right">{age.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-3">Top Countries</p>
                  <div className="space-y-2">
                    {mediaKit.demographics.top_countries.map((country, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="w-24 text-sm">{country.country}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${country.percentage}%`,
                              backgroundColor: mediaKit.accent_color,
                            }}
                          />
                        </div>
                        <span className="w-12 text-sm text-right">{country.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Content */}
            {mediaKit.featured_content.length > 0 && (
              <div className="p-8 border-t">
                <h2 className="text-xl font-bold mb-4">Featured Content</h2>
                <div className="grid grid-cols-3 gap-4">
                  {mediaKit.featured_content.map((content, idx) => (
                    <a
                      key={idx}
                      href={content.url}
                      target="_blank"
                      rel="noopener"
                      className="group relative aspect-video rounded-lg overflow-hidden bg-muted"
                    >
                      {content.thumbnail_url && (
                        <img
                          src={content.thumbnail_url}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-center p-2">
                          <p className="font-medium text-sm line-clamp-2">{content.title}</p>
                          <p className="text-xs mt-1">{formatNumber(content.views)} views</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div
              className="p-8 text-center"
              style={{ background: `linear-gradient(135deg, ${mediaKit.accent_color}10, ${mediaKit.accent_color}05)` }}
            >
              <h2 className="text-xl font-bold mb-4">Let's Work Together</h2>
              <div className="flex items-center justify-center gap-4">
                {mediaKit.email && (
                  <a
                    href={`mailto:${mediaKit.email}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-white"
                    style={{ backgroundColor: mediaKit.accent_color }}
                  >
                    <Mail className="h-4 w-4" />
                    {mediaKit.email}
                  </a>
                )}
                {mediaKit.website && (
                  <a
                    href={mediaKit.website}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 px-4 py-2 rounded-full border"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Customize Tab */}
        <TabsContent value="customize" className="mt-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Theme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => updateMediaKit({ theme: theme.id as MediaKitData['theme'] })}
                      className={cn(
                        'p-4 rounded-lg border-2 text-left transition-all',
                        mediaKit.theme === theme.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      )}
                    >
                      <p className="font-medium">{theme.name}</p>
                      <p className="text-sm text-muted-foreground">{theme.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accent Color</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateMediaKit({ accent_color: color })}
                      className={cn(
                        'w-12 h-12 rounded-full transition-all',
                        mediaKit.accent_color === color
                          ? 'ring-4 ring-offset-2 ring-primary'
                          : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium">Custom Color</label>
                  <Input
                    type="color"
                    value={mediaKit.accent_color}
                    onChange={(e) => updateMediaKit({ accent_color: e.target.value })}
                    className="h-10 w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getDefaultMediaKit(): MediaKitData {
  return {
    creator_name: 'Alex Creator',
    bio: 'Tech enthusiast sharing honest reviews, tutorials, and the latest in consumer electronics. Building a community of curious minds who love to learn about technology.',
    tagline: 'Tech Reviews & Tutorials',
    email: 'business@alexcreator.com',
    website: 'https://alexcreator.com',
    social_links: [
      { platform: 'YouTube', url: 'https://youtube.com/@alexcreator', username: 'alexcreator', followers: 250000 },
      { platform: 'Instagram', url: 'https://instagram.com/alexcreator', username: 'alexcreator', followers: 85000 },
      { platform: 'TikTok', url: 'https://tiktok.com/@alexcreator', username: 'alexcreator', followers: 150000 },
    ],
    total_followers: 485000,
    avg_engagement_rate: 5.2,
    avg_views: 45000,
    content_categories: ['Technology', 'Reviews', 'Tutorials', 'Lifestyle'],
    demographics: {
      age_ranges: [
        { range: '18-24', percentage: 35 },
        { range: '25-34', percentage: 40 },
        { range: '35-44', percentage: 18 },
        { range: '45+', percentage: 7 },
      ],
      gender: { male: 65, female: 33, other: 2 },
      top_countries: [
        { country: 'United States', percentage: 45 },
        { country: 'United Kingdom', percentage: 15 },
        { country: 'Canada', percentage: 12 },
        { country: 'Australia', percentage: 8 },
      ],
    },
    featured_content: [],
    brand_collaborations: ['Samsung', 'Anker', 'NordVPN', 'Skillshare'],
    theme: 'modern',
    accent_color: '#6366f1',
  };
}
