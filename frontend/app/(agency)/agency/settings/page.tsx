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
} from 'lucide-react';
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
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
            <div className="absolute z-50 mt-2 w-full max-w-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-64 overflow-y-auto">
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
