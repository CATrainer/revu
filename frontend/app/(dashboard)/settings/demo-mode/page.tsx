'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, StopCircle, Settings2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pollJobStatus, pollDemoStatus } from '@/lib/polling';

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
  const [actionLoading, setActionLoading] = useState(false);
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
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/demo/status', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setDemoStatus(data);
      }
    } catch (error) {
      console.error('Failed to load demo status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableDemo = async () => {
    try {
      setActionLoading(true);
      
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

      // Call new API route
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/demo/enable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to enable demo mode');
      }
      
      const result = await response.json();
      
      // Show success message
      alert(`Demo Mode is being enabled! This will take about a minute. Status: ${result.status}`);
      
      // Reload status immediately to show "enabling" state
      await loadDemoStatus();
      
      // Poll for completion in background
      if (result.job_id) {
        pollJobStatus(result.job_id, {
          onUpdate: (job) => {
            console.log('Job status:', job.status);
          },
          onComplete: async (job) => {
            console.log('Demo mode enabled!', job);
            // Reload status to show "enabled"
            await loadDemoStatus();
            alert('Demo Mode Enabled! Interactions will start arriving shortly.');
          },
          onError: (error) => {
            console.error('Job failed:', error);
            alert('Demo mode failed to enable. Please try again.');
            loadDemoStatus();
          },
        }).catch(console.error);
      }
      
    } catch (error: any) {
      alert('Failed to Enable Demo: ' + (error.message || 'An error occurred'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableDemo = async () => {
    if (!confirm('Are you sure you want to disable demo mode? This will remove all simulated data.')) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      // Call new API route
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/demo/disable', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to disable demo mode');
      }
      
      const result = await response.json();
      
      alert('Demo Mode is being disabled. This will take a moment.');
      
      // Reload status immediately to show "disabling" state
      await loadDemoStatus();
      
      // Poll for completion
      if (result.job_id) {
        pollJobStatus(result.job_id, {
          onComplete: async (job) => {
            console.log('Demo mode disabled!', job);
            await loadDemoStatus();
            alert(`Demo Mode Disabled. ${job.result_data?.interactions_deleted || 0} interactions and ${job.result_data?.content_deleted || 0} content pieces removed.`);
          },
          onError: (error) => {
            console.error('Job failed:', error);
            alert('Demo mode failed to disable properly. Please try again.');
            loadDemoStatus();
          },
        }).catch(console.error);
      }
      
    } catch (error: any) {
      alert('Failed to Disable Demo: ' + (error.message || 'An error occurred'));
    } finally {
      setActionLoading(false);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Status</CardTitle>
              <CardDescription>
                {demoStatus?.status === 'enabled' && 'Demo mode is active - using simulated platform data'}
                {demoStatus?.status === 'disabled' && 'Demo mode is inactive - using real platform connections'}
                {demoStatus?.status === 'enabling' && 'Demo mode is being set up...'}
                {demoStatus?.status === 'disabling' && 'Demo mode is being disabled...'}
                {demoStatus?.status === 'failed' && 'Demo mode encountered an error'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadDemoStatus}
              disabled={loading}
              title="Refresh status"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-3 w-3 rounded-full ${
                demoStatus?.status === 'enabled' ? 'bg-green-500' : 
                demoStatus?.status === 'enabling' || demoStatus?.status === 'disabling' ? 'bg-yellow-500 animate-pulse' :
                demoStatus?.status === 'failed' ? 'bg-red-500' :
                'bg-gray-300'
              }`} />
              <span className="font-medium">
                {demoStatus?.status === 'enabled' && 'Demo Mode Active'}
                {demoStatus?.status === 'disabled' && 'Real Mode Active'}
                {demoStatus?.status === 'enabling' && 'Enabling Demo Mode...'}
                {demoStatus?.status === 'disabling' && 'Disabling Demo Mode...'}
                {demoStatus?.status === 'failed' && 'Demo Mode Failed'}
              </span>
            </div>
            
            {demoStatus?.status === 'enabled' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisableDemo}
                disabled={actionLoading}
                className="ml-auto"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                {actionLoading ? 'Disabling...' : 'Disable Demo'}
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
      {/* Show error if failed */}
      {demoStatus?.status === 'failed' && demoStatus?.error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{demoStatus.error}</p>
            <Button
              onClick={() => {
                // Reset to disabled state
                fetch('/api/demo/status').then(() => loadDemoStatus());
              }}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show enabling/disabling progress */}
      {(demoStatus?.status === 'enabling' || demoStatus?.status === 'disabling') && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              {demoStatus.status === 'enabling' ? 'Setting Up Demo Mode' : 'Cleaning Up Demo Mode'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This process may take 1-2 minutes. You can close this page and come back later.
            </p>
            {demoStatus.job_id && (
              <p className="text-xs text-muted-foreground mt-2">
                Job ID: {demoStatus.job_id}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!demoStatus?.demo_mode && demoStatus?.status !== 'enabling' && demoStatus?.status !== 'disabling' && (
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
              disabled={actionLoading}
              className="w-full"
              size="lg"
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              {actionLoading ? 'Enabling...' : 'Enable Demo Mode'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
