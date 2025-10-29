// frontend/app/(dashboard)/monetization/page.tsx
import { MonetizationDashboard } from '@/components/monetization/MonetizationDashboard';
import profilesData from '@/data/monetization/profiles.json';
import influencerOpportunities from '@/data/monetization/influencer-opportunities.json';
import wellnessOpportunities from '@/data/monetization/wellness-opportunities.json';
import gamingOpportunities from '@/data/monetization/gaming-opportunities.json';
import { Profile, Opportunity } from '@/types/monetization.types';

export const metadata = {
  title: 'Monetization Engine | Repruv',
  description: 'AI-powered revenue opportunities based on your content and audience',
};

export default function MonetizationPage() {
  const profiles = profilesData as Profile[];
  const opportunitiesData = {
    influencer: influencerOpportunities as Opportunity[],
    wellness: wellnessOpportunities as Opportunity[],
    gaming: gamingOpportunities as Opportunity[],
  };

  return (
    <div className="container mx-auto p-6">
      <MonetizationDashboard profiles={profiles} opportunitiesData={opportunitiesData} />
    </div>
  );
}
