'use client';

import { useState } from 'react';
import { Opportunity } from '@/lib/monetization-api';
import OpportunityDetailModal from './OpportunityDetailModal';

interface Props {
  opportunities: Opportunity[];
  onSelectOpportunity: (id: string) => void;
}

export default function OpportunityCards({ opportunities, onSelectOpportunity }: Props) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  if (opportunities.length === 0) {
    return null;
  }

  // Sort by confidence score
  const sorted = [...opportunities].sort((a, b) => b.confidence_score - a.confidence_score);

  // Featured is highest confidence
  const featured = sorted[0];
  const others = sorted.slice(1);

  function handleSelectClick(id: string) {
    setSelectedOpportunity(null);
    onSelectOpportunity(id);
  }

  return (
    <div className="mb-12">
      {/* Featured Opportunity */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-xl p-8 relative overflow-hidden">
          {/* Badge */}
          <div className="absolute top-4 right-4">
            <span className="px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-semibold shadow-lg">
              ⭐ Recommended For You
            </span>
          </div>

          <div className="flex items-start gap-6">
            {/* Icon */}
            <div className="text-6xl">{getIconForCategory(featured.template_basis?.[0])}</div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3 text-gray-900 pr-32">
                {featured.title}
              </h3>
              <p className="text-gray-700 mb-4 text-lg">{featured.description}</p>

              {/* Metrics */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-emerald-600">
                    ${featured.revenue_min.toLocaleString()} - $
                    {featured.revenue_max.toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    {featured.confidence_score}% Confidence
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {featured.effort_level.charAt(0).toUpperCase() +
                      featured.effort_level.slice(1)}{' '}
                    Effort
                  </span>
                  <span className="text-gray-600">
                    {featured.timeline_weeks} weeks to launch
                  </span>
                </div>
              </div>

              {/* Why This Works */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Why this works for you:
                </h4>
                <ul className="space-y-2">
                  {featured.why_this_works.slice(0, 3).map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-emerald-600 flex-shrink-0">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedOpportunity(featured)}
                  className="px-6 py-3 border-2 border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition font-medium"
                >
                  See Full Plan
                </button>
                <button
                  onClick={() => handleSelectClick(featured.id)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium shadow-lg hover:shadow-xl"
                >
                  Start Building →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Opportunities */}
      {others.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Other Strong Opportunities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {others.map((opp) => (
              <div
                key={opp.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-emerald-300 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{getIconForCategory(opp.template_basis?.[0])}</div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      opp.confidence_score >= 80
                        ? 'bg-emerald-100 text-emerald-700'
                        : opp.confidence_score >= 60
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {opp.confidence_score}% confidence
                  </span>
                </div>

                <h3 className="text-xl font-semibold mb-2 text-gray-900">{opp.title}</h3>
                <p className="text-gray-600 mb-4">{opp.description}</p>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
                  <span className="font-semibold text-gray-900">
                    ${opp.revenue_min.toLocaleString()} - ${opp.revenue_max.toLocaleString()}
                    /mo
                  </span>
                  <span>•</span>
                  <span>{opp.effort_level} effort</span>
                  <span>•</span>
                  <span>{opp.timeline_weeks}w timeline</span>
                </div>

                {/* Why it works (truncated) */}
                {opp.why_this_works.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-emerald-600 flex-shrink-0">✓</span>
                      <span className="line-clamp-2">{opp.why_this_works[0]}</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedOpportunity(opp)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleSelectClick(opp.id)}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
                  >
                    Start This
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
          onSelect={() => handleSelectClick(selectedOpportunity.id)}
        />
      )}
    </div>
  );
}

function getIconForCategory(templateId?: string): string {
  if (!templateId) return '💰';
  if (templateId.includes('community')) return '👥';
  if (templateId.includes('course')) return '📚';
  if (templateId.includes('coaching')) return '🎯';
  if (templateId.includes('sponsorship')) return '🤝';
  if (templateId.includes('product')) return '📦';
  if (templateId.includes('content')) return '📝';
  if (templateId.includes('affiliate')) return '🔗';
  if (templateId.includes('service')) return '⚙️';
  if (templateId.includes('tool')) return '🛠️';
  return '💰';
}
