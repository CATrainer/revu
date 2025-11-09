'use client';

import { useState, useEffect } from 'react';

interface Props {
  analysisId: string | null;
  currentStatus?: string;
  currentProgress?: number;
  currentStep?: string;
}

const steps = [
  { id: 1, label: 'Analyzing your content performance', minProgress: 0 },
  { id: 2, label: 'Studying your audience engagement', minProgress: 25 },
  { id: 3, label: 'Identifying monetization patterns', minProgress: 50 },
  { id: 4, label: 'Generating custom opportunities', minProgress: 75 },
];

export default function AnalysisLoader({
  analysisId,
  currentStatus = 'analyzing',
  currentProgress = 0,
  currentStep
}: Props) {
  const [progress, setProgress] = useState(currentProgress);
  const [activeStep, setActiveStep] = useState(0);

  // Update from props
  useEffect(() => {
    setProgress(currentProgress);
  }, [currentProgress]);

  // Determine active step based on progress
  useEffect(() => {
    const step = steps.findIndex((s, idx) => {
      const nextStep = steps[idx + 1];
      return progress >= s.minProgress && (!nextStep || progress < nextStep.minProgress);
    });
    setActiveStep(step >= 0 ? step : steps.length - 1);
  }, [progress]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-emerald-100 rounded-full mb-6">
            <svg
              className="w-12 h-12 text-emerald-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Analyzing Your Opportunities
          </h2>
          <p className="text-gray-600 text-lg">
            {currentStep || "This will take about 30 seconds..."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right mt-2 text-sm font-medium text-gray-600">
            {progress}%
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isCompleted = index < activeStep;
            const isActive = index === activeStep;
            const isPending = index > activeStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isPending ? 'opacity-30' : 'opacity-100'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isActive
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>

                <div className="flex-1">
                  <p
                    className={`font-medium transition-colors ${
                      isActive ? 'text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>

                {isActive && (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Analysis ID (for debugging) */}
        {analysisId && (
          <div className="mt-8 text-center text-xs text-gray-400">
            Analysis ID: {analysisId}
          </div>
        )}
      </div>
    </div>
  );
}
