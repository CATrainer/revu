'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Globe,
  Save,
  Upload,
  Loader2,
  Check,
  ChevronDown,
  DollarSign,
  Bell,
  Mail,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { agencyApi, type Agency } from '@/lib/agency-api';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function AgencySettingsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    fetchAgency();
  }, []);

  const fetchAgency = async () => {
    setIsLoading(true);
    try {
      const data = await agencyApi.getMyAgency();
      setAgency(data);
      setFormData({
        name: data.name || '',
        website: data.website || '',
        description: data.description || '',
      });
    } catch (error) {
      console.error('Failed to fetch agency:', error);
      toast.error('Failed to load agency settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await agencyApi.updateAgency({
        name: formData.name,
        website: formData.website || undefined,
        description: formData.description || undefined,
      });
      setAgency(updated);
      toast.success('Settings saved!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Agency Settings
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage your agency profile and preferences
        </p>
      </div>

      {/* Agency Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agency Profile</CardTitle>
          <CardDescription>
            This information will be visible to creators when they receive invitations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Agency Logo</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 overflow-hidden">
                {agency?.logo_url ? (
                  <img
                    src={agency.logo_url}
                    alt={agency.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <Button variant="outline" size="sm" disabled>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG up to 2MB. Recommended 200x200px.
                </p>
              </div>
            </div>
          </div>

          {/* Agency Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Agency Name</Label>
            <Input
              id="name"
              placeholder="Your Agency Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="website"
                placeholder="https://youragency.com"
                className="pl-10"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell creators about your agency..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This description will be shown to creators when they receive invitations.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.name}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
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
        </CardContent>
      </Card>

      {/* Account Owner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Owner</CardTitle>
          <CardDescription>
            The primary contact for this agency account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium text-lg">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {user?.full_name || 'Agency Owner'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            To transfer ownership, please contact support.
          </p>
        </CardContent>
      </Card>

      {/* Currency Preference */}
      <CurrencyPreferenceCard />

      {/* Notification Preferences */}
      <NotificationPreferencesCard />

      {/* Agency Info */}
      {agency && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agency Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Agency ID</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">{agency.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Slug</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">{agency.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-900 dark:text-gray-100">
                {new Date(agency.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-lg text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your agency account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Delete Agency
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Permanently delete your agency and all associated data
              </p>
            </div>
            <Button variant="destructive" disabled>
              Delete Agency
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationPreferencesCard() {
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
      const response = await fetch('/api/agency/notifications/preferences');
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
      const response = await fetch('/api/agency/notifications/types');
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
      const response = await fetch('/api/agency/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        toast.success('Notification preferences updated');
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleTypePreference = async (typeId: string, channel: 'in_app' | 'email', enabled: boolean) => {
    if (!preferences) return;
    
    const newTypeSettings = {
      ...preferences.type_settings,
      [typeId]: {
        ...preferences.type_settings?.[typeId],
        [channel]: enabled,
      },
    };
    
    await updatePreferences({ type_settings: newTypeSettings });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="notifications">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Control how you receive notifications about campaigns, deals, and team activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">In-App Notifications</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Show notifications in the dashboard</div>
            </div>
            <Switch
              checked={preferences?.in_app_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ in_app_enabled: checked })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</div>
            </div>
            <Switch
              checked={preferences?.email_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ email_enabled: checked })}
              disabled={saving}
            />
          </div>

          {preferences?.email_enabled && (
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
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
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Instant</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="email_frequency"
                    checked={preferences?.email_frequency === 'daily_digest'}
                    onChange={() => updatePreferences({ email_frequency: 'daily_digest' })}
                    disabled={saving}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Daily Digest</span>
                </label>
              </div>
              {preferences?.email_frequency === 'daily_digest' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Send digest at:</span>
                  <select
                    value={preferences?.digest_hour ?? 9}
                    onChange={(e) => updatePreferences({ digest_hour: parseInt(e.target.value) })}
                    disabled={saving}
                    className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
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

        {/* Per-Type Settings */}
        {notificationTypes.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Notification Types</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose which notifications you want to receive and how.
            </p>

            {notificationTypes.map((category) => (
              <div key={category.id} className="space-y-2">
                <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {category.name}
                </h5>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {category.types.map((type) => {
                    const typeSettings = preferences?.type_settings?.[type.id] || {};
                    const inAppEnabled = typeSettings.in_app ?? type.default_in_app;
                    const emailEnabled = typeSettings.email ?? type.default_email;

                    return (
                      <div key={type.id} className="flex items-center justify-between p-3">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{type.title}</div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Switch
                              checked={inAppEnabled}
                              onCheckedChange={(checked) => toggleTypePreference(type.id, 'in_app', checked)}
                              disabled={saving || !preferences?.in_app_enabled}
                              className="scale-75"
                            />
                            In-App
                          </label>
                          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
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
      </CardContent>
    </Card>
  );
}

function CurrencyPreferenceCard() {
  const { currency, setCurrency, supportedCurrencies, currencyInfo } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCurrencyChange = async (newCurrency: string) => {
    setSaving(true);
    try {
      await setCurrency(newCurrency);
      toast.success(`Currency changed to ${newCurrency}`);
    } catch {
      toast.error('Failed to update currency');
    } finally {
      setSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Display Currency
        </CardTitle>
        <CardDescription>
          Choose your preferred currency for displaying deal values, revenue, and financial data
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={saving}
            className="flex items-center justify-between w-full max-w-xs px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-500 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{currencyInfo?.symbol || '$'}</span>
              <div className="text-left">
                <div className="font-medium text-gray-900 dark:text-gray-100">{currency}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{currencyInfo?.name || 'US Dollar'}</div>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-[100] mt-2 w-full max-w-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl max-h-64 overflow-y-auto">
              {supportedCurrencies.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => handleCurrencyChange(curr.code)}
                  className={`flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    currency === curr.code ? 'bg-green-50 dark:bg-green-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-6">{curr.symbol}</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{curr.code}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{curr.name}</div>
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          All monetary values will be converted and displayed in your selected currency.
        </p>
      </CardContent>
    </Card>
  );
}
