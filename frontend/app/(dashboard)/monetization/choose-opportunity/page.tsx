'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, BookOpen, TrendingUp, DollarSign, Clock, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { ErrorHandler } from '@/lib/error-handler';
import {
  getOpportunityTemplates,
  createProject,
  startAIAnalysis,
  checkAnalysisStatus,
  getAIOpportunities,
  selectAIOpportunity,
  type OpportunityTemplate,
  type AIOpportunity
} from '@/lib/monetization-api';

export default function ChooseOpportunityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'templates' | 'ai'>('templates');
  const [templates, setTemplates] = useState<OpportunityTemplate[]>([]);
  const [aiOpportunities, setAiOpportunities] = useState<AIOpportunity[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [aiAnalysisId, setAiAnalysisId] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    await ErrorHandler.withErrorHandling(
      async () => {
        const data = await getOpportunityTemplates();
        setTemplates(data.templates);
      },
      'Loading opportunity templates'
    );
    setIsLoadingTemplates(false);
  };

  const handleStartAIAnalysis = async () => {
    setIsLoadingAI(true);
    let pollInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Check if opportunities already exist
      const existing = await getAIOpportunities();

      if ('opportunities' in existing && existing.opportunities) {
        setAiOpportunities(existing.opportunities);
        setIsLoadingAI(false);
        return;
      }

      // Start new analysis
      const result = await startAIAnalysis();
      setAiAnalysisId(result.analysis_id);

      let attempts = 0;
      const maxAttempts = 150; // 150 * 2s = 5 minutes

      // Set timeout to prevent eternal loading (5 minutes)
      timeoutId = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        setIsLoadingAI(false);
        ErrorHandler.handle(
          new Error('Analysis is taking longer than expected. Please try again later.'),
          'AI Analysis'
        );
      }, 300000); // 5 minutes

      // Poll for status
      pollInterval = setInterval(async () => {
        attempts++;

        // Stop after max attempts
        if (attempts >= maxAttempts) {
          if (pollInterval) clearInterval(pollInterval);
          if (timeoutId) clearTimeout(timeoutId);
          setIsLoadingAI(false);
          ErrorHandler.handle(
            new Error('Analysis is taking longer than expected. Please try again later.'),
            'AI Analysis'
          );
          return;
        }

        try {
          const status = await checkAnalysisStatus(result.analysis_id);
          setAiProgress(status.progress);
          setAiStatus(status.current_step || '');

          if (status.status === 'complete') {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
            const opps = await getAIOpportunities();
            if ('opportunities' in opps) {
              setAiOpportunities(opps.opportunities);
            }
            setIsLoadingAI(false);
          } else if (status.status === 'error') {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
            setIsLoadingAI(false);
            ErrorHandler.handle(
              new Error(status.error || 'Analysis failed'),
              'AI Analysis'
            );
          }
        } catch (error) {
          if (pollInterval) clearInterval(pollInterval);
          if (timeoutId) clearTimeout(timeoutId);
          setIsLoadingAI(false);
          ErrorHandler.handle(error, 'AI Analysis');
        }
      }, 2000);
    } catch (error) {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoadingAI(false);
      ErrorHandler.handle(error, 'Analyzing your content');
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    setIsCreating(true);
    await ErrorHandler.withErrorHandling(
      async () => {
        const result = await createProject(templateId);
        router.push(`/monetization/project/${result.project_id}`);
      },
      'Creating your project'
    );
    setIsCreating(false);
  };

  const handleSelectAIOpportunity = async (opportunityId: string) => {
    setIsCreating(true);
    await ErrorHandler.withErrorHandling(
      async () => {
        const result = await selectAIOpportunity(opportunityId);
        router.push(`/monetization/project/${result.project_id}`);
      },
      'Creating your project'
    );
    setIsCreating(false);
  };

  // Get unique categories
  const categories = ['all', ...new Set(templates.map(t => t.category))];

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/monetization')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Monetization</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Choose Your Monetization Opportunity
        </h1>
        <p className="text-gray-600">
          Select from proven templates or get AI-powered custom recommendations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-4 font-medium transition-colors relative ${
            activeTab === 'templates'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span>Browse Templates ({templates.length})</span>
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('ai');
            if (aiOpportunities.length === 0 && !isLoadingAI) {
              handleStartAIAnalysis();
            }
          }}
          className={`pb-3 px-4 font-medium transition-colors relative ${
            activeTab === 'ai'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span>AI Recommendations</span>
          </div>
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All Templates' : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {template.title}
                      </h3>
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                        {template.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4">
                    {template.description}
                  </p>

                  {/* Revenue Info */}
                  {template.revenue_model?.typical_revenue_month_6 && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>
                        ~${template.revenue_model.typical_revenue_month_6.toLocaleString()}/mo
                        {template.revenue_model.typical_revenue_month_6 > 1000 ? ' by month 6' : ''}
                      </span>
                    </div>
                  )}

                  {/* Ideal For */}
                  {template.ideal_for?.min_followers && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span>
                        {template.ideal_for.min_followers.toLocaleString()}+ followers
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => handleSelectTemplate(template.id)}
                    disabled={isCreating}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Choose This
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <div>
          {isLoadingAI ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Analyzing Your Content...
              </p>
              <p className="text-gray-600 mb-4">{aiStatus}</p>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${aiProgress}%` }}
                />
              </div>
            </div>
          ) : aiOpportunities.length > 0 ? (
            <div>
              <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Personalized Recommendations
                    </h3>
                    <p className="text-sm text-gray-600">
                      These opportunities are custom-generated based on your audience, content, and goals.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {aiOpportunities.map(opp => (
                  <div
                    key={opp.id}
                    className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg text-gray-900">
                        {opp.title}
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                        {Math.round(opp.fit_score)}% Fit
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4">
                      {opp.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span>~${opp.estimated_monthly_revenue.toLocaleString()}/mo potential</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>{opp.time_investment_hours_per_week}h/week time investment</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Why this fits:</span> {opp.fit_explanation}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSelectAIOpportunity(opp.id)}
                      disabled={isCreating}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Choose This
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Get AI-Powered Recommendations
              </h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Our AI will analyze your content, audience, and engagement to generate 3-5 custom monetization opportunities tailored specifically for you.
              </p>
              <button
                onClick={handleStartAIAnalysis}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                Generate Custom Ideas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
