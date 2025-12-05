'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Info,
  Copy,
  Download,
  RefreshCw,
  Loader2,
  Youtube,
  Instagram,
  PlayCircle,
  Users,
  Heart,
  Eye,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

interface CreatorStats {
  youtube?: {
    subscribers: number;
    avg_views: number;
    engagement_rate: number;
  };
  instagram?: {
    followers: number;
    avg_likes: number;
    engagement_rate: number;
  };
  tiktok?: {
    followers: number;
    avg_views: number;
    engagement_rate: number;
  };
}

interface RateCard {
  youtube: {
    integration: { min: number; max: number };
    dedicated: { min: number; max: number };
    shorts: { min: number; max: number };
  };
  instagram: {
    post: { min: number; max: number };
    story: { min: number; max: number };
    reel: { min: number; max: number };
  };
  tiktok: {
    video: { min: number; max: number };
  };
}

interface RateCalculatorProps {
  className?: string;
}

// Industry standard CPM ranges by niche
const nicheCPMs: Record<string, { low: number; mid: number; high: number }> = {
  tech: { low: 15, mid: 25, high: 40 },
  gaming: { low: 8, mid: 15, high: 25 },
  beauty: { low: 12, mid: 20, high: 35 },
  fitness: { low: 10, mid: 18, high: 30 },
  finance: { low: 25, mid: 40, high: 60 },
  lifestyle: { low: 10, mid: 18, high: 28 },
  food: { low: 8, mid: 15, high: 25 },
  travel: { low: 12, mid: 22, high: 35 },
  education: { low: 15, mid: 25, high: 40 },
  entertainment: { low: 8, mid: 15, high: 25 },
};

