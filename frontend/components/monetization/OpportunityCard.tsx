// frontend/components/monetization/OpportunityCard.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Opportunity } from '@/types/monetization.types';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpportunityCardProps {
  opportunity: Opportunity;
  index: number;
  onClick: () => void;
}

export function OpportunityCard({ opportunity, index, onClick }: OpportunityCardProps) {
  const [displayMin, setDisplayMin] = useState(0);
  const [displayMax, setDisplayMax] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index, opportunity.id]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1000;
    const steps = 50;
    const stepTime = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      setDisplayMin(Math.floor(opportunity.revenueMin * progress));
      setDisplayMax(Math.floor(opportunity.revenueMax * progress));
      
      if (currentStep >= steps) {
        clearInterval(interval);
        setDisplayMin(opportunity.revenueMin);
        setDisplayMax(opportunity.revenueMax);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [opportunity, isVisible]);

  const confidenceStars = {
    low: 1,
    medium: 2,
    high: 3,
  }[opportunity.confidence];

  const effortColors = {
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    'very-high': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  };

  const categoryColors = {
    community: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    services: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    'digital-product': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    sponsorships: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    subscription: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    affiliate: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    product: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
    events: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={cn(
        'dashboard-card p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group',
        'opacity-0 translate-y-4',
        isVisible && 'opacity-100 translate-y-0'
      )}
      style={{
        transitionDelay: `${index * 100}ms`,
      }}
    >
      {/* Icon and Title */}
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl mb-2">{opportunity.icon}</div>
        <Badge className={categoryColors[opportunity.category as keyof typeof categoryColors]}>
          {opportunity.category}
        </Badge>
      </div>

      <h3 className="text-xl font-bold text-primary-dark mb-2 group-hover:text-primary transition-colors">
        {opportunity.title}
      </h3>

      <p className="text-sm text-secondary-dark mb-4 line-clamp-2">
        {opportunity.tagline}
      </p>

      {/* Revenue Range with Count-Up Animation */}
      <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="text-sm text-secondary-dark mb-1">Monthly Revenue Potential</div>
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          ${(displayMin / 1000).toFixed(1)}K - ${(displayMax / 1000).toFixed(0)}K
        </div>
      </div>

      {/* Confidence Stars */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-secondary-dark">Confidence:</span>
        <div className="flex gap-0.5">
          {[1, 2, 3].map((star) => (
            <Star
              key={star}
              className={cn(
                'h-4 w-4 transition-all duration-300',
                star <= confidenceStars
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              )}
              style={{
                transitionDelay: isVisible ? `${600 + star * 100}ms` : '0ms',
              }}
            />
          ))}
        </div>
      </div>

      {/* Effort and Timeline */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-secondary-dark" />
          <Badge variant="secondary" className={effortColors[opportunity.effort]}>
            {opportunity.effort} effort
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-secondary-dark" />
          <span className="text-secondary-dark">{opportunity.timeline}</span>
        </div>
      </div>

      {/* Hover Effect Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <span className="text-sm text-primary group-hover:underline">
          Click to view full details →
        </span>
      </div>
    </div>
  );
}
