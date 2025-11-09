'use client';

import { Opportunity } from '@/lib/monetization-api';
import { X } from 'lucide-react';

interface Props {
  opportunity: Opportunity;
  onClose: () => void;
  onSelect: () => void;
}

export default function OpportunityDetailModal({ opportunity, onClose, onSelect }: Props) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="p-8 pb-6 border-b border-gray-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-5xl">
                {getIconForCategory(opportunity.template_basis?.[0] || 'default')}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {opportunity.title}
                </h2>
                <p className="text-lg text-gray-600">{opportunity.description}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-600">
                  ${opportunity.revenue_min.toLocaleString()} - $
                  {opportunity.revenue_max.toLocaleString()}/mo
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  {opportunity.confidence_score}% Confidence
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {opportunity.effort_level.charAt(0).toUpperCase() +
                    opportunity.effort_level.slice(1)}{' '}
                  Effort
                </span>
                <span className="text-gray-600">
                  {opportunity.timeline_weeks} weeks to launch
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-8">
            {/* Why This Works */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Why this works for you
              </h3>
              <ul className="space-y-3">
                {opportunity.why_this_works.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-emerald-600 flex-shrink-0 mt-1">✓</span>
                    <span className="text-gray-700">{reason}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Key Advantages */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Key advantages
              </h3>
              <ul className="space-y-3">
                {opportunity.key_advantages.map((advantage, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-blue-600 flex-shrink-0 mt-1">★</span>
                    <span className="text-gray-700">{advantage}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Custom Elements */}
            {opportunity.custom_elements && opportunity.custom_elements.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Unique to your situation
                </h3>
                <ul className="space-y-3">
                  {opportunity.custom_elements.map((element, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-purple-600 flex-shrink-0 mt-1">◆</span>
                      <span className="text-gray-700">{element}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Implementation Plan */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Implementation Plan
              </h3>

              <div className="space-y-6">
                {opportunity.implementation_plan.phases.map((phase, phaseIdx) => (
                  <div key={phaseIdx} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Phase {phaseIdx + 1}: {phase.phase}
                      </h4>
                      <span className="text-sm text-gray-500 font-medium">
                        {phase.timeline}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {phase.steps.map((step, stepIdx) => (
                        <div
                          key={stepIdx}
                          className="pl-4 border-l-2 border-gray-200 hover:border-emerald-500 transition"
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <span className="text-sm font-medium text-gray-400 flex-shrink-0">
                              {step.id}
                            </span>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-1">
                                {step.task}
                              </h5>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                                <span>⏱ {step.time_estimate}</span>
                                <span>
                                  💰 ${step.cost_estimate === 0 ? 'Free' : step.cost_estimate}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{step.details}</p>

                              {step.pro_tips && (
                                <div className="mt-2 p-3 bg-emerald-50 rounded-lg">
                                  <p className="text-sm text-emerald-800">
                                    <span className="font-semibold">💡 Pro tip:</span>{' '}
                                    {step.pro_tips}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Template Basis */}
            {opportunity.template_basis && opportunity.template_basis.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Based on templates</h3>
                <div className="flex flex-wrap gap-2">
                  {opportunity.template_basis.map((template, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {template}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 pt-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-lg transition font-medium"
              >
                Back to Opportunities
              </button>
              <button
                onClick={onSelect}
                className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium shadow-lg hover:shadow-xl"
              >
                Start Building This →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getIconForCategory(templateId: string): string {
  if (templateId?.includes('community')) return '👥';
  if (templateId?.includes('course')) return '📚';
  if (templateId?.includes('coaching')) return '🎯';
  if (templateId?.includes('sponsorship')) return '🤝';
  if (templateId?.includes('product')) return '📦';
  if (templateId?.includes('content')) return '📝';
  if (templateId?.includes('affiliate')) return '🔗';
  if (templateId?.includes('service')) return '⚙️';
  if (templateId?.includes('tool')) return '🛠️';
  return '💰';
}