export function RateCalculator({ className }: RateCalculatorProps) {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [niche, setNiche] = useState('tech');
  const [experienceLevel, setExperienceLevel] = useState<'new' | 'growing' | 'established'>('growing');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Manual input mode
  const [manualMode, setManualMode] = useState(false);
  const [manualStats, setManualStats] = useState({
    followers: 100000,
    avgViews: 50000,
    engagementRate: 5,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/rate-card');
      setStats(response.data.stats);
      setRateCard(response.data.rate_card);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Use demo data
      setStats(getDemoStats());
    } finally {
      setLoading(false);
    }
  };

  // Calculate rates based on stats and parameters
  const calculatedRates = useMemo(() => {
    const cpmRates = nicheCPMs[niche] || nicheCPMs.lifestyle;

    // Experience multiplier
    const expMultiplier = experienceLevel === 'new' ? 0.7 : experienceLevel === 'growing' ? 1.0 : 1.3;

    // Use manual stats or fetched stats
    const followers = manualMode ? manualStats.followers : (stats?.youtube?.subscribers || 100000);
    const avgViews = manualMode ? manualStats.avgViews : (stats?.youtube?.avg_views || 50000);
    const engRate = manualMode ? manualStats.engagementRate : (stats?.youtube?.engagement_rate || 5);

    // Engagement rate bonus (higher engagement = higher rates)
    const engBonus = engRate > 5 ? 1.2 : engRate > 3 ? 1.0 : 0.8;

    // YouTube rates
    const ytIntegration = {
      min: Math.round((avgViews / 1000) * cpmRates.low * 0.5 * expMultiplier * engBonus),
      max: Math.round((avgViews / 1000) * cpmRates.high * 0.5 * expMultiplier * engBonus),
    };

    const ytDedicated = {
      min: Math.round((avgViews / 1000) * cpmRates.mid * expMultiplier * engBonus),
      max: Math.round((avgViews / 1000) * cpmRates.high * 1.2 * expMultiplier * engBonus),
    };

    const ytShorts = {
      min: Math.round(ytIntegration.min * 0.3),
      max: Math.round(ytIntegration.max * 0.4),
    };

    // Instagram rates (based on followers and engagement)
    const igFollowers = manualMode ? manualStats.followers : (stats?.instagram?.followers || 50000);

    const igPost = {
      min: Math.round((igFollowers / 1000) * 10 * expMultiplier * engBonus),
      max: Math.round((igFollowers / 1000) * 20 * expMultiplier * engBonus),
    };

    const igStory = {
      min: Math.round(igPost.min * 0.15),
      max: Math.round(igPost.max * 0.2),
    };

    const igReel = {
      min: Math.round(igPost.min * 0.6),
      max: Math.round(igPost.max * 0.8),
    };

    // TikTok rates
    const ttFollowers = manualMode ? manualStats.followers : (stats?.tiktok?.followers || 75000);
    const ttViews = manualMode ? manualStats.avgViews : (stats?.tiktok?.avg_views || 100000);

    const ttVideo = {
      min: Math.round((ttViews / 1000) * 8 * expMultiplier * engBonus),
      max: Math.round((ttViews / 1000) * 15 * expMultiplier * engBonus),
    };

    return {
      youtube: {
        integration: ytIntegration,
        dedicated: ytDedicated,
        shorts: ytShorts,
      },
      instagram: {
        post: igPost,
        story: igStory,
        reel: igReel,
      },
      tiktok: {
        video: ttVideo,
      },
    };
  }, [stats, niche, experienceLevel, manualMode, manualStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleCopyRates = async () => {
    const rateText = `
My Sponsorship Rates (${niche.charAt(0).toUpperCase() + niche.slice(1)} Niche)

YouTube:
- Integration: ${formatCurrency(calculatedRates.youtube.integration.min)} - ${formatCurrency(calculatedRates.youtube.integration.max)}
- Dedicated Video: ${formatCurrency(calculatedRates.youtube.dedicated.min)} - ${formatCurrency(calculatedRates.youtube.dedicated.max)}
- Shorts: ${formatCurrency(calculatedRates.youtube.shorts.min)} - ${formatCurrency(calculatedRates.youtube.shorts.max)}

Instagram:
- Feed Post: ${formatCurrency(calculatedRates.instagram.post.min)} - ${formatCurrency(calculatedRates.instagram.post.max)}
- Story: ${formatCurrency(calculatedRates.instagram.story.min)} - ${formatCurrency(calculatedRates.instagram.story.max)}
- Reel: ${formatCurrency(calculatedRates.instagram.reel.min)} - ${formatCurrency(calculatedRates.instagram.reel.max)}

TikTok:
- Video: ${formatCurrency(calculatedRates.tiktok.video.min)} - ${formatCurrency(calculatedRates.tiktok.video.max)}
    `.trim();

    await navigator.clipboard.writeText(rateText);
    pushToast('Rates copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Rate Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Calculate fair sponsorship rates based on your metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyRates}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Rates
          </Button>
          <Button variant="outline" onClick={loadStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Settings */}
        <div className="lg:col-span-1 space-y-4">
          {/* Niche Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Content Niche
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Different niches have different CPM rates</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(nicheCPMs).map((n) => (
                  <button
                    key={n}
                    onClick={() => setNiche(n)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                      niche === n
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experience Level */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Experience Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { id: 'new', label: 'New Creator', desc: 'Less than 1 year' },
                  { id: 'growing', label: 'Growing', desc: '1-3 years' },
                  { id: 'established', label: 'Established', desc: '3+ years' },
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setExperienceLevel(level.id as typeof experienceLevel)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-colors',
                      experienceLevel === level.id
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                    )}
                  >
                    <p className="font-medium">{level.label}</p>
                    <p className="text-sm text-muted-foreground">{level.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Manual Stats Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Your Stats</CardTitle>
                <button
                  onClick={() => setManualMode(!manualMode)}
                  className="text-sm text-primary hover:underline"
                >
                  {manualMode ? 'Use Connected Data' : 'Enter Manually'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {manualMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center justify-between">
                      <span>Followers</span>
                      <span className="text-muted-foreground">{formatNumber(manualStats.followers)}</span>
                    </label>
                    <Slider
                      value={[manualStats.followers]}
                      onValueChange={([v]) => setManualStats({ ...manualStats, followers: v })}
                      min={1000}
                      max={10000000}
                      step={1000}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center justify-between">
                      <span>Avg. Views</span>
                      <span className="text-muted-foreground">{formatNumber(manualStats.avgViews)}</span>
                    </label>
                    <Slider
                      value={[manualStats.avgViews]}
                      onValueChange={([v]) => setManualStats({ ...manualStats, avgViews: v })}
                      min={100}
                      max={5000000}
                      step={100}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center justify-between">
                      <span>Engagement Rate</span>
                      <span className="text-muted-foreground">{manualStats.engagementRate}%</span>
                    </label>
                    <Slider
                      value={[manualStats.engagementRate]}
                      onValueChange={([v]) => setManualStats({ ...manualStats, engagementRate: v })}
                      min={0.5}
                      max={15}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.youtube && (
                    <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <Youtube className="h-5 w-5 text-red-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{formatNumber(stats.youtube.subscribers)} subs</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(stats.youtube.avg_views)} avg views
                        </p>
                      </div>
                    </div>
                  )}
                  {stats?.instagram && (
                    <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <Instagram className="h-5 w-5 text-pink-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{formatNumber(stats.instagram.followers)} followers</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.instagram.engagement_rate.toFixed(1)}% engagement
                        </p>
                      </div>
                    </div>
                  )}
                  {stats?.tiktok && (
                    <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <PlayCircle className="h-5 w-5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{formatNumber(stats.tiktok.followers)} followers</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(stats.tiktok.avg_views)} avg views
                        </p>
                      </div>
                    </div>
                  )}
                  {!stats?.youtube && !stats?.instagram && !stats?.tiktok && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Connect platforms to use real data
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Rates */}
        <div className="lg:col-span-2 space-y-4">
          {/* YouTube Rates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                YouTube Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Integration</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(calculatedRates.youtube.integration.min)} - {formatCurrency(calculatedRates.youtube.integration.max)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">30-60 sec mention</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Dedicated Video</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(calculatedRates.youtube.dedicated.min)} - {formatCurrency(calculatedRates.youtube.dedicated.max)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Full sponsored video</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Shorts</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(calculatedRates.youtube.shorts.min)} - {formatCurrency(calculatedRates.youtube.shorts.max)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Under 60 seconds</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instagram Rates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Instagram Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-purple-100/50 dark:from-pink-950/30 dark:to-purple-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Feed Post</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(calculatedRates.instagram.post.min)} - {formatCurrency(calculatedRates.instagram.post.max)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Static or carousel</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-purple-100/50 dark:from-pink-950/30 dark:to-purple-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Story</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(calculatedRates.instagram.story.min)} - {formatCurrency(calculatedRates.instagram.story.max)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Per story frame</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-purple-100/50 dark:from-pink-950/30 dark:to-purple-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Reel</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(calculatedRates.instagram.reel.min)} - {formatCurrency(calculatedRates.instagram.reel.max)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Short-form video</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TikTok Rates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                TikTok Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/30 dark:to-gray-800/20">
                  <p className="text-sm text-muted-foreground mb-1">Sponsored Video</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(calculatedRates.tiktok.video.min)} - {formatCurrency(calculatedRates.tiktok.video.max)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Full TikTok</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader className="pb-3">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full flex items-center justify-between"
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  How These Rates Are Calculated
                </CardTitle>
                {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CardHeader>
            {showBreakdown && (
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Base Formula:</strong> (Average Views / 1000) x CPM Rate x Experience Multiplier x Engagement Bonus
                </p>
                <p>
                  <strong>CPM for {niche}:</strong> ${nicheCPMs[niche].low} - ${nicheCPMs[niche].high} per 1000 views
                </p>
                <p>
                  <strong>Experience Multiplier:</strong> {experienceLevel === 'new' ? '0.7x (New)' : experienceLevel === 'growing' ? '1.0x (Growing)' : '1.3x (Established)'}
                </p>
                <p className="text-xs pt-2 border-t">
                  These are suggested rates based on industry standards. Actual rates may vary based on brand budget,
                  exclusivity requirements, usage rights, and negotiation.
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function getDemoStats(): CreatorStats {
  return {
    youtube: {
      subscribers: 250000,
      avg_views: 45000,
      engagement_rate: 5.2,
    },
    instagram: {
      followers: 85000,
      avg_likes: 4500,
      engagement_rate: 5.3,
    },
    tiktok: {
      followers: 150000,
      avg_views: 80000,
      engagement_rate: 8.5,
    },
  };
}
