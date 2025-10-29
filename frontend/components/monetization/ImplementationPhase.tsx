// frontend/components/monetization/ImplementationPhase.tsx
'use client';

import { useState } from 'react';
import { Phase } from '@/types/monetization.types';
import { ChevronDown, ChevronUp, Clock, DollarSign, CheckCircle, Lightbulb, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ImplementationPhaseProps {
  phase: Phase;
  index: number;
}

export function ImplementationPhase({ phase, index }: ImplementationPhaseProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepIndex: number) => {
    const newChecked = new Set(checkedSteps);
    if (newChecked.has(stepIndex)) {
      newChecked.delete(stepIndex);
    } else {
      newChecked.add(stepIndex);
    }
    setCheckedSteps(newChecked);
  };

  return (
    <div className="dashboard-card overflow-hidden">
      {/* Phase Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
            {index + 1}
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-primary-dark">{phase.phase}</h4>
            <p className="text-sm text-secondary-dark">{phase.timeline}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-secondary-dark" />
        ) : (
          <ChevronDown className="h-5 w-5 text-secondary-dark" />
        )}
      </button>

      {/* Phase Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[2000px]' : 'max-h-0'
        )}
      >
        <div className="p-4 pt-0 space-y-3 border-t border-gray-200 dark:border-gray-700">
          {phase.steps.map((step, stepIndex) => (
            <div
              key={stepIndex}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200',
                checkedSteps.has(stepIndex)
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              )}
            >
              {/* Step Header with Checkbox */}
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => toggleStep(stepIndex)}
                  className="mt-1 shrink-0"
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      checkedSteps.has(stepIndex)
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    )}
                  >
                    {checkedSteps.has(stepIndex) && (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                </button>
                <div className="flex-1">
                  <h5 className={cn(
                    'font-semibold text-sm mb-2',
                    checkedSteps.has(stepIndex) && 'line-through text-secondary-dark'
                  )}>
                    {step.task}
                  </h5>
                  <p className="text-sm text-secondary-dark">{step.details}</p>
                </div>
              </div>

              {/* Step Meta Info */}
              <div className="flex flex-wrap gap-3 mb-3 ml-8">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-secondary-dark">{step.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-secondary-dark">
                    {typeof step.cost === 'number' ? `$${step.cost}` : step.cost}
                  </span>
                </div>
              </div>

              {/* Resources */}
              {step.resources && step.resources.length > 0 && (
                <div className="ml-8 mb-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Resources</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {step.resources.map((resource, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {resource}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pro Tip */}
              {step.proTip && (
                <div className="ml-8 mb-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Pro Tip</div>
                      <p className="text-xs text-secondary-dark">{step.proTip}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Common Pitfall */}
              {step.commonPitfall && (
                <div className="ml-8 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Watch Out</div>
                      <p className="text-xs text-secondary-dark">{step.commonPitfall}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
