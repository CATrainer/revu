// frontend/components/monetization/MonetizationDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Profile, Opportunity } from '@/types/monetization.types';
import { ProfileSelector } from './ProfileSelector';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityModal } from './OpportunityModal';
import { RefreshButton } from './RefreshButton';
import { DollarSign, TrendingUp, Users } from 'lucide-react';

interface MonetizationDashboardProps {
  profiles: Profile[];
  opportunitiesData: {
    influencer: Opportunity[];
    wellness: Opportunity[];
    gaming: Opportunity[];
  };
}

export function MonetizationDashboard({ profiles, opportunitiesData }: MonetizationDashboardProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile>(profiles[0]);
  const [currentOpportunities, setCurrentOpportunities] = useState<Opportunity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize and shuffle opportunities for selected profile
  useEffect(() => {
    const profileOpportunities = opportunitiesData[selectedProfile.id as keyof typeof opportunitiesData];
    const shuffled = shuffleArray(profileOpportunities);
    setCurrentOpportunities(shuffled.slice(0, 3));
    setLastUpdated(new Date());
  }, [selectedProfile, opportunitiesData]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate analyzing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const profileOpportunities = opportunitiesData[selectedProfile.id as keyof typeof opportunitiesData];
    const currentIds = currentOpportunities.map(o => o.id);
    
    // Get opportunities not currently shown
    const available = profileOpportunities.filter(o => !currentIds.includes(o.id));
    
    if (available.length >= 3) {
      const shuffled = shuffleArray(available);
      setCurrentOpportunities(shuffled.slice(0, 3));
    } else {
      // If not enough unused, reshuffle all
      const shuffled = shuffleArray(profileOpportunities);
      setCurrentOpportunities(shuffled.slice(0, 3));
    }
    
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const totalRevenue = currentOpportunities.reduce((sum, opp) => sum + opp.revenueMax, 0);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-dark">
            Your Monetization Opportunities
          </h1>
          <p className="text-secondary-dark mt-2">
            AI-powered revenue opportunities based on your content and audience
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <ProfileSelector
            profiles={profiles}
            selectedProfile={selectedProfile}
            onSelect={setSelectedProfile}
          />
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshing} />
        </div>
      </div>

      {/* Data Source Indicator */}
      <div className="dashboard-card p-6 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 border border-emerald-200 dark:border-emerald-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-primary-dark">
                {selectedProfile.description}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-secondary-dark">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              <span>Up to ${(totalRevenue / 1000).toFixed(0)}K potential</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{selectedProfile.engagementRate}% engagement</span>
            </div>
            <span className="text-xs">
              Updated {formatTime(lastUpdated)}
            </span>
          </div>
        </div>
      </div>

      {/* Opportunity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentOpportunities.map((opportunity, index) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            index={index}
            onClick={() => setSelectedOpportunity(opportunity)}
          />
        ))}
      </div>

      {/* Modal */}
      {selectedOpportunity && (
        <OpportunityModal
          opportunity={selectedOpportunity}
          allOpportunities={currentOpportunities}
          onClose={() => setSelectedOpportunity(null)}
          onNavigate={setSelectedOpportunity}
        />
      )}
    </div>
  );
}
