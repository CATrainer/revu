import type { Interaction, Workspace, WorkspaceType } from './types';

type KPI = { title: string; value: string | number; trend?: string };

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

// Simple derived stats from interactions
export function summarizeKPIs(interactions: Interaction[]) {
  const total = interactions.length;
  const responded = interactions.filter(i => i.status === 'Responded').length;
  const needs = interactions.filter(i => i.status === 'Needs Response').length;
  const unread = interactions.filter(i => i.status === 'Unread').length;
  const positives = interactions.filter(i => i.sentiment === 'Positive').length;
  const negatives = interactions.filter(i => i.sentiment === 'Negative').length;
  const responseRate = total ? responded / total : 0;
  const sentimentScore = total ? (positives - negatives) / total : 0;
  return { total, responded, needs, unread, positives, negatives, responseRate, sentimentScore };
}

export function getProfileKPIs(ws: Workspace, interactions: Interaction[]): KPI[] {
  const s = summarizeKPIs(interactions);
  const base: Record<WorkspaceType, KPI[]> = {
    Individual: [
      { title: 'Engagement Volume', value: s.total },
      { title: 'Response Rate', value: pct(s.responseRate), trend: 'vs last period' },
      { title: 'Sentiment Score', value: pct(Math.max(0, s.sentimentScore)), trend: 'improving' },
      { title: 'Unread', value: s.unread },
    ],
    Organization: [
      { title: 'Reviews This Month', value: s.total },
      { title: 'Avg Rating', value: '4.6', trend: 'placeholder' },
      { title: 'Response Rate', value: pct(s.responseRate) },
      { title: 'Needs Response', value: s.needs },
    ],
    Agency: [
      { title: 'Total Interactions', value: s.total },
      { title: 'Unread', value: s.unread },
      { title: 'Response Rate', value: pct(s.responseRate) },
      { title: 'Sentiment Score', value: pct(Math.max(0, s.sentimentScore)) },
    ],
  };

  if (ws.type === 'Agency') {
    if (ws.agencyFlavor === 'creators') {
      base.Agency[0] = { title: 'Creator Mentions', value: s.total };
      base.Agency[1] = { title: 'Unread Mentions', value: s.unread };
    } else if (ws.agencyFlavor === 'businesses') {
      base.Agency[0] = { title: 'Client Reviews', value: s.total };
      base.Agency[1] = { title: 'Needs Response', value: s.needs };
    }
  }

  return base[ws.type];
}
