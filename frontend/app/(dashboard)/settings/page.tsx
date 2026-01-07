// frontend/app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { PlatformConnectionButton } from '@/components/integrations/PlatformConnectionButton';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  Check, ChevronDown, Globe, Bell, Mail, Loader2, 
  User, Archive, Bot, CreditCard, Save, Info,
  Youtube, Instagram, Clock, Trash2, RefreshCw
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const tabs = ['Account', 'Integrations', 'Preferences', 'AI Assistant', 'Notifications'] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<typeof tabs[number]>('Account');
  const sp = useSearchParams();

  useEffect(() => {
    const t = sp.get('tab');
    const found = tabs.find(x => x === t);
    if (found) setTab(found);
  }, [sp]);

  return (
    <div className="space-y-6 px-4 md:px-0 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Settings</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <Button 
            key={t} 
            variant="ghost"
            size="sm"
            className={`
              rounded-full px-4 py-2 text-sm font-medium transition-all
              ${tab === t 
                ? 'bg-primary text-white shadow-md' 
                : 'text-secondary-dark hover:bg-primary/10 hover:text-primary'
              }
            `}
            onClick={() => setTab(t)}
          >
            {t === 'Account' && <User className="h-4 w-4 mr-1.5" />}
            {t === 'Integrations' && <Globe className="h-4 w-4 mr-1.5" />}
            {t === 'Preferences' && <Archive className="h-4 w-4 mr-1.5" />}
            {t === 'AI Assistant' && <Bot className="h-4 w-4 mr-1.5" />}
            {t === 'Notifications' && <Bell className="h-4 w-4 mr-1.5" />}
            {t}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {tab === 'Account' && <AccountSection />}
        {tab === 'Integrations' && <IntegrationsSection />}
        {tab === 'Preferences' && <PreferencesSection />}
        {tab === 'AI Assistant' && <AIAssistantSection />}
        {tab === 'Notifications' && <NotificationsSection />}
      </div>
    </div>
  );
}

