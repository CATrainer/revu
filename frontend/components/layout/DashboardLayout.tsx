// frontend/components/layout/DashboardLayout.tsx
'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useStore } from '@/lib/store';
import { pushToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { tour, setTour, addSavedView, filters, addTemplate, savedViews, setTheme, interactions, currentWorkspace } = useStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const router = useRouter();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // Anchor tooltip to current step's target
  useEffect(() => {
    const map: Record<number, string> = {
      1: '[data-tour="quick-actions"]',
      2: '[data-tour="ai-suggest"]',
      3: '[data-tour="export-report"]',
      4: '[data-tour="saved-views"]',
      5: '[data-tour="settings-notifications"]',
    };
    const sel = map[tour.step];
    if (!sel) { setAnchorRect(null); return; }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) { setAnchorRect(null); return; }
    setAnchorRect(el.getBoundingClientRect());
  }, [tour.step]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
  <div className="h-screen flex overflow-hidden section-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Demo persona banner */}
              {(() => {
                const { scenario, setScenario, demoBannerDismissed, setDemoBannerDismissed } = useStore.getState();
                if (demoBannerDismissed) return null;
                const label = scenario === 'creator' ? 'Creator' : scenario === 'business' ? 'Business' : scenario === 'agency-creators' ? 'Agency (Creators)' : 'Agency (Businesses)';
                const blurb = scenario === 'creator'
                  ? 'You are viewing a Creator demo. Content and AI replies skew to audience engagement.'
                  : scenario === 'business'
                    ? 'You are viewing a Business demo. Reviews and owner responses reflect a local brand.'
                    : scenario === 'agency-creators'
                      ? 'Agency demo (Creators): portfolio-wide monitoring across creator accounts.'
                      : 'Agency demo (Businesses): multi-location brand reputation at a glance.';
                return (
                  <div className="mb-4 p-3 rounded-md border border-[var(--border)] section-background-alt">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="text-sm text-secondary-dark flex-1">
                        <span className="font-medium text-primary-dark">Demo Mode — {label}.</span> {blurb}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Scenario"
                          className="card-background border-[var(--border)] rounded-md px-2 py-1 text-sm"
                          value={scenario}
                          onChange={(e) => setScenario(e.target.value as typeof scenario)}
                        >
                          <option value="creator">Creator</option>
                          <option value="business">Business</option>
                          <option value="agency-creators">Agency (Creators)</option>
                          <option value="agency-businesses">Agency (Businesses)</option>
                        </select>
                        <button className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt" onClick={() => setDemoBannerDismissed(true)}>Dismiss</button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => router.push('/engagement?play=1')}>▶ AI Magic: Play Timeline</Button>
                      <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => router.push('/engagement')}>✨ Generate 3 on-brand replies</Button>
                      <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => router.push('/analytics')}>📄 Export Summary PDF</Button>
                      <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => router.push('/reviews?filter=new')}>🧭 Jump to “New Reviews”</Button>
                    </div>
                  </div>
                );
              })()}
              {children}
            </div>
          </div>
        </main>

        {/* Guided tour hint bar */}
        {!tour.completed && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-md border border-[var(--border)] card-background shadow">
            <span className="text-sm text-primary-dark">
              {tour.step === 0 && 'Take a 60s tour of Revu.'}
              {tour.step === 1 && 'Step 1: Use Quick Actions to jump into New Reviews.'}
              {tour.step === 2 && 'Step 2: Try AI Suggest in Engagement with different tones and templates.'}
              {tour.step === 3 && 'Step 3: Check Analytics and export a branded report.'}
              {tour.step === 4 && 'Step 4: Save and share a filtered Reviews view.'}
              {tour.step === 5 && 'Step 5: Tweak notification noise in Settings.'}
            </span>
            {tour.step === 0 ? (
              <button className="ml-3 text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt" onClick={() => setTour({ step: 1 })}>Start</button>
            ) : (
              <>
                <button className="ml-3 text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt" onClick={() => {
                  // Navigate, but let step progression happen when user completes the action on the page
                  if (tour.step === 1) router.push('/reviews?filter=new');
                  if (tour.step === 2) router.push('/engagement');
                  if (tour.step === 3) router.push('/analytics');
                }}>Go</button>
                <button className="ml-2 text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt" onClick={() => setTour({ completed: true })}>Done</button>
              </>
            )}
          </div>
        )}

        {/* Anchored tour tooltip */}
        {!tour.completed && anchorRect && (
          <div
            className="fixed z-50 px-3 py-2 rounded-md border border-[var(--border)] card-background shadow"
            style={{ top: anchorRect.bottom + 8, left: Math.min(anchorRect.left, window.innerWidth - 280) }}
          >
            <div className="text-xs text-secondary-dark">Tour</div>
            <div className="text-sm text-primary-dark">
              {tour.step === 1 && 'Quick Actions jump you into common workflows.'}
              {tour.step === 2 && 'Use AI Suggest to draft responses with different tones.'}
              {tour.step === 3 && 'Export a branded PDF report for stakeholders.'}
              {tour.step === 4 && 'Save a view here to revisit filters fast.'}
              {tour.step === 5 && 'Adjust notification rules and mute noisy platforms.'}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt"
                onClick={() => setTour({ step: Math.max(1, tour.step - 1) })}
              >Back</button>
              <button
                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt"
                onClick={() => {
          if (tour.step >= 5) setTour({ completed: true });
          else setTour({ step: tour.step + 1 });
                }}
        >{tour.step >= 5 ? 'Finish' : 'Next'}</button>
            </div>
            {/* Arrow */}
            <div className="absolute -top-1 left-4 w-2 h-2 rotate-45 bg-[var(--card-bg,white)] border-l border-t border-[var(--border)]"></div>
          </div>
        )}

        {/* Command palette mock */}
        {paletteOpen && (
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setPaletteOpen(false)}>
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-xl card-background border border-[var(--border)] rounded-md shadow">
              <div className="p-3 border-b border-[var(--border)] text-sm text-secondary-dark">Command Palette</div>
              <ul className="p-3 space-y-2 text-sm">
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { router.push('/reviews'); setPaletteOpen(false); }}>Go to Reviews</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { router.push('/engagement'); setPaletteOpen(false); }}>Go to Engagement</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { router.push('/analytics'); setPaletteOpen(false); }}>Go to Analytics</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { setTheme('light'); setPaletteOpen(false); }}>Theme: Light</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { setTheme('dark'); setPaletteOpen(false); }}>Theme: Dark</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { setTheme('system'); setPaletteOpen(false); }}>Theme: System</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { router.push('/settings?tab=Notifications'); setPaletteOpen(false); }}>Open Settings → Notifications</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => {
                  const name = prompt('Name this view:');
                  if (!name) return;
                  const params = new URLSearchParams();
                  if (filters.platforms?.length) params.set('platforms', filters.platforms.join(','));
                  if (filters.status && filters.status !== 'All') params.set('status', filters.status);
                  if (filters.sentiment && filters.sentiment !== 'All') params.set('sentiment', filters.sentiment);
                  if (filters.search) params.set('search', filters.search);
                  const route = `${window.location.pathname}?${params.toString()}`;
                  addSavedView({ id: `sv_${Date.now()}`, name, route, createdAt: new Date().toISOString() });
                  pushToast('View saved', 'success');
                  setPaletteOpen(false);
                }}>Save current view</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { pushToast('AI Suggest on latest (demo)', 'info'); setPaletteOpen(false); }}>Run AI Suggest on latest</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { 
                  const hasPlay = typeof window !== 'undefined' && window.location.pathname.startsWith('/engagement') && new URLSearchParams(window.location.search).get('play') === '1';
                  router.push(hasPlay ? '/engagement' : '/engagement?play=1');
                  setPaletteOpen(false);
                }}>Toggle timeline playback</li>
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/reviews') ? (
                  <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => {
                    // Export Reviews CSV based on store filters (subset of Reviews page logic, without rating)
                    const ws = currentWorkspace;
                    const filtered = interactions
                      .filter((i) => i.kind === 'review')
                      .filter((i) => (ws ? (i.workspaceId === ws.id || (ws.id === 'agency' && i.workspaceId === 'agency')) : true))
                      .filter((i) => (filters.platforms.length ? filters.platforms.includes(i.platform) : true))
                      .filter((i) => (filters.status !== 'All' ? i.status === filters.status : true))
                      .filter((i) => (filters.search ? `${i.content} ${i.author.name}`.toLowerCase().includes(filters.search.toLowerCase()) : true))
                      .filter((i) => (filters.dateRange?.from ? (+new Date(i.createdAt) >= +new Date(filters.dateRange.from)) : true))
                      .filter((i) => (filters.dateRange?.to ? (+new Date(i.createdAt) <= +new Date(filters.dateRange.to)) : true))
                      .slice(0, 200);
                    const header = ['id','platform','rating','status','createdAt','content'];
                    const rows = filtered.map((r) => ({
                      id: r.id,
                      platform: r.platform,
                      rating: 'rating' in r ? r.rating : '',
                      status: r.status,
                      createdAt: r.createdAt,
                      content: r.content.replace(/\n/g, ' '),
                    }));
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
                    setPaletteOpen(false);
                  }}>Export Reviews CSV</li>
                ) : null}
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/reviews') ? (
                  <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={async () => {
                    // Build a shareable CSV link that encodes current filters and triggers csv export via ?export=csv
                    const params = new URLSearchParams(window.location.search);
                    if (filters.platforms?.length) params.set('platforms', filters.platforms.join(','));
                    if (filters.status && filters.status !== 'All') params.set('status', filters.status);
                    if (filters.sentiment && filters.sentiment !== 'All') params.set('sentiment', filters.sentiment);
                    if (filters.search) params.set('search', filters.search);
                    if (filters.dateRange?.from) params.set('from', filters.dateRange.from);
                    if (filters.dateRange?.to) params.set('to', filters.dateRange.to);
                    params.set('export', 'csv');
                    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                    try { await navigator.clipboard.writeText(url); pushToast('CSV link copied','success'); } catch { /* noop */ }
                    setPaletteOpen(false);
                  }}>Copy CSV link</li>
                ) : null}
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/engagement') ? (
                  <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => {
                    const name = prompt('Name this view from current filters:');
                    if (!name) return;
                    const params = new URLSearchParams();
                    if (filters.platforms.length) params.set('platforms', filters.platforms.join(','));
                    if (filters.status !== 'All') params.set('status', filters.status);
                    if (filters.sentiment !== 'All') params.set('sentiment', filters.sentiment);
                    if (filters.search) params.set('search', filters.search);
                    const route = `/engagement?${params.toString()}`;
                    addSavedView({ id: `sv_${Date.now()}`, name, route, createdAt: new Date().toISOString() });
                    pushToast('View saved from selection','success');
                    setPaletteOpen(false);
                  }}>Create saved view from selection</li>
                ) : null}
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); pushToast('Link copied', 'success'); } catch {} setPaletteOpen(false); }}>Copy link</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { setTour({ completed: false, step: 0 }); pushToast('Tour restarted','info'); setPaletteOpen(false); }}>Restart tour</li>
                <li className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { const name = prompt('Template name:'); if (!name) return; const content = prompt('Template content:'); if (!content) return; addTemplate({ id: `tpl_${Date.now()}`, name, content }); pushToast('Template created', 'success'); setPaletteOpen(false); }}>Create new template</li>
                {/* Saved views quick nav */}
                {(() => {
                  const path = typeof window !== 'undefined' ? window.location.pathname : '';
                  const views = savedViews.filter(v => v.route.startsWith(path)).slice(0, 5);
                  if (views.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-[var(--border)]">
                      <div className="text-[11px] uppercase tracking-wide text-secondary-dark mb-1">Saved views</div>
                      {views.map(v => (
                        <div key={v.id} className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => { router.push(v.route); setPaletteOpen(false); }}>{v.name}</div>
                      ))}
                    </div>
                  );
                })()}
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/engagement') ? (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <div className="text-[11px] uppercase tracking-wide text-secondary-dark mb-1">Exports</div>
                    <div className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => {
                      // Export a minimal CSV of current engagement feed
                      const rows = interactions
                        .filter(i => !currentWorkspace || i.workspaceId === currentWorkspace.id)
                        .slice(0, 200)
                        .map(i => ({ id: i.id, kind: i.kind, platform: i.platform, status: i.status, sentiment: i.sentiment, createdAt: i.createdAt, content: i.content.replace(/\n/g,' ') }));
                      const header = Object.keys(rows[0] || { id: '', kind: '', platform: '', status: '', sentiment: '', createdAt: '', content: '' });
                      const csv = [header.join(','), ...rows.map(r => header.map(k => {
                        const val = String((r as Record<string, unknown>)[k] ?? '');
                        const escaped = '"' + val.replace(/"/g, '""') + '"';
                        return val.includes(',') || val.includes('"') ? escaped : val;
                      }).join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'engagement.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                      setPaletteOpen(false);
                    }}>Export Engagement CSV</div>
                    <div className="hover:section-background-alt px-2 py-1 rounded cursor-pointer" onClick={() => {
                      // Quick summary PDF via existing helper on analytics page; for palette, build a small summary here
                      const bySent: Record<string, number> = {};
                      interactions.forEach(i => { bySent[i.sentiment] = (bySent[i.sentiment] || 0) + 1; });
                      const stats: Array<[string,string]> = [
                        ['Total items', String(interactions.length)],
                        ...Object.entries(bySent).map(([k,v]) => [k, String(v)]) as Array<[string,string]>,
                      ];
                      // Lazy import of PDF util not feasible here; instead, create simple HTML and print
                      const w = window.open('', '_blank');
                      if (w) {
                        w.document.write(`<html><head><title>Revu — Engagement Summary</title></head><body><h1>Revu — Engagement Summary</h1><table border=1 cellpadding=6>${stats.map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table></body></html>`);
                        w.document.close();
                        w.focus();
                        w.print();
                      }
                      setPaletteOpen(false);
                    }}>Export Engagement Summary PDF</div>
                  </div>
                ) : null}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}