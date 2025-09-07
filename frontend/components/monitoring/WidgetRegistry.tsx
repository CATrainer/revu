"use client";
import React from 'react';
import { PulseWidget } from './widgets/PulseWidget';
import { SentimentWidget } from './widgets/SentimentWidget';
import { NarrativesWidget } from './widgets/NarrativesWidget';
import { MentionsWidget } from './widgets/MentionsWidget';
import { CompetitorsWidget } from './widgets/CompetitorsWidget';
import { PlatformBreakdownWidget } from './widgets/PlatformBreakdownWidget';
import { TrendingTopicsWidget } from './widgets/TrendingTopicsWidget';
import { InfluencersWidget } from './widgets/InfluencersWidget';

export const WIDGET_TYPES = [
  { type: 'pulse', label: 'Pulse' },
  { type: 'sentiment', label: 'Sentiment' },
  { type: 'narratives', label: 'Narratives' },
  { type: 'mentions', label: 'Mentions' },
  { type: 'competitors', label: 'Competitors' },
  { type: 'platform_breakdown', label: 'Platforms' },
  { type: 'trending', label: 'Trending' },
  { type: 'influencers', label: 'Influencers' },
];

export function renderWidget(cfg: {id: string; type: string; onRemove: (id: string)=>void}) {
  const common = { id: cfg.id, onRemove: cfg.onRemove } as any; // eslint-disable-line
  switch(cfg.type) {
    case 'pulse': return <PulseWidget {...common} />;
    case 'sentiment': return <SentimentWidget {...common} />;
    case 'narratives': return <NarrativesWidget {...common} />;
    case 'mentions': return <MentionsWidget {...common} />;
    case 'competitors': return <CompetitorsWidget {...common} />;
    case 'platform_breakdown': return <PlatformBreakdownWidget {...common} />;
    case 'trending': return <TrendingTopicsWidget {...common} />;
    case 'influencers': return <InfluencersWidget {...common} />;
    default: return <div className="text-xs text-red-300">Unknown widget: {cfg.type}</div>;
  }
}
