'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Users,
  Building2,
  Loader2,
  ChevronRight,
} from 'lucide-react';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';
type AccountType = 'creator' | 'agency';

interface Application {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string | null;
  account_type: AccountType;
  status: ApplicationStatus;
  submitted_at: string;
  created_at: string;
}

const STATUS_TABS: { value: ApplicationStatus; label: string; icon: any; color: string }[] = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-500' },
  { value: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-500' },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('pending');
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | AccountType>('all');

  useEffect(() => {
    fetchApplications();
  }, [activeTab]);

  useEffect(() => {
    // Filter applications based on search and account type
    let filtered = applications;

    if (searchQuery) {
      filtered = filtered.filter(
        (app) =>
          app.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.user_full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (accountTypeFilter !== 'all') {
      filtered = filtered.filter((app) => app.account_type === accountTypeFilter);
    }

    setFilteredApplications(filtered);
  }, [applications, searchQuery, accountTypeFilter]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/applications/${activeTab}`);
      setApplications(response.data);
    } catch (error: any) {
      console.error('Failed to fetch applications:', error);
      pushToast('Failed to load applications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccountTypeIcon = (type: AccountType) => {
    return type === 'creator' ? Users : Building2;
  };

  const getAccountTypeColor = (type: AccountType) => {
    return type === 'creator' ? 'text-green-500' : 'text-blue-500';
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_TABS.map((tab) => {
          const count = activeTab === tab.value ? applications.length : 0;
          const Icon = tab.icon;
          return (
            <Card
              key={tab.value}
              className={`cursor-pointer transition-all ${
                activeTab === tab.value
                  ? 'border-2 border-green-500 shadow-lg'
                  : 'hover:border-gray-400'
              }`}
              onClick={() => setActiveTab(tab.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary-dark">{tab.label}</p>
                    <p className="text-2xl font-bold text-primary-dark mt-1">
                      {isLoading ? '...' : applications.length}
                    </p>
                  </div>
                  <Icon className={`w-8 h-8 ${tab.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-xl">
              {STATUS_TABS.find((t) => t.value === activeTab)?.label} Applications
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>

              {/* Account Type Filter */}
              <select
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.target.value as 'all' | AccountType)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Types</option>
                <option value="creator">Creators</option>
                <option value="agency">Agencies</option>
              </select>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchApplications}
                disabled={isLoading}
              >
                <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-secondary-dark">
                {searchQuery || accountTypeFilter !== 'all'
                  ? 'No applications match your filters'
                  : `No ${activeTab} applications`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredApplications.map((application) => {
                const AccountIcon = getAccountTypeIcon(application.account_type);
                return (
                  <motion.div
                    key={application.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border rounded-lg p-4 hover:border-green-500 transition-all cursor-pointer bg-card"
                    onClick={() => router.push(`/admin/applications/${application.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Account Type Icon */}
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800`}
                        >
                          <AccountIcon
                            className={`w-5 h-5 ${getAccountTypeColor(application.account_type)}`}
                          />
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-primary-dark">
                              {application.user_full_name || application.user_email}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                application.account_type === 'creator'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              }`}
                            >
                              {application.account_type}
                            </span>
                          </div>
                          <p className="text-sm text-secondary-dark">{application.user_email}</p>
                          <p className="text-xs text-secondary-dark mt-1">
                            Submitted {formatDate(application.submitted_at)}
                          </p>
                        </div>
                      </div>

                      {/* View Button */}
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        Review
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
