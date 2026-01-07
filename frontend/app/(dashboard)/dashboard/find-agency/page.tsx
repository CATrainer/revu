'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Building2,
  Globe,
  ArrowLeft,
  Loader2,
  UserPlus,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface AgencyResult {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
}

export default function FindAgencyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AgencyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setSearched(true);
      const response = await api.get('/creator/agency/search', {
        params: { q: searchQuery.trim() },
      });
      setResults(response.data);
    } catch (error) {
      console.error('Failed to search agencies:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async (agencyId: string) => {
    try {
      setRequestingId(agencyId);
      await api.post(`/creator/agency/join/${agencyId}`);
      setRequestedIds((prev) => new Set([...prev, agencyId]));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to send request';
      alert(message);
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/opportunities"
          className="inline-flex items-center text-sm text-secondary-dark hover:text-primary-dark mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Opportunities
        </Link>
        <h1 className="text-2xl font-bold text-primary-dark">Find Your Agency</h1>
        <p className="text-secondary-dark mt-1">
          Search for your talent agency to connect and receive opportunities
        </p>
      </div>

      {/* Search Box */}
      <div className="dashboard-card p-6 mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by agency name..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-primary-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="dashboard-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
          <p className="text-secondary-dark mt-4">Searching...</p>
        </div>
      ) : searched && results.length === 0 ? (
        <div className="dashboard-card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-dark mb-2">
            No agencies found
          </h3>
          <p className="text-secondary-dark max-w-md mx-auto">
            We couldn&apos;t find any agencies matching &quot;{searchQuery}&quot;. Try a different search term or check with your agency for their exact name.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {results.map((agency) => {
            const isRequested = requestedIds.has(agency.id);
            const isRequesting = requestingId === agency.id;

            return (
              <div
                key={agency.id}
                className="dashboard-card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {agency.logo_url ? (
                      <img
                        src={agency.logo_url}
                        alt={agency.name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                        <Building2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-primary-dark">
                        {agency.name}
                      </h3>
                      {agency.description && (
                        <p className="text-secondary-dark text-sm mt-1 line-clamp-2">
                          {agency.description}
                        </p>
                      )}
                      {agency.website && (
                        <a
                          href={agency.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-2"
                        >
                          <Globe className="h-4 w-4" />
                          {agency.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    {isRequested ? (
                      <span className="inline-flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm font-medium">
                        <CheckCircle className="h-4 w-4" />
                        Request Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRequestToJoin(agency.id)}
                        disabled={isRequesting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {isRequesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        Request to Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-card p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-dark mb-2">
            Search for your agency
          </h3>
          <p className="text-secondary-dark max-w-md mx-auto">
            Enter your agency&apos;s name above to find and connect with them. Once connected, you&apos;ll receive brand partnership opportunities directly.
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-secondary-dark">
          Can&apos;t find your agency?{' '}
          <a href="mailto:support@repruv.com" className="text-green-600 hover:text-green-700 font-medium">
            Contact support
          </a>
          {' '}and we&apos;ll help you connect.
        </p>
      </div>
    </div>
  );
}
