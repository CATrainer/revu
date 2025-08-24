// frontend/app/(dashboard)/reviews/page.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Interaction, InteractionStatus, Platform } from '@/lib/types';
import { downloadReviewsPDF } from '@/lib/pdf-utils';
import { openPrefilledEmail } from '@/lib/email';

const platforms: Platform[] = ['Google', 'YouTube', 'Instagram', 'TikTok', 'Facebook', 'X/Twitter'];
const statuses: Array<'All' | InteractionStatus> = ['All', 'Unread', 'Needs Response', 'Responded', 'Archived', 'Reported'];

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get('filter');
  const { interactions, currentWorkspace, updateInteraction, filters, setFilters, savedViews, addSavedView, removeSavedView } = useStore();
  const [limit, setLimit] = useState(50);
  const [ratingFilter, setRatingFilter] = useState<'All' | '>=4' | '>=3' | '<=2'>('All');

  // Auto-trigger CSV export via shareable link ?export=csv
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (searchParams.get('export') === 'csv') {
      // defer to ensure reviews computed
      setTimeout(() => {
        const evt = new CustomEvent('revu-export-reviews-csv');
        window.dispatchEvent(evt);
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate filters from query params on load
  useEffect(() => {
    const platformsParam = searchParams.get('platforms');
    const statusParam = searchParams.get('status');
    const searchParam = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
  const rating = searchParams.get('rating');
  const patch: Partial<typeof filters> = {};
  if (platformsParam) patch.platforms = platformsParam.split(',').filter(Boolean) as Platform[];
    if (statusParam) patch.status = statusParam as typeof filters.status;
    if (searchParam) patch.search = searchParam;
    if (from || to) patch.dateRange = { from: from || undefined, to: to || undefined };
  const ratingOptions = ['All','>=4','>=3','<=2'] as const;
  if (rating && ratingOptions.includes(rating as typeof ratingOptions[number])) setRatingFilter(rating as typeof ratingOptions[number]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reviews = useMemo(() => {
    let list = interactions.filter((i) => i.kind === 'review');
    if (currentWorkspace) {
      list = list.filter(i => i.workspaceId === currentWorkspace.id || (currentWorkspace.id === 'agency' && i.workspaceId === 'agency'));
    }
    // Apply store filters
    if (filters.platforms.length) list = list.filter(i => filters.platforms.includes(i.platform));
    if (filters.status !== 'All') list = list.filter(i => i.status === filters.status);
    if (filters.search) list = list.filter(i => `${i.content} ${i.author.name}`.toLowerCase().includes(filters.search.toLowerCase()));
    // Date range (local)
    if (filters.dateRange?.from) {
      const fromTs = +new Date(filters.dateRange.from);
      list = list.filter(i => +new Date(i.createdAt) >= fromTs);
    }
    if (filters.dateRange?.to) {
      const toTs = +new Date(filters.dateRange.to);
      list = list.filter(i => +new Date(i.createdAt) <= toTs);
    }
    // Apply rating filter (local)
    if (ratingFilter !== 'All') {
      if (ratingFilter === '>=4') list = list.filter(r => 'rating' in r && r.rating >= 4);
      else if (ratingFilter === '>=3') list = list.filter(r => 'rating' in r && r.rating >= 3);
      else if (ratingFilter === '<=2') list = list.filter(r => 'rating' in r && r.rating <= 2);
    }
    // Preserve legacy `filter=new` deep link for convenience
    if (filter === 'new') list = list.filter(i => i.status === 'Unread' || i.status === 'Needs Response');
    return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [interactions, currentWorkspace, filter, filters.platforms, filters.status, filters.search, filters.dateRange?.from, filters.dateRange?.to, ratingFilter]);

  // Keep URL in sync with filters for shareable links (preserve legacy filter=new when present)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (filter === 'new') params.set('filter', 'new');
    if (filters.platforms.length) params.set('platforms', filters.platforms.join(','));
    if (filters.status !== 'All') params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.dateRange.from) params.set('from', filters.dateRange.from);
    if (filters.dateRange.to) params.set('to', filters.dateRange.to);
    if (ratingFilter !== 'All') params.set('rating', ratingFilter);
    const qs = params.toString();
    const href = `/reviews${qs ? `?${qs}` : ''}`;
    if (href !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', href);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.platforms.join(','), filters.status, filters.search, filters.dateRange.from, filters.dateRange.to, ratingFilter]);

  // Listen for palette share event to export CSV (for ?export=csv link)
  useEffect(() => {
    const handler = () => {
      const rows = reviews.map(r => ({
        id: r.id,
        platform: r.platform,
        rating: 'rating' in r ? r.rating : '',
        status: r.status,
        createdAt: r.createdAt,
        content: ('content' in r && typeof r.content === 'string' ? r.content : '').replace(/\n/g, ' '),
      }));
      const header = Object.keys(rows[0] || { id: '', platform: '', rating: '', status: '', createdAt: '', content: '' });
      const csv = [header.join(','), ...rows.map(row => header.map(k => {
        const val = String((row as Record<string, unknown>)[k] ?? '');
        const escaped = '"' + val.replace(/"/g, '""') + '"';
        return val.includes(',') || val.includes('"') ? escaped : val;
      }).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reviews.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
    if (typeof window !== 'undefined') window.addEventListener('revu-export-reviews-csv', handler as EventListener);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('revu-export-reviews-csv', handler as EventListener); };
  }, [reviews]);

  const starRow = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <div className="space-y-6">
      {/* AI magic CTA bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-md border border-[var(--border)] section-background-alt">
        <span className="text-sm text-secondary-dark">Quick actions:</span>
        <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => router.push('/engagement?play=1')}>✨ Play timeline</Button>
        <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => router.push('/engagement')}>✨ Generate 3 replies</Button>
        <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => {
          const range = `${filters.dateRange.from || 'All time'} → ${filters.dateRange.to || 'Today'}`;
          const filtersLabel = [
            filters.platforms.length ? `Platforms: ${filters.platforms.join('/')}` : null,
            filters.status !== 'All' ? `Status: ${filters.status}` : null,
            ratingFilter !== 'All' ? `Rating: ${ratingFilter}` : null,
            filters.search ? `Search: ${filters.search}` : null,
          ].filter(Boolean).join(' • ');
          const rows = reviews.slice(0, 50).map(r => ({
            date: new Date(r.createdAt).toLocaleDateString(),
            rating: 'rating' in r ? r.rating : '',
            platform: r.platform,
            status: r.status,
            content: ('content' in r && typeof r.content === 'string' ? r.content : '').replace(/\n/g,' '),
          }));
          downloadReviewsPDF({ title: 'Revu — Reviews Export', range, filters: filtersLabel, rows });
        }}>📄 Export PDF</Button>
        <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => {
          // email prefill with current link
          const link = `${window.location.origin}${window.location.pathname}${window.location.search}`;
          openPrefilledEmail('me@example.com', 'Revu — Reviews summary', `Here is the current Reviews view link to share or export later:\n${link}`);
        }}>📧 Email me this</Button>
      </div>
      <h1 className="text-2xl font-bold text-primary-dark">Review Hub {filter === 'new' ? '— New' : ''}</h1>

  {/* Saved Views */}
      <div className="flex flex-wrap items-center gap-2" data-tour="saved-views">
        {savedViews.filter(v => v.route.startsWith('/reviews')).map((v) => (
          <button
            key={v.id}
            className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt"
            onClick={() => router.push(v.route)}
            title={new Date(v.createdAt).toLocaleString()}
          >
            {v.name}
          </button>
        ))}
        <button
          className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt"
          onClick={() => {
            const name = prompt('Name this view:');
            if (!name) return;
            const params = new URLSearchParams();
            if (filters.platforms.length) params.set('platforms', filters.platforms.join(','));
            if (filters.status !== 'All') params.set('status', filters.status);
            if (filters.search) params.set('search', filters.search);
            if (filters.dateRange.from) params.set('from', filters.dateRange.from);
            if (filters.dateRange.to) params.set('to', filters.dateRange.to);
            if (ratingFilter !== 'All') params.set('rating', ratingFilter);
            const route = `/reviews?${params.toString()}`;
            addSavedView({ id: `sv_${Date.now()}`, name, route, createdAt: new Date().toISOString() });
            try { useStore.getState().setTour({ step: 5 }); } catch {}
          }}
        >Save view</button>
        <button
          className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt"
          onClick={async () => {
            const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
            try { await navigator.clipboard.writeText(url); } catch {}
          }}
        >Copy link</button>
        <button
          className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt"
          onClick={() => {
            const ownViews = savedViews.filter(v => v.route.startsWith('/reviews'));
            if (ownViews.length === 0) return;
            const last = ownViews[0];
            if (confirm(`Delete saved view "${last.name}"?`)) removeSavedView(last.id);
          }}
        >Delete last</button>
      </div>

      {/* Filter bar */}
      <Card className="card-background border-[var(--border)]">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          {/* Platforms */}
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => {
              const active = filters.platforms.includes(p);
              return (
                <Badge
                  key={p}
                  variant={active ? 'default' : 'outline'}
                  className={active ? 'brand-background brand-text cursor-pointer' : 'cursor-pointer'}
                  onClick={() => setFilters({ platforms: active ? filters.platforms.filter(x => x !== p) : [...filters.platforms, p] })}
                >
                  {p}
                </Badge>
              );
            })}
          </div>

          {/* Status */}
          <select
            className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as typeof statuses[number] })}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Rating */}
          <select
            className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm"
            value={ratingFilter}
            onChange={(e) => {
              const v = e.target.value as typeof ratingFilter;
              setRatingFilter(v);
              // push to URL so links include rating
              const params = new URLSearchParams(window.location.search);
              if (v === 'All') params.delete('rating'); else params.set('rating', v);
              if (filters.platforms.length) params.set('platforms', filters.platforms.join(',')); else params.delete('platforms');
              if (filters.status !== 'All') params.set('status', filters.status); else params.delete('status');
              if (filters.search) params.set('search', filters.search); else params.delete('search');
              if (filters.dateRange.from) params.set('from', filters.dateRange.from); else params.delete('from');
              if (filters.dateRange.to) params.set('to', filters.dateRange.to); else params.delete('to');
              const href = `/reviews?${params.toString()}`;
              window.history.replaceState(null, '', href);
            }}
          >
            {['All','>=4','>=3','<=2'].map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All ratings' : s}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm"
              value={filters.dateRange.from || ''}
              onChange={(e) => setFilters({ dateRange: { ...filters.dateRange, from: e.target.value } })}
            />
            <span className="text-sm text-secondary-dark">to</span>
            <input
              type="date"
              className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm"
              value={filters.dateRange.to || ''}
              onChange={(e) => setFilters({ dateRange: { ...filters.dateRange, to: e.target.value } })}
            />
          </div>

          {/* Search */}
          <Input
            placeholder="Search by keyword, author, or content..."
            className="max-w-sm card-background border-[var(--border)]"
            value={filters.search}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({ search: val });
              const params = new URLSearchParams(window.location.search);
              if (val) params.set('search', val); else params.delete('search');
              const href = `/reviews?${params.toString()}`;
              window.history.replaceState(null, '', href);
            }}
          />

          {/* Clear */}
          <Button variant="ghost" onClick={() => { setFilters({ platforms: [], status: 'All', search: '', dateRange: {} }); setRatingFilter('All'); }}>Clear</Button>
          <Button
            variant="outline"
            className="border-[var(--border)]"
            onClick={() => {
              const rows = reviews.map(r => ({
                id: r.id,
                platform: r.platform,
                rating: 'rating' in r ? r.rating : '',
                status: r.status,
                createdAt: r.createdAt,
                content: ('content' in r && typeof r.content === 'string' ? r.content : '').replace(/\n/g, ' '),
              }));
              const header = Object.keys(rows[0] || { id: '', platform: '', rating: '', status: '', createdAt: '', content: '' });
              const csv = [header.join(','), ...rows.map(row => header.map(k => {
                const val = String((row as Record<string, unknown>)[k] ?? '');
                const escaped = '"' + val.replace(/"/g, '""') + '"';
                return val.includes(',') || val.includes('"') ? escaped : val;
              }).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'reviews.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >Export CSV</Button>
          <Button
            className="button-primary ml-auto"
            onClick={() => {
              const range = `${filters.dateRange.from || 'All time'} → ${filters.dateRange.to || 'Today'}`;
              const filtersLabel = [
                filters.platforms.length ? `Platforms: ${filters.platforms.join('/')}` : null,
                filters.status !== 'All' ? `Status: ${filters.status}` : null,
                ratingFilter !== 'All' ? `Rating: ${ratingFilter}` : null,
                filters.search ? `Search: ${filters.search}` : null,
              ].filter(Boolean).join(' • ');
              const rows = reviews.slice(0, 200).map(r => ({
                date: new Date(r.createdAt).toLocaleDateString(),
                rating: 'rating' in r ? r.rating : '',
                platform: r.platform,
                status: r.status,
                content: ('content' in r && typeof r.content === 'string' ? r.content : '').replace(/\n/g,' '),
              }));
              downloadReviewsPDF({ title: 'Revu — Reviews Export', range, filters: filtersLabel, rows });
            }}
          >Export PDF</Button>
        </CardContent>
      </Card>

      {reviews.slice(0, limit).map((r) => (
        <Card key={r.id} className="card-background border-[var(--border)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {'rating' in r ? (
                <div className="text-yellow-500 whitespace-nowrap">{starRow(r.rating)}</div>
              ) : (
                <div className="text-yellow-500 whitespace-nowrap">{starRow(0)}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-dark">{r.platform}</span>
                  <span className="text-sm text-secondary-dark">• {'location' in r && r.location ? r.location : 'General'}</span>
                  <Badge variant="outline" className="ml-auto border-[var(--border)]">{r.status}</Badge>
                </div>
                <div className="mt-1 text-primary-dark">{r.content}</div>
                <div className="mt-2 text-xs text-muted-dark">{new Date(r.createdAt).toLocaleString()}</div>
        {'ownerResponse' in r && r.ownerResponse ? (
                  <div className="mt-3 p-3 rounded-md bg-[var(--section-bg-alt)] text-sm">
                    <div className="text-xs text-muted-dark">Owner response:</div>
          <div className="text-primary-dark">{r.ownerResponse.content}</div>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                {r.status !== 'Responded' && (
                  <Button size="sm" className="button-primary" onClick={() => updateInteraction(r.id, { status: 'Responded' } as Partial<Interaction>)}>Mark Responded</Button>
                )}
                {r.status !== 'Archived' && (
                  <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => updateInteraction(r.id, { status: 'Archived' } as Partial<Interaction>)}>Archive</Button>
                )}
                {r.status === 'Unread' && (
                  <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => updateInteraction(r.id, { status: 'Needs Response' } as Partial<Interaction>)}>Needs Response</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => {
                  const needle = r.content.slice(0, 40) || r.author.name;
                  router.push(`/engagement?search=${encodeURIComponent(needle)}`);
                }}>Engage</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {limit < reviews.length && (
        <div className="flex justify-center">
          <Button className="button-primary" onClick={() => setLimit(limit + 50)}>Load more</Button>
        </div>
      )}
    </div>
  );
}