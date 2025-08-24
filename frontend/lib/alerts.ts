// frontend/lib/alerts.ts
'use client';

import { useStore } from './store';
import type { Review } from './types';

export function runAlertScan() {
  const st = useStore.getState();
  const { interactions, alertRules, addAlertEvent, addNotification } = st;
  const now = Date.now();
  const last24 = interactions.filter(i => now - +new Date(i.createdAt) <= 24*3600*1000);
  const last7d = interactions.filter(i => now - +new Date(i.createdAt) <= 7*24*3600*1000);

  alertRules.filter(r => r.enabled).forEach(r => {
    let hit = false;
    let message = '';
    if (r.type === 'negative_surge') {
      const neg = last24.filter(i => i.sentiment === 'Negative').length;
      const th = r.threshold ?? 10;
      if (neg >= th) { hit = true; message = `Detected ${neg} negative interactions in the last 24h (>= ${th}).`; }
    } else if (r.type === 'vip_mention') {
      const vip = last7d.find(i => i.author?.verified);
      if (vip) { hit = true; message = `VIP mention by ${vip.author.name} on ${vip.platform}.`; }
    } else if (r.type === 'low_rating') {
      const th = r.threshold ?? 2;
      const low = last7d.some((i) => i.kind === 'review' && 'rating' in i && (i as Review).rating <= th);
      if (low) { hit = true; message = `Low rating detected (<= ${th}).`; }
    } else if (r.type === 'keyword_match') {
      const kw = (r.keyword || '').toLowerCase();
      if (kw && last7d.find(i => i.content.toLowerCase().includes(kw))) { hit = true; message = `Keyword matched: "${kw}".`; }
    }
    if (hit) {
      const evtId = `ae_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      addAlertEvent({ id: evtId, ruleId: r.id, title: r.name, message, createdAt: new Date().toISOString() });
      if (r.channels.inapp) {
        addNotification({ id: `al_${evtId}`, title: `Alert: ${r.name}`, message, createdAt: new Date().toISOString(), severity: 'warning' });
      }
    }
  });
}