function AccountSection() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
  }, [user]);

  useEffect(() => {
    const nameChanged = fullName !== (user?.full_name || '');
    const phoneChanged = phone !== (user?.phone || '');
    setHasChanges(nameChanged || phoneChanged);
  }, [fullName, phone, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', { full_name: fullName, phone });
      await refreshUser?.();
      toast.success('Profile updated successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      }) 
    : 'Unknown';

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary-dark">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Manage your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Email Display */}
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-lg text-primary-dark">{user?.full_name || 'Creator'}</h3>
              <p className="text-sm text-secondary-dark">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  {user?.account_type === 'creator' ? 'Creator Account' : 'Active'}
                </span>
                <span className="text-xs text-secondary-dark">Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-primary-dark">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-primary-dark">
                Email Address
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="h-10 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
              />
              <p className="text-xs text-secondary-dark">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-primary-dark">
                Phone Number <span className="text-secondary-dark">(optional)</span>
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="h-10"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="button-primary min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-lg text-primary-dark">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div>
              <div className="font-medium text-primary-dark">Password & Security</div>
              <div className="text-sm text-secondary-dark">
                Manage your password and security settings
              </div>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsSection() {
  const { integrations } = useStore();
  
  const socialPlatforms = [
    { 
      id: 'youtube' as const, 
      name: 'YouTube',
      icon: Youtube,
      description: 'Connect your YouTube channel to track video performance and comments',
      color: 'text-red-500'
    },
    { 
      id: 'instagram' as const, 
      name: 'Instagram',
      icon: Instagram,
      description: 'Link your Instagram account for post analytics and engagement',
      color: 'text-pink-500'
    },
    { 
      id: 'tiktok' as const, 
      name: 'TikTok',
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      ),
      description: 'Sync your TikTok profile for video metrics and trends',
      color: 'text-black dark:text-white'
    }
  ];

  return (
    <Card className="card-background border-[var(--border)]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-primary-dark">
          <Globe className="h-5 w-5" />
          Platform Connections
        </CardTitle>
        <CardDescription>
          Connect your social media accounts to unlock analytics and insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {socialPlatforms.map(platform => {
          const integration = integrations.find(i => i.id === platform.id);
          const isConnected = integration?.connected;
          const Icon = platform.icon;
          
          return (
            <div 
              key={platform.id} 
              className={`
                flex items-center justify-between p-4 rounded-xl border transition-all
                ${isConnected 
                  ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' 
                  : 'border-[var(--border)] hover:border-primary/30'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm ${platform.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-primary-dark">{platform.name}</div>
                    {isConnected && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-secondary-dark mt-0.5">
                    {platform.description}
                  </div>
                  {isConnected && integration?.username && (
                    <div className="text-xs text-secondary-dark mt-1">
                      Connected as <span className="font-medium">@{integration.username}</span>
                    </div>
                  )}
                </div>
              </div>
              <PlatformConnectionButton platform={platform.id} />
            </div>
          );
        })}
        
        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">More Platforms Coming Soon</div>
              <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Twitter/X, Twitch, and LinkedIn integrations are in development.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function PreferencesSection() {
  const { currency, setCurrency, supportedCurrencies, currencyInfo } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Archive settings
  const [archiveSettings, setArchiveSettings] = useState({
    archive_inactive_days: 7,
    archive_delete_days: 30
  });
  const [loadingArchive, setLoadingArchive] = useState(true);
  const [savingArchive, setSavingArchive] = useState(false);

  useEffect(() => {
    fetchArchiveSettings();
  }, []);

  const fetchArchiveSettings = async () => {
    try {
      const response = await api.get('/users/archive-settings');
      setArchiveSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch archive settings:', error);
    } finally {
      setLoadingArchive(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setSaving(true);
    try {
      await setCurrency(newCurrency);
      toast.success(`Currency changed to ${newCurrency}`);
    } finally {
      setSaving(false);
      setIsOpen(false);
    }
  };

  const handleArchiveSettingsSave = async () => {
    setSavingArchive(true);
    try {
      await api.put('/users/archive-settings', archiveSettings);
      toast.success('Archive settings saved');
    } catch (error) {
      toast.error('Failed to save archive settings');
    } finally {
      setSavingArchive(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Currency Preference Card */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary-dark">
            <Globe className="h-5 w-5" />
            Display Currency
          </CardTitle>
          <CardDescription>
            Choose your preferred currency for displaying deal values, revenue, and financial data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={saving}
              className="flex items-center justify-between w-full max-w-xs px-4 py-3 rounded-lg border border-[var(--border)] card-background hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currencyInfo?.symbol || '$'}</span>
                <div className="text-left">
                  <div className="font-medium text-primary-dark">{currency}</div>
                  <div className="text-xs text-secondary-dark">{currencyInfo?.name || 'US Dollar'}</div>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-secondary-dark transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute z-[100] mt-2 w-full max-w-xs rounded-lg border border-[var(--border)] card-background shadow-xl max-h-64 overflow-y-auto">
                {supportedCurrencies.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => handleCurrencyChange(curr.code)}
                    className={`flex items-center justify-between w-full px-4 py-3 hover:bg-primary/5 transition-colors ${
                      currency === curr.code ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-6">{curr.symbol}</span>
                      <div className="text-left">
                        <div className="font-medium text-primary-dark">{curr.code}</div>
                        <div className="text-xs text-secondary-dark">{curr.name}</div>
                      </div>
                    </div>
                    {currency === curr.code && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-secondary-dark mt-3">
            Values are converted using current exchange rates. Original amounts are stored in their source currency.
          </p>
        </CardContent>
      </Card>

      {/* Archive Settings Card */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary-dark">
            <Archive className="h-5 w-5" />
            Auto-Archive & Cleanup
          </CardTitle>
          <CardDescription>
            Configure automatic archiving for inactive brand interactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingArchive ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary-dark" />
            </div>
          ) : (
            <>
              {/* Auto-Archive Setting */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-primary-dark flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      Auto-Archive Inactive Interactions
                    </div>
                    <div className="text-sm text-secondary-dark mt-1">
                      Automatically archive interactions with no activity
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-lg font-bold text-primary-dark">
                    {archiveSettings.archive_inactive_days}
                    <span className="text-sm font-normal text-secondary-dark">days</span>
                  </div>
                </div>
                <Slider
                  value={[archiveSettings.archive_inactive_days]}
                  onValueChange={([value]) => setArchiveSettings(prev => ({ ...prev, archive_inactive_days: value }))}
                  min={3}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-secondary-dark">
                  <span>3 days</span>
                  <span>30 days</span>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-6">
                {/* Auto-Delete Setting */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-primary-dark flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                        Auto-Delete Archived Items
                      </div>
                      <div className="text-sm text-secondary-dark mt-1">
                        Permanently delete archived interactions after
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-lg font-bold text-primary-dark">
                      {archiveSettings.archive_delete_days}
                      <span className="text-sm font-normal text-secondary-dark">days</span>
                    </div>
                  </div>
                  <Slider
                    value={[archiveSettings.archive_delete_days]}
                    onValueChange={([value]) => setArchiveSettings(prev => ({ ...prev, archive_delete_days: value }))}
                    min={7}
                    max={90}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-secondary-dark">
                    <span>7 days</span>
                    <span>90 days</span>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    Archived interactions can be restored at any time before they&apos;re auto-deleted. 
                    You&apos;ll receive a notification before any archived item is permanently removed.
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleArchiveSettingsSave}
                  disabled={savingArchive}
                  className="button-primary min-w-[140px]"
                >
                  {savingArchive ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AIAssistantSection() {
  const [preferences, setPreferences] = useState({
    custom_instructions: '',
    response_style: 'balanced',
    expertise_level: 'intermediate',
    tone: 'friendly'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    response_style: string;
    expertise_level: string;
    tone: string;
  } | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/users/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to fetch AI preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/preferences', preferences);
      toast.success('AI preferences saved successfully');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all AI preferences to defaults?')) return;
    
    setSaving(true);
    try {
      await api.delete('/users/preferences');
      await fetchPreferences();
      toast.success('Preferences reset to defaults');
    } catch (error) {
      toast.error('Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await api.post('/users/preferences/analyze');
      setSuggestions(response.data.suggestions);
      toast.success('Analysis complete! Review suggestions below.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to analyze usage');
    } finally {
      setAnalyzing(false);
    }
  };

  const applySuggestions = () => {
    if (!suggestions) return;
    setPreferences(prev => ({
      ...prev,
      response_style: suggestions.response_style,
      expertise_level: suggestions.expertise_level,
      tone: suggestions.tone
    }));
    setSuggestions(null);
    toast.success('Suggestions applied! Remember to save.');
  };

  const responseStyles = [
    { value: 'concise', label: 'Concise', description: 'Short, to-the-point responses' },
    { value: 'balanced', label: 'Balanced', description: 'Moderate detail with key points' },
    { value: 'detailed', label: 'Detailed', description: 'Comprehensive, in-depth responses' }
  ];

  const expertiseLevels = [
    { value: 'beginner', label: 'Beginner', description: 'Simple explanations, basic terms' },
    { value: 'intermediate', label: 'Intermediate', description: 'Standard industry knowledge' },
    { value: 'expert', label: 'Expert', description: 'Advanced concepts, technical depth' }
  ];

  const tones = [
    { value: 'professional', label: 'Professional', description: 'Formal and business-like' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
    { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Instructions */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary-dark">
            <Bot className="h-5 w-5" />
            Custom Instructions
          </CardTitle>
          <CardDescription>
            Provide context about yourself or your brand for more personalized AI responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={preferences.custom_instructions || ''}
            onChange={(e) => setPreferences(prev => ({ ...prev, custom_instructions: e.target.value }))}
            placeholder="Example: I'm a lifestyle YouTuber with 500K subscribers focusing on travel content. My audience is mostly millennials interested in budget travel tips..."
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-secondary-dark mt-2">
            This information helps the AI understand your context and provide more relevant suggestions.
          </p>
        </CardContent>
      </Card>

      {/* Response Style */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-lg text-primary-dark">Response Style</CardTitle>
          <CardDescription>
            Choose how detailed you want AI responses to be
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {responseStyles.map((style) => (
              <button
                key={style.value}
                onClick={() => setPreferences(prev => ({ ...prev, response_style: style.value }))}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  preferences.response_style === style.value
                    ? 'border-primary bg-primary/5'
                    : 'border-[var(--border)] hover:border-primary/30'
                }`}
              >
                <div className="font-medium text-primary-dark">{style.label}</div>
                <div className="text-sm text-secondary-dark mt-1">{style.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expertise Level */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-lg text-primary-dark">Expertise Level</CardTitle>
          <CardDescription>
            Set the complexity level for AI explanations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {expertiseLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => setPreferences(prev => ({ ...prev, expertise_level: level.value }))}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  preferences.expertise_level === level.value
                    ? 'border-primary bg-primary/5'
                    : 'border-[var(--border)] hover:border-primary/30'
                }`}
              >
                <div className="font-medium text-primary-dark">{level.label}</div>
                <div className="text-sm text-secondary-dark mt-1">{level.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tone */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-lg text-primary-dark">Conversation Tone</CardTitle>
          <CardDescription>
            Select the tone for AI interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tones.map((tone) => (
              <button
                key={tone.value}
                onClick={() => setPreferences(prev => ({ ...prev, tone: tone.value }))}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  preferences.tone === tone.value
                    ? 'border-primary bg-primary/5'
                    : 'border-[var(--border)] hover:border-primary/30'
                }`}
              >
                <div className="font-medium text-primary-dark">{tone.label}</div>
                <div className="text-sm text-secondary-dark mt-1">{tone.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions Panel */}
      {suggestions && (
        <Card className="card-background border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="text-lg text-green-700 dark:text-green-300">
              ✨ AI Recommendations
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              Based on your chat history, we recommend these settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-dark">Response Style:</span>
                <span className="font-medium text-primary-dark capitalize">{suggestions.response_style}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-dark">Expertise Level:</span>
                <span className="font-medium text-primary-dark capitalize">{suggestions.expertise_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-dark">Tone:</span>
                <span className="font-medium text-primary-dark capitalize">{suggestions.tone}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={applySuggestions} className="button-primary" size="sm">
                Apply Suggestions
              </Button>
              <Button onClick={() => setSuggestions(null)} variant="outline" size="sm">
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <Button 
            onClick={handleAnalyze} 
            variant="outline"
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Analyze My Usage
              </>
            )}
          </Button>
          <Button onClick={handleReset} variant="ghost" disabled={saving}>
            Reset to Defaults
          </Button>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="button-primary min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [preferences, setPreferences] = useState<{
    in_app_enabled: boolean;
    email_enabled: boolean;
    email_frequency: string;
    digest_hour: number;
    type_settings: Record<string, { in_app?: boolean; email?: boolean }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationTypes, setNotificationTypes] = useState<Array<{
    id: string;
    name: string;
    types: Array<{ id: string; title: string; category: string; default_in_app: boolean; default_email: boolean }>;
  }>>([]);

  useEffect(() => {
    fetchPreferences();
    fetchNotificationTypes();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationTypes = async () => {
    try {
      const response = await fetch('/api/notifications/types?dashboard=creator');
      if (response.ok) {
        const data = await response.json();
        setNotificationTypes(data);
      }
    } catch (error) {
      console.error('Failed to fetch notification types:', error);
    }
  };

  const updatePreferences = async (updates: Partial<typeof preferences>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTypePreference = async (typeId: string, channel: 'in_app' | 'email', enabled: boolean) => {
    if (!preferences) return;
    
    const newTypeSettings = {
      ...preferences.type_settings,
      [typeId]: {
        ...preferences.type_settings[typeId],
        [channel]: enabled,
      },
    };
    
    await updatePreferences({ type_settings: newTypeSettings });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-primary-dark flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Global Settings
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
            <div>
              <div className="font-medium text-primary-dark">In-App Notifications</div>
              <div className="text-sm text-secondary-dark">Show notifications in the dashboard</div>
            </div>
            <Switch
              checked={preferences?.in_app_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ in_app_enabled: checked })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
            <div>
              <div className="font-medium text-primary-dark">Email Notifications</div>
              <div className="text-sm text-secondary-dark">Receive notifications via email</div>
            </div>
            <Switch
              checked={preferences?.email_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ email_enabled: checked })}
              disabled={saving}
            />
          </div>

          {preferences?.email_enabled && (
            <div className="p-4 rounded-lg border border-[var(--border)] space-y-3">
              <div className="font-medium text-primary-dark flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Delivery
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="email_frequency"
                    checked={preferences?.email_frequency === 'instant'}
                    onChange={() => updatePreferences({ email_frequency: 'instant' })}
                    disabled={saving}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-primary-dark">Instant</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="email_frequency"
                    checked={preferences?.email_frequency === 'daily_digest'}
                    onChange={() => updatePreferences({ email_frequency: 'daily_digest' })}
                    disabled={saving}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-primary-dark">Daily Digest</span>
                </label>
              </div>
              {preferences?.email_frequency === 'daily_digest' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-secondary-dark">Send digest at:</span>
                  <select
                    value={preferences?.digest_hour ?? 9}
                    onChange={(e) => updatePreferences({ digest_hour: parseInt(e.target.value) })}
                    disabled={saving}
                    className="px-3 py-1 rounded border border-[var(--border)] card-background text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00 UTC
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Per-Type Settings */}
      {notificationTypes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-primary-dark">Notification Types</h3>
          <p className="text-sm text-secondary-dark">
            Choose which notifications you want to receive and how.
          </p>

          {notificationTypes.map((category) => (
            <div key={category.id} className="space-y-2">
              <h4 className="text-sm font-medium text-secondary-dark uppercase tracking-wide">
                {category.name}
              </h4>
              <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
                {category.types.map((type) => {
                  const typeSettings = preferences?.type_settings?.[type.id] || {};
                  const inAppEnabled = typeSettings.in_app ?? type.default_in_app;
                  const emailEnabled = typeSettings.email ?? type.default_email;

                  return (
                    <div key={type.id} className="flex items-center justify-between p-3">
                      <div className="text-sm text-primary-dark">{type.title}</div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-secondary-dark">
                          <Switch
                            checked={inAppEnabled}
                            onCheckedChange={(checked) => toggleTypePreference(type.id, 'in_app', checked)}
                            disabled={saving || !preferences?.in_app_enabled}
                            className="scale-75"
                          />
                          In-App
                        </label>
                        <label className="flex items-center gap-2 text-xs text-secondary-dark">
                          <Switch
                            checked={emailEnabled}
                            onCheckedChange={(checked) => toggleTypePreference(type.id, 'email', checked)}
                            disabled={saving || !preferences?.email_enabled}
                            className="scale-75"
                          />
                          Email
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BillingSection() {
  const { billing } = useStore();
  const currentTier = billing?.plan || 'Free';
  
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-md border border-[var(--border)]">
        <div className="text-sm font-medium text-primary-dark mb-2">Current Plan</div>
        <div className="text-lg font-semibold text-primary-dark">{currentTier}</div>
        <div className="text-sm text-secondary-dark mt-1">
          {currentTier === 'Free' ? 'Basic social media management features' : 'Advanced features and analytics'}
        </div>
      </div>
      
      <div className="flex gap-2">
        {currentTier === 'Free' ? (
          <Button className="button-primary">
            Upgrade to Pro
          </Button>
        ) : (
          <Button variant="outline" className="border-[var(--border)]">
            Downgrade to Free
          </Button>
        )}
      </div>
    </div>
  );
}

