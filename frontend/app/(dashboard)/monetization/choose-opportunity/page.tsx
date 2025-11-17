'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, BookOpen, TrendingUp, DollarSign, Clock, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { ErrorHandler } from '@/lib/error-handler';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/monetization')}
          className="w-fit px-0 text-secondary-dark hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Monetization
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary-dark">
            Choose Your Monetization Opportunity
          </h1>
          <p className="text-secondary-dark mt-2">
            Select from proven templates or generate AI-powered recommendations personalized to your audience.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { id: 'templates', label: `Browse Templates (${templates.length})`, icon: BookOpen },
          { id: 'ai', label: 'AI Recommendations', icon: Sparkles },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'secondary'}
            onClick={() => {
              setActiveTab(tab.id as 'templates' | 'ai');
              if (tab.id === 'ai' && aiOpportunities.length === 0 && !isLoadingAI) {
                handleStartAIAnalysis();
              }
            }}
            className={cn(
              'gap-2 rounded-full px-5',
              activeTab === tab.id ? 'bg-[var(--brand-primary)] text-white shadow-lg' : 'button-secondary'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors border',
                    selectedCategory === category
                      ? 'bg-[var(--brand-primary)] text-white border-transparent shadow'
                      : 'text-secondary-dark border-[var(--border)] hover:text-primary-dark hover:border-[var(--brand-primary)]'
                  )}
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
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="dashboard-card h-full p-6 hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-primary-dark mb-1">
                        {template.title}
                      </h3>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                        {template.category}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-secondary-dark text-sm mb-4">
                    {template.description}
                  </p>

                  {/* Revenue Info */}
                  {template.revenue_model?.typical_revenue_month_6 && (
                    <div className="flex items-center gap-2 text-sm text-primary-dark mb-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>
                        ~${template.revenue_model.typical_revenue_month_6.toLocaleString()}/mo
                        {template.revenue_model.typical_revenue_month_6 > 1000 ? ' by month 6' : ''}
                      </span>
                    </div>
                  )}

                  {/* Ideal For */}
                  {template.ideal_for?.min_followers && (
                    <div className="flex items-center gap-2 text-sm text-primary-dark mb-4">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span>
                        {template.ideal_for.min_followers.toLocaleString()}+ followers
                      </span>
                    </div>
                  )}

                  <Button
                    onClick={() => handleSelectTemplate(template.id)}
                    disabled={isCreating}
                    className="mt-auto w-full bg-[var(--brand-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  </Button>
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
              <p className="text-lg font-medium text-primary-dark mb-2">
                Analyzing Your Content...
              </p>
              <p className="text-secondary-dark mb-4">{aiStatus}</p>
              <Progress className="w-64" value={aiProgress} />
            </div>
          ) : aiOpportunities.length > 0 ? (
            <div>
              <div className="dashboard-card mb-6 border border-purple-200/60 dark:border-purple-800/60 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-primary-dark mb-1">
                      Personalized Recommendations
                    </h3>
                    <p className="text-sm text-secondary-dark">
                      These opportunities are custom-generated based on your audience, content, and goals.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {aiOpportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="dashboard-card p-6 hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg text-primary-dark">
                        {opp.title}
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                        {Math.round(opp.fit_score)}% Fit
                      </div>
                    </div>

                    <p className="text-secondary-dark text-sm mb-4">
                      {opp.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-primary-dark">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span>~${opp.estimated_monthly_revenue.toLocaleString()}/mo potential</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-primary-dark">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>{opp.time_investment_hours_per_week}h/week time investment</span>
                      </div>
                    </div>

                    <div className="rounded-lg p-3 mb-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-secondary-dark">
                        <span className="font-semibold text-primary-dark">Why this fits:</span> {opp.fit_explanation}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleSelectAIOpportunity(opp.id)}
                      disabled={isCreating}
                      className="mt-auto w-full bg-[var(--brand-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold text-primary-dark mb-2">
                Get AI-Powered Recommendations
              </h3>
              <p className="text-secondary-dark mb-6 text-center max-w-md">
                Our AI will analyze your content, audience, and engagement to generate 3-5 custom monetization opportunities tailored specifically for you.
              </p>
              <Button
                onClick={handleStartAIAnalysis}
                className="bg-[var(--brand-primary)] text-white hover:opacity-90 px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                Generate Custom Ideas
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
