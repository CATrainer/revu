'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, StopCircle, Settings2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';

const NICHES = [
  { value: 'tech_reviews', label: 'Tech Reviews' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'travel', label: 'Travel' },
  { value: 'education', label: 'Education' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'music', label: 'Music' },
  { value: 'lifestyle', label: 'Lifestyle' },
];

const PRESETS = {
  small: {
    label: 'Small Creator',
    yt_subscribers: 10000,
    yt_avg_views: 5000,
    ig_followers: 5000,
    tt_followers: 20000,
    comment_volume: 'low',
    dm_frequency: 'low',
  },
  medium: {
    label: 'Mid-Tier Creator',
    yt_subscribers: 100000,
    yt_avg_views: 50000,
    ig_followers: 50000,
    tt_followers: 200000,
    comment_volume: 'medium',
    dm_frequency: 'medium',
  },
  large: {
    label: 'Large Creator',
    yt_subscribers: 1000000,
    yt_avg_views: 500000,
    ig_followers: 500000,
    tt_followers: 2000000,
    comment_volume: 'high',
    dm_frequency: 'high',
  },
};

export default function DemoModePage() {
  const [demoStatus, setDemoStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [configTab, setConfigTab] = useState<'auto' | 'manual'>('auto');
  const [selectedPreset, setSelectedPreset] = useState('medium');
  const [niche, setNiche] = useState('tech_reviews');
  
  // Manual config
  const [ytSubs, setYtSubs] = useState(100000);
  const [ytViews, setYtViews] = useState(50000);
  const [igFollowers, setIgFollowers] = useState(50000);
  const [ttFollowers, setTtFollowers] = useState(200000);
  const [commentVolume, setCommentVolume] = useState('medium');
  const [dmFrequency, setDmFrequency] = useState('medium');

  useEffect(() => {
    loadDemoStatus();
  }, []);

  const loadDemoStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/demo/status');
      setDemoStatus(response.data);
    } catch (error) {
      console.error('Failed to load demo status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableDemo = async () => {
    try {
      setLoading(true);
      
      const config = configTab === 'auto' 
        ? {
            profile_type: 'auto',
            niche,
            ...PRESETS[selectedPreset as keyof typeof PRESETS],
          }
        : {
            profile_type: 'manual',
            niche,
            yt_subscribers: ytSubs,
            yt_avg_views: ytViews,
            ig_followers: igFollowers,
            tt_followers: ttFollowers,
            comment_volume: commentVolume,
            dm_frequency: dmFrequency,
          };

      await api.post('/demo/enable', config);
      
      alert('Demo Mode Enabled! Your demo profile is being set up. Interactions will start arriving shortly.');
      
      await loadDemoStatus();
    } catch (error: any) {
      alert('Failed to Enable Demo: ' + (error.response?.data?.detail || 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisableDemo = async () => {
    try {
      setLoading(true);
      await api.post('/demo/disable');
      
      alert('Demo Mode Disabled. Switched back to real platform connections.');
      
      await loadDemoStatus();
    } catch (error: any) {
      alert('Failed to Disable Demo: ' + (error.response?.data?.detail || 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !demoStatus) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary-dark">Demo Mode</h1>
        <p className="text-secondary-dark mt-1">
          Test Repruv with simulated platform connections and AI-generated interactions
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>
            {demoStatus?.demo_mode 
              ? 'Demo mode is active - using simulated platform data'
              : 'Demo mode is inactive - using real platform connections'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`h-3 w-3 rounded-full ${demoStatus?.demo_mode ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="font-medium">
              {demoStatus?.demo_mode ? 'Demo Mode Active' : 'Real Mode Active'}
            </span>
            
            {demoStatus?.demo_mode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableDemo}
                disabled={loading}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Disable Demo
              </Button>
            )}
          </div>

          {demoStatus?.profile && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Demo Profile:</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-secondary-dark">Niche:</span>
                  <span className="ml-2 font-medium capitalize">{demoStatus.profile.niche.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-secondary-dark">YouTube:</span>
                  <span className="ml-2 font-medium">{demoStatus.profile.yt_subscribers.toLocaleString()} subs</span>
                </div>
                <div>
                  <span className="text-secondary-dark">Instagram:</span>
                  <span className="ml-2 font-medium">{demoStatus.profile.ig_followers.toLocaleString()} followers</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enable Demo Mode */}
      {!demoStatus?.demo_mode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-primary" />
              Enable Demo Mode
            </CardTitle>
            <CardDescription>
              Choose your demo profile configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Niche Selection */}
            <div>
              <Label>Content Niche</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto vs Manual */}
            <Tabs value={configTab} onValueChange={(v) => setConfigTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="auto">Quick Setup</TabsTrigger>
                <TabsTrigger value="manual">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="space-y-4">
                <Label>Preset Profile</Label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        console.log('Preset selected:', key);
                        setSelectedPreset(key);
                      }}
                      className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                        selectedPreset === key
                          ? 'border-green-500 bg-green-50 dark:bg-green-950 ring-2 ring-green-500 ring-offset-2'
                          : 'border-gray-300 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      {selectedPreset === key && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <p className="font-semibold text-base">{preset.label}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {preset.yt_subscribers.toLocaleString()} YT subs
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {preset.yt_avg_views.toLocaleString()} avg views
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Selected: <span className="font-semibold">{PRESETS[selectedPreset as keyof typeof PRESETS].label}</span>
                </p>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>YouTube Subscribers</Label>
                    <Input
                      type="number"
                      value={ytSubs}
                      onChange={(e) => setYtSubs(parseInt(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Avg Views per Video</Label>
                    <Input
                      type="number"
                      value={ytViews}
                      onChange={(e) => setYtViews(parseInt(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Instagram Followers</Label>
                    <Input
                      type="number"
                      value={igFollowers}
                      onChange={(e) => setIgFollowers(parseInt(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>TikTok Followers</Label>
                    <Input
                      type="number"
                      value={ttFollowers}
                      onChange={(e) => setTtFollowers(parseInt(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Comment Volume</Label>
                    <Select value={commentVolume} onValueChange={setCommentVolume}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (50/video)</SelectItem>
                        <SelectItem value="medium">Medium (150/video)</SelectItem>
                        <SelectItem value="high">High (300/video)</SelectItem>
                        <SelectItem value="viral">Viral (1000+/video)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>DM Frequency</Label>
                    <Select value={dmFrequency} onValueChange={setDmFrequency}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (5/day)</SelectItem>
                        <SelectItem value="medium">Medium (20/day)</SelectItem>
                        <SelectItem value="high">High (50/day)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleEnableDemo}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Enable Demo Mode
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
