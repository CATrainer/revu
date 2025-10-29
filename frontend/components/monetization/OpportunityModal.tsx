// frontend/components/monetization/OpportunityModal.tsx
'use client';

import { useEffect } from 'react';
import { Opportunity } from '@/types/monetization.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight, Star, TrendingUp, CheckCircle2, Lightbulb } from 'lucide-react';
import { ImplementationPhase } from './ImplementationPhase';

interface OpportunityModalProps {
  opportunity: Opportunity;
  allOpportunities: Opportunity[];
  onClose: () => void;
  onNavigate: (opportunity: Opportunity) => void;
}

export function OpportunityModal({
  opportunity,
  allOpportunities,
  onClose,
  onNavigate,
}: OpportunityModalProps) {
  const currentIndex = allOpportunities.findIndex((o) => o.id === opportunity.id);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allOpportunities.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onNavigate(allOpportunities[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigate(allOpportunities[currentIndex + 1]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && canGoPrev) handlePrev();
      if (e.key === 'ArrowRight' && canGoNext) handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allOpportunities]);

  const confidenceStars = {
    low: 1,
    medium: 2,
    high: 3,
  }[opportunity.confidence];

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            {/* Header */}
            <DialogHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{opportunity.icon}</div>
                  <div>
                    <DialogTitle className="text-2xl mb-2">{opportunity.title}</DialogTitle>
                    <p className="text-secondary-dark">{opportunity.tagline}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="text-sm text-secondary-dark mb-1">Revenue Range</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${(opportunity.revenueMin / 1000).toFixed(1)}K-${(opportunity.revenueMax / 1000).toFixed(0)}K
                  </div>
                </div>

                <div className="p-4 dashboard-card">
                  <div className="text-sm text-secondary-dark mb-1">Confidence</div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((star) => (
                      <Star
                        key={star}
                        className={
                          star <= confidenceStars
                            ? 'h-5 w-5 fill-yellow-400 text-yellow-400'
                            : 'h-5 w-5 text-gray-300 dark:text-gray-600'
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 dashboard-card">
                  <div className="text-sm text-secondary-dark mb-1">Effort</div>
                  <Badge variant="secondary" className="text-sm">
                    {opportunity.effort}
                  </Badge>
                </div>

                <div className="p-4 dashboard-card">
                  <div className="text-sm text-secondary-dark mb-1">Timeline</div>
                  <div className="text-sm font-semibold">{opportunity.timeline}</div>
                </div>
              </div>
            </DialogHeader>

            {/* Metrics Section */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Why This Works for You
              </h3>
              
              <div className="grid gap-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="font-semibold text-sm text-secondary-dark mb-1">Content Performance</div>
                  <p className="text-sm">{opportunity.metrics.contentPerformance}</p>
                </div>
                
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="font-semibold text-sm text-secondary-dark mb-1">Audience Signals</div>
                  <p className="text-sm">{opportunity.metrics.audienceSignals}</p>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="font-semibold text-sm text-secondary-dark mb-1">Competitive Benchmark</div>
                  <p className="text-sm">{opportunity.metrics.competitiveBenchmark}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {opportunity.whyThisWorks.map((reason, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 dashboard-card">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Implementation Phases */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Step-by-Step Implementation
              </h3>
              
              <div className="space-y-3">
                {opportunity.implementationPhases.map((phase, index) => (
                  <ImplementationPhase key={index} phase={phase} index={index} />
                ))}
              </div>
            </div>

            {/* Success Metrics */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-bold">Success Metrics</h3>
              <div className="space-y-2">
                {opportunity.successMetrics.map((metric, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 dashboard-card">
                    <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{metric}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What You Need */}
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="p-4 dashboard-card space-y-3">
                <h4 className="font-semibold">Tools & Resources</h4>
                <ul className="space-y-1">
                  {opportunity.whatYouNeed.tools.map((tool, index) => (
                    <li key={index} className="text-sm text-secondary-dark">• {tool}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 dashboard-card space-y-2">
                <div>
                  <div className="font-semibold text-sm text-secondary-dark">Time Commitment</div>
                  <div className="text-sm">{opportunity.whatYouNeed.timeCommitment}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-secondary-dark">Upfront Cost</div>
                  <div className="text-sm">{opportunity.whatYouNeed.upfrontCost}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-secondary-dark">Break Even</div>
                  <div className="text-sm">{opportunity.whatYouNeed.breakEven}</div>
                </div>
              </div>
            </div>

            {/* Success Stories */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-bold">Success Stories</h3>
              <div className="grid gap-4">
                {opportunity.successStories.map((story, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{story.creator}</div>
                        <div className="text-sm text-secondary-dark">{story.followers}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{story.revenue}</div>
                        <div className="text-xs text-secondary-dark">{story.timeToScale}</div>
                      </div>
                    </div>
                    <p className="text-sm italic">"{story.quote}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={!canGoPrev}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-secondary-dark">
                {currentIndex + 1} of {allOpportunities.length}
              </div>

              <Button
                variant="outline"
                onClick={handleNext}
                disabled={!canGoNext}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
