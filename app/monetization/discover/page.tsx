'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnalysisLoader from '@/components/monetization/discover/AnalysisLoader';
import OpportunityCards from '@/components/monetization/discover/OpportunityCards';
import ConversationalInterface from '@/components/monetization/discover/ConversationalInterface';
import {
  monetizationAPI,
  MonetizationAPIError,
  Opportunity,
} from '@/lib/monetization-api';

type Stage = 'initial' | 'analyzing' | 'opportunities' | 'error';

export default function DiscoverPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('initial');
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState({
    status: 'analyzing',
    progress: 0,
    current_step: '',
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    checkExistingOpportunities();
  }, []);

  async function checkExistingOpportunities() {
    try {
      const data = await monetizationAPI.getOpportunities();

      if ('status' in data && data.status === 'needs_analysis') {
        // Need fresh analysis
        setStage('initial');
      } else if ('opportunities' in data) {
        // Have opportunities
        setOpportunities(data.opportunities);
        setStage('opportunities');
      }
    } catch (error: any) {
      if (error instanceof MonetizationAPIError) {
        if (error.errorCode === 'profile_required') {
          router.push('/profile/setup?return=/monetization/discover');
          return;
        }
      }
      console.error('Error checking opportunities:', error);
      setStage('initial');
    }
  }

  async function startDiscovery() {
    try {
      setStage('analyzing');
      setError(null);

      // Start analysis
      const result = await monetizationAPI.startAnalysis();
      setAnalysisId(result.analysis_id);

      // Poll for completion
      pollAnalysisStatus(result.analysis_id);
    } catch (error: any) {
      console.error('Error starting analysis:', error);

      if (error instanceof MonetizationAPIError) {
        if (error.errorCode === 'profile_required') {
          router.push('/profile/setup?return=/monetization/discover');
          return;
        }
        setError(error.message);
      } else {
        setError('Failed to start analysis. Please try again.');
      }

      setStage('error');
    }
  }

  async function pollAnalysisStatus(analysisId: string) {
    const pollInterval = setInterval(async () => {
      try {
        const status = await monetizationAPI.checkAnalysisStatus(analysisId);

        setAnalysisStatus({
          status: status.status,
          progress: status.progress,
          current_step: status.current_step || '',
        });

        if (status.status === 'complete') {
          clearInterval(pollInterval);
          // Load opportunities
          const data = await monetizationAPI.getOpportunities();
          if ('opportunities' in data) {
            setOpportunities(data.opportunities);
            setStage('opportunities');
          }
        } else if (status.status === 'error') {
          clearInterval(pollInterval);
          setError(status.error || 'Analysis failed');
          setStage('error');
        }
        // Still in progress, keep polling
      } catch (error) {
        clearInterval(pollInterval);
        console.error('Error checking analysis status:', error);
        setError('Failed to check analysis status');
        setStage('error');
      }
    }, 2000); // Poll every 2 seconds
  }

  async function handleRefine(message: string) {
    setIsRefining(true);
    try {
      const result = await monetizationAPI.refineOpportunities(message);
      setOpportunities(result.opportunities);
    } catch (error) {
      console.error('Error refining opportunities:', error);
      setError('Failed to refine opportunities. Please try again.');
    } finally {
      setIsRefining(false);
    }
  }

  async function handleSelectOpportunity(opportunityId: string) {
    try {
      const result = await monetizationAPI.selectOpportunity(opportunityId);
      router.push(result.redirect_url);
    } catch (error: any) {
      console.error('Error selecting opportunity:', error);

      if (error instanceof MonetizationAPIError) {
        if (error.errorCode === 'project_exists') {
          // User already has active project, redirect there
          router.push('/monetization/project');
          return;
        }
        setError(error.message);
      } else {
        setError('Failed to start project. Please try again.');
      }
    }
  }

  // Initial state
  if (stage === 'initial') {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6 text-gray-900">
            Discover Your Perfect Monetization Strategy
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            We'll analyze your content, audience, and engagement to create
            personalized opportunities just for you.
          </p>

          {profile && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <p className="text-sm text-gray-600">
                Based on {profile.content_count || 0} posts,{' '}
                {profile.follower_count?.toLocaleString()} followers, and{' '}
                {profile.engagement_rate}% engagement
              </p>
            </div>
          )}

          <button
            onClick={startDiscovery}
            className="px-8 py-4 bg-emerald-600 text-white text-lg rounded-lg hover:bg-emerald-700 transition font-semibold shadow-lg hover:shadow-xl"
          >
            Discover Your Opportunities →
          </button>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 bg-white rounded-lg border border-gray-200">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold mb-2 text-gray-900">Content Analysis</h3>
              <p className="text-sm text-gray-600">
                We analyze your posts, topics, and performance to understand what resonates
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg border border-gray-200">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="font-semibold mb-2 text-gray-900">Audience Insights</h3>
              <p className="text-sm text-gray-600">
                Understand your audience's questions, engagement patterns, and loyalty
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg border border-gray-200">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold mb-2 text-gray-900">Custom Opportunities</h3>
              <p className="text-sm text-gray-600">
                Get 3-5 personalized monetization strategies with implementation plans
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (stage === 'analyzing') {
    return (
      <AnalysisLoader
        analysisId={analysisId}
        currentStatus={analysisStatus.status}
        currentProgress={analysisStatus.progress}
        currentStep={analysisStatus.current_step}
      />
    );
  }

  // Error state
  if (stage === 'error') {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Something Went Wrong</h1>
          <p className="text-lg text-gray-600 mb-8">{error || 'An unexpected error occurred'}</p>
          <button
            onClick={() => {
              setStage('initial');
              setError(null);
            }}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Opportunities state
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          Your Monetization Opportunities
        </h1>
        <p className="text-gray-600">
          Based on your content and audience, these are your strongest paths:
        </p>
      </div>

      <OpportunityCards
        opportunities={opportunities}
        onSelectOpportunity={handleSelectOpportunity}
      />

      <ConversationalInterface
        onSendMessage={handleRefine}
        opportunities={opportunities}
        loading={isRefining}
      />

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            setStage('initial');
            setOpportunities([]);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Start a fresh analysis
        </button>
      </div>
    </div>
  );
}
