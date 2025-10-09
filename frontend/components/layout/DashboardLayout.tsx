"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { features } from '@/lib/features';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useStore } from '@/lib/store';
import { pushToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { FeedbackWidget } from '@/components/shared/FeedbackWidget';

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
      {/* Sidebar removed - navigation now in header */}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none scrollbar-nice">
          <div className="section-pad">
            <div className="content-container">
              {/* Demo persona banner removed */}
              {children}
            </div>
          </div>
        </main>

        {/* Guided tour hint bar (conditional via feature flag) */}
        {features.showLoginTour && !tour.completed && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-md border border-[var(--border)] card-background shadow">
            <span className="text-sm text-primary-dark">
              {tour.step === 0 && 'Take a 60s tour of Revu.'}
              {tour.step === 1 && 'Step 1: Use Quick Actions to jump into Comments.'}
              {tour.step === 2 && 'Export a branded PDF report for stakeholders.'}
              {tour.step === 3 && 'Save a view here to revisit filters fast.'}
              {tour.step === 4 && 'Adjust notification rules and mute noisy platforms.'}
            </span>
            {tour.step === 0 ? (
              <button className="ml-3 text-xs px-2 py-1 rounded border border-[var(--border)] hover-background" onClick={() => setTour({ step: 1 })}>Start</button>
            ) : (
              <>
                <button className="ml-3 text-xs px-2 py-1 rounded border border-[var(--border)] hover-background" onClick={() => {
                  // Navigate, but let step progression happen when user completes the action on the page
                  if (tour.step === 1) router.push('/interactions');
                  if (tour.step === 2) router.push('/analytics');
                }}>Go</button>
                <button className="ml-2 text-xs px-2 py-1 rounded border border-[var(--border)] hover-background" onClick={() => setTour({ completed: true })}>Done</button>
              </>
            )}
          </div>
        )}

        {/* Anchored tour tooltip (conditional via feature flag) */}
        {features.showLoginTour && !tour.completed && anchorRect && (
          <div
            className="fixed z-50 px-3 py-2 rounded-md border border-[var(--border)] card-background shadow"
            style={{ top: anchorRect.bottom + 8, left: Math.min(anchorRect.left, window.innerWidth - 280) }}
          >
            <div className="text-xs text-secondary-dark">Tour</div>
            <div className="text-sm text-primary-dark">
              {tour.step === 1 && 'Quick Actions jump you into common workflows.'}
              {tour.step === 2 && 'Export a branded PDF report for stakeholders.'}
              {tour.step === 3 && 'Save a view here to revisit filters fast.'}
              {tour.step === 4 && 'Adjust notification rules and mute noisy platforms.'}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover-background"
                onClick={() => setTour({ step: Math.max(1, tour.step - 1) })}
              >Back</button>
              <button
                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover-background"
                onClick={() => {
                  if (tour.step >= 4) setTour({ completed: true });
                  else setTour({ step: tour.step + 1 });
                }}
        >{tour.step >= 4 ? 'Finish' : 'Next'}</button>
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
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { router.push('/interactions'); setPaletteOpen(false); }}>Go to Interactions</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { router.push('/insights'); setPaletteOpen(false); }}>Go to Insights</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { router.push('/analytics'); setPaletteOpen(false); }}>Go to Analytics</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { setTheme('light'); setPaletteOpen(false); }}>Theme: Light</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { setTheme('dark'); setPaletteOpen(false); }}>Theme: Dark</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { setTheme('system'); setPaletteOpen(false); }}>Theme: System</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { router.push('/settings?tab=Notifications'); setPaletteOpen(false); }}>Open Settings → Notifications</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => {
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
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { pushToast('AI Suggest on latest (demo)', 'info'); setPaletteOpen(false); }}>Run AI Suggest on latest</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { 
                  const hasPlay = typeof window !== 'undefined' && window.location.pathname.startsWith('/engagement') && new URLSearchParams(window.location.search).get('play') === '1';
                  router.push(hasPlay ? '/engagement' : '/engagement?play=1');
                  setPaletteOpen(false);
                }}>Toggle timeline playback</li>
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/comments') ? (
                  <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => {
                    // Export Comments CSV based on store filters
                    const ws = currentWorkspace;
                    const filtered = interactions
                      .filter((i) => i.kind === 'comment')
                      .filter((i) => (ws ? (i.workspaceId === ws.id || (ws.id === 'agency' && i.workspaceId === 'agency')) : true))
                      .filter((i) => (filters.platforms.length ? filters.platforms.includes(i.platform) : true))
                      .filter((i) => (filters.status !== 'All' ? i.status === filters.status : true))
                      .filter((i) => (filters.search ? `${i.content} ${i.author.name}`.toLowerCase().includes(filters.search.toLowerCase()) : true))
                      .filter((i) => (filters.dateRange?.from ? (+new Date(i.createdAt) >= +new Date(filters.dateRange.from)) : true))
                      .filter((i) => (filters.dateRange?.to ? (+new Date(i.createdAt) <= +new Date(filters.dateRange.to)) : true))
                      .slice(0, 200);
                    const header = ['id','platform','status','createdAt','content'];
                    const rows = filtered.map((r) => ({
                      id: r.id,
                      platform: r.platform,
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
                    a.download = 'interactions.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                    setPaletteOpen(false);
                  }}>Export Interactions CSV</li>
                ) : null}
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/comments') ? (
                  <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={async () => {
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
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/comments') ? (
                  <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => {
                    const name = prompt('Name this view from current filters:');
                    if (!name) return;
                    const params = new URLSearchParams();
                    if (filters.platforms.length) params.set('platforms', filters.platforms.join(','));
                    if (filters.status !== 'All') params.set('status', filters.status);
                    if (filters.sentiment !== 'All') params.set('sentiment', filters.sentiment);
                    if (filters.search) params.set('search', filters.search);
                    const route = `/comments?${params.toString()}`;
                    addSavedView({ id: `sv_${Date.now()}`, name, route, createdAt: new Date().toISOString() });
                    pushToast('View saved from selection','success');
                    setPaletteOpen(false);
                  }}>Create saved view from selection</li>
                ) : null}
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); pushToast('Link copied', 'success'); } catch {} setPaletteOpen(false); }}>Copy link</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { setTour({ completed: false, step: 0 }); pushToast('Tour restarted','info'); setPaletteOpen(false); }}>Restart tour</li>
                <li className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { const name = prompt('Template name:'); if (!name) return; const content = prompt('Template content:'); if (!content) return; addTemplate({ id: `tpl_${Date.now()}`, name, content }); pushToast('Template created', 'success'); setPaletteOpen(false); }}>Create new template</li>
                {/* Saved views quick nav */}
                {(() => {
                  const path = typeof window !== 'undefined' ? window.location.pathname : '';
                  const views = savedViews.filter(v => v.route.startsWith(path)).slice(0, 5);
                  if (views.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-[var(--border)]">
                      <div className="text-[11px] uppercase tracking-wide text-secondary-dark mb-1">Saved views</div>
                      {views.map(v => (
                        <div key={v.id} className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => { router.push(v.route); setPaletteOpen(false); }}>{v.name}</div>
                      ))}
                    </div>
                  );
                })()}
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/comments') ? (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <div className="text-[11px] uppercase tracking-wide text-secondary-dark mb-1">Exports</div>
                    <div className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => {
                      // Export a minimal CSV of current comments feed
                      const rows = interactions
                        .filter(i => !currentWorkspace || i.workspaceId === currentWorkspace.id)
                        .slice(0, 200)
                        .map(i => ({ id: i.id, platform: i.platform, status: i.status, sentiment: i.sentiment, createdAt: i.createdAt, content: i.content.replace(/\n/g,' ') }));
                      const header = Object.keys(rows[0] || { id: '', kind: '', platform: '', status: '', sentiment: '', createdAt: '', content: '' });
                      const { branding: b } = useStore.getState();
                      const brandTop = b?.useBrandingInExports ? [[`Brand: ${b.headerText || 'Revu'}`].join(',')] : [];
                      const csv = [
                        ...brandTop,
                        header.join(','),
                        ...rows.map(r => header.map(k => {
                        const val = String((r as Record<string, unknown>)[k] ?? '');
                        const escaped = '"' + val.replace(/"/g, '""') + '"';
                        return val.includes(',') || val.includes('"') ? escaped : val;
                      }).join(','))
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'comments.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                      setPaletteOpen(false);
                    }}>Export Engagement CSV</div>
                    <div className="hover-background px-2 py-1 rounded cursor-pointer" onClick={() => {
                      // Quick summary PDF via existing helper on analytics page; for palette, build a small summary here
                      const bySent: Record<string, number> = {};
                      interactions.forEach(i => { bySent[i.sentiment] = (bySent[i.sentiment] || 0) + 1; });
                      const stats: Array<[string,string]> = [
                        ['Total comments', String(interactions.length)],
                        ...Object.entries(bySent).map(([k,v]) => [k, String(v)]) as Array<[string,string]>,
                      ];
                      // Lazy import of PDF util not feasible here; instead, create simple HTML and print
                      const w = window.open('', '_blank');
                      if (w) {
                        w.document.write(`<html><head><title>Revu — Comments Summary</title></head><body><h1>Revu — Comments Summary</h1><table border=1 cellpadding=6>${stats.map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table></body></html>`);
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

        {/* Feedback Widget */}
        <FeedbackWidget />
      </div>
    </div>
  );
}