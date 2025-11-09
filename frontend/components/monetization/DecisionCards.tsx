'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Target, DollarSign, Layers, Calendar, FileText, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Decision } from '@/lib/monetization-api';

interface DecisionCardsProps {
  decisions: Decision[];
}

const DECISION_CONFIG = {
  pricing: {
    icon: DollarSign,
    label: 'Pricing',
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800'
  },
  platform: {
    icon: Target,
    label: 'Platform',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  structure: {
    icon: Layers,
    label: 'Structure',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  timeline: {
    icon: Calendar,
    label: 'Timeline',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  content: {
    icon: FileText,
    label: 'Content',
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50 dark:bg-teal-950/20',
    borderColor: 'border-teal-200 dark:border-teal-800'
  }
};

export function DecisionCards({ decisions }: DecisionCardsProps) {
  // Create a map of decisions by category
  const decisionMap = new Map(decisions.map(d => [d.category, d]));

  // All possible decision categories
  const allCategories: Array<keyof typeof DECISION_CONFIG> = [
    'pricing',
    'platform',
    'structure',
    'timeline',
    'content'
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary-dark">Key Decisions</h3>
        <Badge variant="secondary">
          {decisions.length}/5 decisions made
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCategories.map((category) => {
          const decision = decisionMap.get(category);
          const config = DECISION_CONFIG[category];
          const Icon = config.icon;
          const isMade = !!decision;

          return (
            <Card
              key={category}
              className={cn(
                "p-5 transition-all duration-300",
                isMade ? cn(
                  "border-2",
                  config.bgColor,
                  config.borderColor,
                  "hover:-translate-y-1"
                ) : "border-dashed border-2 border-gray-300 dark:border-gray-700 opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  isMade ? cn("bg-gradient-to-br", config.color) : "bg-gray-200 dark:bg-gray-800"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    isMade ? "text-white" : "text-gray-400"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-primary-dark">{config.label}</h4>
                    {isMade && decision && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-3 w-3",
                              star <= (decision.confidence === 'high' ? 3 : decision.confidence === 'medium' ? 2 : 1)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300 dark:text-gray-600"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {isMade && decision ? (
                    <>
                      <p className="text-sm font-medium text-primary-dark mb-2">
                        {decision.value}
                      </p>
                      {decision.rationale && (
                        <p className="text-xs text-secondary-dark line-clamp-2">
                          {decision.rationale}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            decision.confidence === 'high' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                            decision.confidence === 'medium' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
                            decision.confidence === 'low' && "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                          )}
                        >
                          {decision.confidence} confidence
                        </Badge>
                        <span className="text-xs text-secondary-dark">
                          {new Date(decision.decided_at).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-secondary-dark">
                      Not yet decided
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {decisions.length === 5 && (
        <div className="dashboard-card p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✅</div>
            <div>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                All key decisions made!
              </p>
              <p className="text-sm text-secondary-dark">
                You're ready to move forward with execution tasks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
