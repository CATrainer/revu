'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Plug,
  CheckCircle2,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

// Mock integrations data
const integrations = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing for invoices and payouts',
    icon: '/integrations/stripe.svg',
    category: 'Payments',
    connected: true,
    status: 'active',
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Sync with Google Calendar and Gmail',
    icon: '/integrations/google.svg',
    category: 'Productivity',
    connected: false,
    status: 'available',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications in your Slack workspace',
    icon: '/integrations/slack.svg',
    category: 'Communication',
    connected: true,
    status: 'active',
  },
  {
    id: 'youtube',
    name: 'YouTube Analytics',
    description: 'Import creator analytics from YouTube',
    icon: '/integrations/youtube.svg',
    category: 'Analytics',
    connected: false,
    status: 'available',
  },
  {
    id: 'instagram',
    name: 'Instagram Insights',
    description: 'Sync Instagram performance data',
    icon: '/integrations/instagram.svg',
    category: 'Analytics',
    connected: false,
    status: 'available',
  },
  {
    id: 'tiktok',
    name: 'TikTok Analytics',
    description: 'Import TikTok creator metrics',
    icon: '/integrations/tiktok.svg',
    category: 'Analytics',
    connected: false,
    status: 'coming_soon',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync deals and contacts with HubSpot CRM',
    icon: '/integrations/hubspot.svg',
    category: 'CRM',
    connected: false,
    status: 'available',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5000+ apps via Zapier',
    icon: '/integrations/zapier.svg',
    category: 'Automation',
    connected: false,
    status: 'available',
  },
];

const categories = ['All', 'Payments', 'Productivity', 'Communication', 'Analytics', 'CRM', 'Automation'];

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  const filteredIntegrations = selectedCategory === 'All'
    ? integrations
    : integrations.filter(i => i.category === selectedCategory);

  const handleConnect = (integration: typeof integrations[0]) => {
    if (integration.status === 'coming_soon') {
      toast.info(`${integration.name} integration coming soon!`);
      return;
    }
    toast.info(`Connect to ${integration.name} (OAuth flow would open here)`);
  };

  const handleDisconnect = (integration: typeof integrations[0]) => {
    if (confirm(`Disconnect ${integration.name}?`)) {
      toast.success(`${integration.name} disconnected`);
    }
  };

  const handleConfigure = (integration: typeof integrations[0]) => {
    toast.info(`Configure ${integration.name} settings`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
          <p className="text-gray-600 dark:text-gray-400">Connect your favorite tools and services</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Connected Integrations */}
      {filteredIntegrations.some(i => i.connected) && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Connected</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.filter(i => i.connected).map(integration => (
              <Card key={integration.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Plug className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">{integration.name}</h3>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{integration.description}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleConfigure(integration)}>
                      <Settings className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDisconnect(integration)}>
                      Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations.filter(i => !i.connected).map(integration => (
            <Card key={integration.id} className={integration.status === 'coming_soon' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Plug className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">{integration.name}</h3>
                      <Badge variant="secondary">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                  {integration.status === 'coming_soon' && (
                    <Badge variant="outline">Coming Soon</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4">{integration.description}</p>
                <Button
                  className={integration.status === 'coming_soon' ? '' : 'bg-green-600 hover:bg-green-700'}
                  size="sm"
                  disabled={integration.status === 'coming_soon'}
                  onClick={() => handleConnect(integration)}
                >
                  {integration.status === 'coming_soon' ? 'Coming Soon' : 'Connect'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
