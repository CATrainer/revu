'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Instagram, 
  Youtube,
  Globe,
  Calendar,
  DollarSign,
  TrendingUp,
  Edit,
  MessageSquare,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Placeholder data - in production this would come from API
const getCreatorData = (id: string) => ({
  id,
  name: 'Sarah Chen',
  handle: '@sarahcreates',
  email: 'sarah@example.com',
  phone: '+1 (555) 123-4567',
  avatar: null,
  status: 'available' as const,
  bio: 'Lifestyle and tech content creator with 5+ years of experience. Specializing in product reviews, unboxings, and brand collaborations.',
  location: 'Los Angeles, CA',
  languages: ['English', 'Mandarin'],
  categories: ['Tech', 'Lifestyle', 'Fashion'],
  platforms: {
    instagram: { handle: '@sarahcreates', followers: 125000 },
    youtube: { handle: 'SarahCreates', subscribers: 89000 },
    tiktok: { handle: '@sarahcreates', followers: 250000 },
  },
  stats: {
    totalCampaigns: 24,
    completedCampaigns: 22,
    totalEarnings: 85000,
    avgEngagement: 4.8,
  },
  recentCampaigns: [
    { id: '1', name: 'Nike Summer Collection', status: 'completed', date: '2025-12-15' },
    { id: '2', name: 'Apple Watch Series 10', status: 'in_progress', date: '2025-12-28' },
    { id: '3', name: 'Spotify Wrapped 2025', status: 'completed', date: '2025-12-01' },
  ],
  notes: 'Excellent communicator, always delivers on time. Prefers 2-week lead time for campaigns.',
  joinedDate: '2024-03-15',
});

export default function CreatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params.id as string;

  // In production, this would fetch from API
  const creator = getCreatorData(creatorId);

  const statusColors = {
    available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    booked: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    tentative: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    unavailable: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {creator.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{creator.handle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4 overflow-hidden">
                  {creator.avatar ? (
                    <Image src={creator.avatar} alt={creator.name} width={96} height={96} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <h2 className="text-xl font-semibold">{creator.name}</h2>
                <p className="text-gray-500 dark:text-gray-400">{creator.handle}</p>
                <Badge className={statusColors[creator.status]} variant="secondary">
                  {creator.status.charAt(0).toUpperCase() + creator.status.slice(1)}
                </Badge>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{creator.bio}</p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{creator.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{creator.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <span>{creator.location}</span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {creator.categories.map(cat => (
                    <Badge key={cat} variant="outline">{cat}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Platforms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Platforms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {creator.platforms.instagram && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    <span className="text-sm">{creator.platforms.instagram.handle}</span>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(creator.platforms.instagram.followers)}</span>
                </div>
              )}
              {creator.platforms.youtube && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Youtube className="h-5 w-5 text-red-500" />
                    <span className="text-sm">{creator.platforms.youtube.handle}</span>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(creator.platforms.youtube.subscribers)}</span>
                </div>
              )}
              {creator.platforms.tiktok && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <span className="text-sm">{creator.platforms.tiktok.handle}</span>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(creator.platforms.tiktok.followers)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle & Right Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{creator.stats.totalCampaigns}</p>
                <p className="text-xs text-gray-500">Total Campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{creator.stats.completedCampaigns}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold">{formatCurrency(creator.stats.totalEarnings)}</p>
                <p className="text-xs text-gray-500">Total Earnings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">{creator.stats.avgEngagement}%</p>
                <p className="text-xs text-gray-500">Avg Engagement</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creator.recentCampaigns.map(campaign => (
                  <Link
                    key={campaign.id}
                    href={`/agency/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-gray-500">{new Date(campaign.date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={campaign.status === 'completed' ? 'default' : 'secondary'}>
                      {campaign.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-300">{creator.notes}</p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/agency/campaigns/new?creator=${creatorId}`}>
                    Add to Campaign
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/agency/creators/availability?creator=${creatorId}`}>
                    View Availability
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/agency/finance/payouts?creator=${creatorId}`}>
                    View Payouts
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
