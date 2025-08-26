'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Reply, Sparkles, Tag, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { generateAllDemoData } from '@/lib/demo-data';
import type { Interaction, Platform, Sentiment } from '@/lib/types';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { pushToast } from '@/components/ui/toast';
import { downloadEngagementSummaryPDF } from '@/lib/pdf-utils';
import { useAuth } from '@/lib/auth';
import { openPrefilledEmail } from '@/lib/email';

const platforms: Platform[] = ['Google', 'YouTube', 'Instagram', 'TikTok', 'Facebook', 'X/Twitter'];
const sentiments: Array<'All' | Sentiment> = ['All', 'Positive', 'Negative', 'Neutral', 'Mixed'];
const statuses: Array<'All' | 'Unread' | 'Needs Response' | 'Responded' | 'Archived'> = [
  'All',
  'Unread',
  'Needs Response',
  'Responded',
  'Archived',
];

export default function EngagementPage() {
  const searchParams = useSearchParams();
  const {
    interactions,
    setInteractions,
    addInteractions,
    currentWorkspace,
    filters,
    setFilters,
    selectedItems,
    toggleSelect,
  setSelection,
    clearSelection,
    cacheAISuggestion,
  updateInteraction,
  addNotification,
  templates,
  addSavedView,
  savedViews,
  notificationPrefs,
  addTemplate,
  setTour,
  } = useStore();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [aiOpenFor, setAiOpenFor] = useState<string | null>(null);
  const [aiTone, setAiTone] = useState<'Professional' | 'Friendly' | 'Casual' | 'Empathetic'>('Professional');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [bulkTag, setBulkTag] = useState('');
  const [assignee, setAssignee] = useState('Me');
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // seconds 0..60
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  // seed demo data
  useEffect(() => {
    if (interactions.length === 0) {
      const flavor = user?.demo_access_type === 'agency_businesses'
        ? 'agency-businesses'
        : user?.demo_access_type === 'agency_creators'
          ? 'agency-creators'
          : 'default';
      const { interactions } = generateAllDemoData(flavor as 'default' | 'agency-creators' | 'agency-businesses');
      setInteractions(interactions);
    }
  }, [interactions.length, setInteractions, user?.demo_access_type]);

  // Scenario-aware defaults on first mount
  useEffect(() => {
    const { scenario: sc } = useStore.getState();
    if (sc === 'creator') {
      setFilters({ sentiment: 'All', status: 'All' });
      setAiTone('Friendly');
    } else if (sc === 'business') {
      setFilters({ sentiment: 'All', status: 'Needs Response' });
      setAiTone('Professional');
    }
    // agencies retain current saved prefs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If navigated with query params (e.g., from Clients or Reviews), prefill the search
  useEffect(() => {
    const client = searchParams.get('client');
    if (client) setFilters({ search: `(Client: ${client})` });
    const search = searchParams.get('search');
    if (search) setFilters({ search });
  const platformsParam = searchParams.get('platforms');
  if (platformsParam) setFilters({ platforms: platformsParam.split(',').filter(Boolean) as Platform[] });
  const statusParam = searchParams.get('status');
  if (statusParam) setFilters({ status: statusParam as typeof filters.status });
  const sentimentParam = searchParams.get('sentiment');
  if (sentimentParam) setFilters({ sentiment: sentimentParam as typeof filters.sentiment });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // simulate new interactions every 30s
  useEffect(() => {
    const platformIdMap: Record<string, Platform> = {
      google: 'Google',
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      twitter: 'X/Twitter',
      tripadvisor: 'Google', // fallback mapping
    };
    const shouldNotify = (incoming: Interaction) => {
      // platform mute
      if (notificationPrefs.mutedPlatforms.map(p => platformIdMap[p]).includes(incoming.platform)) return false;
      // keywords mute
      if (notificationPrefs.muteKeywords.length) {
        const hay = `${incoming.content}`.toLowerCase();
        if (notificationPrefs.muteKeywords.some(k => hay.includes(k.toLowerCase()))) return false;
      }
      // important-only gate: negative or high-priority only
      if (notificationPrefs.mode === 'Important only') {
        if (incoming.sentiment === 'Negative') return true;
        if (incoming.priority === 'high') return true;
        return false;
      }
      return true;
    };
    const id = setInterval(() => {
      const flavor = user?.demo_access_type === 'agency_businesses'
        ? 'agency-businesses'
        : user?.demo_access_type === 'agency_creators'
          ? 'agency-creators'
          : 'default';
      const { interactions: more } = generateAllDemoData(flavor as 'default' | 'agency-creators' | 'agency-businesses');
      const incoming = more[0];
      addInteractions([incoming]);
      if (shouldNotify(incoming)) {
        addNotification({ id: `n_${incoming.id}`, title: incoming.kind === 'review' ? 'New review' : 'New mention', message: incoming.content.slice(0, 100), createdAt: new Date().toISOString(), severity: 'info' });
      }
    }, 30000);
    return () => clearInterval(id);
  }, [addInteractions, addNotification, user?.demo_access_type, notificationPrefs]);

  // Auto-export CSV via ?export=csv
  useEffect(() => {
    if (searchParams.get('export') === 'csv') {
      setTimeout(() => {
        const rows = filtered.slice(0, 200).map(i => ({ id: i.id, kind: i.kind, platform: i.platform, status: i.status, sentiment: i.sentiment, createdAt: i.createdAt, content: i.content.replace(/\n/g,' ') }));
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
        a.download = 'engagement.csv';
        a.click();
        URL.revokeObjectURL(url);
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // infinite scroll simulation
  const loadMore = () => {
    setLoading(true);
    setTimeout(() => {
      const flavor = user?.demo_access_type === 'agency_businesses'
        ? 'agency-businesses'
        : user?.demo_access_type === 'agency_creators'
          ? 'agency-creators'
          : 'default';
      const { interactions: more } = generateAllDemoData(flavor as 'default' | 'agency-creators' | 'agency-businesses');
      setInteractions([...interactions, ...more.slice(0, 50)]);
      setLoading(false);
    }, 800);
  };

  // timeline playback: emit 1 item/sec for up to 60s
  const togglePlayback = () => {
    if (playbackActive) {
      if (timerId) clearInterval(timerId);
      setTimerId(null);
      setPlaybackActive(false);
      return;
    }
    setPlaybackActive(true);
    setPlaybackProgress(0);
    const id = setInterval(() => {
      setPlaybackProgress((p) => {
        const next = p + 1;
        const flavor = user?.demo_access_type === 'agency_businesses'
          ? 'agency-businesses'
          : user?.demo_access_type === 'agency_creators'
            ? 'agency-creators'
            : 'default';
        const { interactions: more } = generateAllDemoData(flavor as 'default' | 'agency-creators' | 'agency-businesses');
        const incoming = more[0];
        addInteractions([incoming]);
        // Gate via prefs
        const platformIdMap: Record<string, Platform> = { google: 'Google', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', twitter: 'X/Twitter', tripadvisor: 'Google' };
        const hay = `${incoming.content}`.toLowerCase();
        const muted = notificationPrefs.mutedPlatforms.map(p => platformIdMap[p]).includes(incoming.platform)
          || notificationPrefs.muteKeywords.some(k => hay.includes(k.toLowerCase()));
        const important = incoming.sentiment === 'Negative' || incoming.priority === 'high';
        if (!muted && (notificationPrefs.mode === 'All' || important)) {
          addNotification({ id: `n_${incoming.id}`, title: incoming.kind === 'review' ? 'New review' : 'New mention', message: incoming.content.slice(0, 100), createdAt: new Date().toISOString(), severity: 'info' });
        }
        if (next >= 60) {
          clearInterval(id);
          setTimerId(null);
          setPlaybackActive(false);
        }
        return next;
      });
    }, 1000);
    setTimerId(id);
  };

  useEffect(() => () => { if (timerId) clearInterval(timerId); }, [timerId]);

  // Auto-start via ?play=1
  useEffect(() => {
    if (searchParams.get('play') === '1') {
      setPlaybackActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    // Scope to current workspace when selected
    const scoped = currentWorkspace
      ? interactions.filter((i) => i.workspaceId === currentWorkspace.id)
      : interactions;
    return scoped.filter((i) => {
      if (filters.platforms.length && !filters.platforms.includes(i.platform)) return false;
      if (filters.sentiment !== 'All' && i.sentiment !== filters.sentiment) return false;
      if (filters.status !== 'All' && i.status !== filters.status) return false;
      if (filters.search && !(`${i.content} ${i.author.name}`.toLowerCase().includes(filters.search.toLowerCase()))) return false;
      // date filtering omitted for brevity
      return true;
    });
  }, [interactions, filters, currentWorkspace]);

  const isCreator = useStore.getState().scenario === 'creator' || currentWorkspace?.type === 'Individual';
  const isBusiness = useStore.getState().scenario === 'business' || currentWorkspace?.type === 'Organization';
  const pageTitle = isCreator ? 'Audience Engagement' : isBusiness ? 'Responses' : 'Engagement Hub';

  const generateAIText = (it: Interaction, tone: typeof aiTone) => {
    // return a tone-customized suggestion, tailored by interaction kind/sentiment and demo subtype
    const isBusiness = user?.demo_access_type === 'business' || currentWorkspace?.type === 'Organization';
    const isCreator = user?.demo_access_type === 'creator' || currentWorkspace?.type === 'Individual';
    const prefix = tone === 'Professional' ? '' : tone === 'Friendly' ? 'Hey there! ' : tone === 'Casual' ? 'Hey! ' : 'I understand how you feel. ';
    if (it.kind === 'review') {
      if (it.sentiment === 'Negative') {
        return `${prefix}Thanks for the feedback. This isn't our standard and we'd like to make it right. Please email support@${isBusiness ? 'yourrestaurant' : 'yourbrand'}.com so we can help.`;
      }
      if ('rating' in it) {
        return `${prefix}Thanks so much for the ${isBusiness ? `${it.rating}-star ` : ''}review! We appreciate you and hope to see you again soon.`;
      }
      return `${prefix}Thanks so much for the review! We appreciate you and hope to see you again soon.`;
    }
    // comment
    if (isCreator) {
      return `${prefix}Thanks for watching! Glad you enjoyed it — more like this coming soon 🙌`;
    }
    return `${prefix}Thanks for the mention! We appreciate your support.`;
  };

  const onAISuggest = (it: Interaction, tone: typeof aiTone = aiTone) => {
    setAiOpenFor(it.id);
    setAiLoading(true);
    // simulate AI generation based on tone
    setTimeout(() => {
      const txt = generateAIText(it, tone);
      setAiText(txt);
      cacheAISuggestion(it.id, txt);
      setAiLoading(false);
  // Tour progression: if user triggered AI Suggest during step 2, advance
  try { setTour({ step: 3 }); } catch {}
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* AI magic CTA bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-md border border-[var(--border)] section-background-alt">
        <span className="text-sm text-secondary-dark">Quick actions:</span>
        <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => setPlaybackActive(true)}>▶ Play timeline</Button>
        <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => {
          // Export summary PDF for filtered list
          const byPlatform: Record<string, number> = {};
          const bySentiment: Record<string, number> = {};
          filtered.forEach((i) => {
            byPlatform[i.platform] = (byPlatform[i.platform] || 0) + 1;
            bySentiment[i.sentiment] = (bySentiment[i.sentiment] || 0) + 1;
          });
          const stats: Array<[string,string]> = [
            ['Total items', String(filtered.length)],
            ...Object.entries(bySentiment).map(([k,v]) => [String(`${k} sentiment`), String(v)]) as Array<[string,string]>,
            ...Object.entries(byPlatform).map(([k,v]) => [String(`${k} items`), String(v)]) as Array<[string,string]>,
          ];
          downloadEngagementSummaryPDF({ title: 'Revu — Engagement Summary', stats });
        }}>📄 Export PDF</Button>
        <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => {
          const link = `${window.location.origin}${window.location.pathname}${window.location.search}`;
          openPrefilledEmail(user?.email || 'me@example.com','Revu — Engagement summary', `Quick link to the current Engagement view:\n${link}`);
        }}>📧 Email me this</Button>
      </div>
      {/* Saved Views */}
      <div className="flex flex-wrap items-center gap-2">
        {savedViews.filter(v => v.route.startsWith('/engagement')).map((v) => (
          <button
            key={v.id}
            className="text-xs px-2 py-1 rounded border border-[var(--border)] hover-background"
            onClick={() => window.location.assign(v.route)}
            title={new Date(v.createdAt).toLocaleString()}
          >
            {v.name}
          </button>
        ))}
        <button
          className="text-xs px-2 py-1 rounded border border-[var(--border)] hover-background"
          onClick={() => {
            const name = prompt('Name this view:');
            if (!name) return;
            const params = new URLSearchParams();
            if (filters.platforms.length) params.set('platforms', filters.platforms.join(','));
            if (filters.status !== 'All') params.set('status', filters.status);
            if (filters.sentiment !== 'All') params.set('sentiment', filters.sentiment);
            if (filters.search) params.set('search', filters.search);
            const route = `/engagement?${params.toString()}`;
            addSavedView({ id: `sv_${Date.now()}`, name, route, createdAt: new Date().toISOString() });
          }}
        >Save view</button>
        <button
          className="text-xs px-2 py-1 rounded border border-[var(--border)] hover-background"
          onClick={async () => {
            const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
            try { await navigator.clipboard.writeText(url); } catch {}
          }}
        >Copy link</button>
      </div>

      {/* Timeline playback */}
      <Card className="card-background border-[var(--border)]">
        <CardContent className="p-4 flex items-center gap-4">
          <Button className="button-primary" onClick={togglePlayback}>{playbackActive ? 'Pause' : 'Play'} Timeline</Button>
          <Button
            variant="outline"
            className="border-[var(--border)]"
            onClick={() => {
              // Build a simple summary from current filtered view
              const byPlatform: Record<string, number> = {};
              const bySentiment: Record<string, number> = {};
              filtered.forEach((i) => {
                byPlatform[i.platform] = (byPlatform[i.platform] || 0) + 1;
                bySentiment[i.sentiment] = (bySentiment[i.sentiment] || 0) + 1;
              });
              const stats: Array<[string,string]> = [
                ['Total items', String(filtered.length)],
                ...Object.entries(bySentiment).map(([k,v]) => [String(`${k} sentiment`), String(v)]) as Array<[string,string]>,
                ...Object.entries(byPlatform).map(([k,v]) => [String(`${k} items`), String(v)]) as Array<[string,string]>,
              ];
              downloadEngagementSummaryPDF({ title: 'Revu — Engagement Summary', stats });
            }}
          >Export Summary PDF</Button>
          <div className="flex-1 h-2 rounded bg-[var(--section-bg-alt)] overflow-hidden">
            <div className="h-2 bg-[var(--brand-primary)]" style={{ width: `${(playbackProgress/60)*100}%` }} />
          </div>
          <span className="text-xs text-secondary-dark w-14 text-right">{playbackProgress}s</span>
        </CardContent>
      </Card>
      {/* Saved Views */}
      <div className="flex flex-wrap items-center gap-2">
        {savedViews.filter(v => v.route.startsWith('/engagement')).map((v) => (
          <button
            key={v.id}
            className="text-xs px-2 py-1 rounded border border-[var(--border)] hover-background"
            onClick={() => window.location.assign(v.route)}
            title={new Date(v.createdAt).toLocaleString()}
          >
            {v.name}
          </button>
        ))}
        <button
          className="text-xs px-2 py-1 rounded border border-[var(--border)] hover-background"
          onClick={() => {
            const name = prompt('Name this view:');
            if (!name) return;
            const params = new URLSearchParams();
            if (filters.platforms.length) params.set('platforms', filters.platforms.join(','));
            if (filters.status !== 'All') params.set('status', filters.status);
            if (filters.sentiment !== 'All') params.set('sentiment', filters.sentiment);
            if (filters.search) params.set('search', filters.search);
            const route = `/engagement?${params.toString()}`;
            addSavedView({ id: `sv_${Date.now()}`, name, route, createdAt: new Date().toISOString() });
          }}
        >Save view</button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">{pageTitle}</h1>
          <p className="text-sm text-secondary-dark mt-1">
            {isCreator && 'Reply to audience comments with on-brand, friendly AI drafts.'}
            {isBusiness && 'Triage and respond to reviews efficiently to protect your reputation.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[var(--border)]"
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                const flavor = user?.demo_access_type === 'agency_businesses'
                  ? 'agency-businesses'
                  : user?.demo_access_type === 'agency_creators'
                    ? 'agency-creators'
                    : 'default';
                const { interactions: more } = generateAllDemoData(flavor as 'default' | 'agency-creators' | 'agency-businesses');
                setInteractions(more.slice(0, 300));
                setLoading(false);
                pushToast('Feed refreshed', 'success');
              }, 500);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2"/>Refresh
          </Button>
          <Button
            className="button-primary"
            onClick={() => {
              // simulate creating an assignment from selected or latest
              const ids = selectedItems.length ? selectedItems : filtered.slice(0, 1).map((i) => i.id);
              ids.forEach((id) => updateInteraction(id, { assignedTo: 'Me' } as Partial<Interaction>));
              pushToast(`Assigned ${ids.length} item(s) to you`, 'success');
              if (ids.length > 0) setSelection([]);
            }}
          >
            New Assignment
          </Button>
        </div>
      </div>

      {/* Filter bar */}
    <Card className="card-background border-[var(--border)]">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
      <Badge variant="outline" className="border-[var(--border)] bg-yellow-50 text-yellow-700">This is demo data. Connect your accounts to see real data.</Badge>
          {/* Platform multi-select simplified as chips */}
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => {
              const active = filters.platforms.includes(p);
              return (
                <Badge
                  key={p}
                  variant={active ? 'default' : 'outline'}
                  onClick={() =>
                    setFilters({
                      platforms: active
                        ? filters.platforms.filter((x) => x !== p)
                        : [...filters.platforms, p],
                    })
                  }
                  className={active ? 'brand-background brand-text cursor-pointer' : 'cursor-pointer'}
                >
                  {p}
                </Badge>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm"
              value={filters.sentiment}
              onChange={(e) => setFilters({ sentiment: e.target.value as 'All' | Sentiment })}
            >
              {sentiments.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value as typeof statuses[number] })}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <Input
            placeholder="Search by keyword, author, or content..."
            className="max-w-sm card-background border-[var(--border)]"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />

          {/* Bulk actions */}
          {selectedItems.length > 0 && (
            <div className="ml-auto flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <input
                  value={bulkTag}
                  onChange={(e) => setBulkTag(e.target.value)}
                  placeholder="Add tag"
                  className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] text-sm"
                />
                <Button
                  variant="outline"
                  className="border-[var(--border)]"
                  onClick={() => {
                    if (!bulkTag.trim()) return pushToast('Enter a tag first', 'error');
                    selectedItems.forEach((id) => {
                      const it = interactions.find((x) => x.id === id);
                      const tags = Array.from(new Set([...(it?.tags || []), bulkTag.trim()]));
                      updateInteraction(id, { tags } as Partial<Interaction>);
                    });
                    pushToast(`Tagged ${selectedItems.length} item(s) with "${bulkTag.trim()}"`, 'success');
                    setBulkTag('');
                  }}
                >
                  <Tag className="h-4 w-4 mr-2"/>Tag
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  {['Me','Alex','Bella','Team'].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  className="border-[var(--border)]"
                  onClick={() => {
                    selectedItems.forEach((id) => updateInteraction(id, { assignedTo: assignee } as Partial<Interaction>));
                    pushToast(`Assigned ${selectedItems.length} item(s) to ${assignee}`,'success');
                    setSelection([]);
                  }}
                >
                  <Reply className="h-4 w-4 mr-2"/>Assign
                </Button>
              </div>
              <Button
                variant="outline"
                className="border-[var(--border)]"
                onClick={() => {
                  selectedItems.forEach((id) => updateInteraction(id, { status: 'Responded' } as Partial<Interaction>));
                  pushToast(`Marked ${selectedItems.length} as read`, 'success');
                  setSelection([]);
                }}
              >
                Mark as Read
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const remaining = interactions.filter((x) => !selectedItems.includes(x.id));
                  setInteractions(remaining);
                  pushToast(`Deleted ${selectedItems.length} item(s)`, 'success');
                  setSelection([]);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2"/>Delete
              </Button>
              <Button variant="ghost" onClick={clearSelection}>Clear</Button>
            </div>
          )}
          {selectedItems.length === 0 && (
            <div className="ml-auto flex items-center gap-2">
              <input type="checkbox" onChange={(e) => setSelection(e.target.checked ? filtered.slice(0, 40).map((i) => i.id) : [])} />
              <span className="text-sm text-secondary-dark">Select all</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interaction list */}
      <div className="space-y-3">
        {filtered.slice(0, 40).map((it) => (
          <Card key={it.id} className="card-background border-[var(--border)] hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <input type="checkbox" checked={selectedItems.includes(it.id)} onChange={() => toggleSelect(it.id)} className="mt-1"/>
                {it.author.avatarUrl ? (
                  <Image src={it.author.avatarUrl} width={40} height={40} className="h-10 w-10 rounded-full" alt="avatar" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-dark">{it.platform}</span>
                    <span className="text-sm text-secondary-dark">• {it.author.name}</span>
                    {it.kind === 'review' ? (
                      <span className="ml-2 text-yellow-500">{'★'.repeat(it.rating)}{'☆'.repeat(5 - it.rating)}</span>
                    ) : (
                      <span className={`h-2 w-2 rounded-full ${it.sentiment === 'Positive' ? 'bg-green-500' : it.sentiment === 'Negative' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                    )}
                    {it.priority === 'high' && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white">Priority</span>
                    )}
                    {it.replyCount ? (
                      <span className="ml-auto text-xs text-muted-dark">{it.replyCount} replies</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-primary-dark line-clamp-3">{it.content}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-dark">
                    <span>{new Date(it.createdAt).toLocaleString()}</span>
                    {it.author.followers ? <span>• {Intl.NumberFormat().format(it.author.followers)} followers</span> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="border-[var(--border)]" onClick={() => onAISuggest(it)} data-tour="ai-suggest">
                    <Sparkles className="h-4 w-4 mr-2"/>AI Suggest
                  </Button>
                  <Button variant="ghost" onClick={() => {
                    setAiOpenFor(it.id);
                    setAiText('');
                  }}>Reply</Button>
                  <Button variant="ghost" onClick={() => {
                    const reason = prompt('Report this item. Enter a reason (demo):');
                    if (reason) {
                      updateInteraction(it.id, { status: 'Reported', reportedReason: reason } as Partial<Interaction>);
                      pushToast('Item reported (demo)', 'success');
                    }
                  }}>Report</Button>
                  <Button variant="ghost" onClick={() => {
                    updateInteraction(it.id, { status: 'Archived' } as Partial<Interaction>);
                    pushToast('Archived item', 'success');
                  }}>Archive</Button>
                </div>
              </div>

              {/* AI Panel */}
              {aiOpenFor === it.id && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-secondary-dark">Tone:</span>
                    <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={aiTone} onChange={(e) => { const t = e.target.value as typeof aiTone; setAiTone(t); if (aiOpenFor === it.id) onAISuggest(it, t); }}>
                      {['Professional','Friendly','Casual','Empathetic'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {/* Templates */}
                    <select
                      className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm"
                      onChange={(e) => {
                        const tpl = templates.find(x => x.id === e.target.value);
                        if (tpl) setAiText(tpl.content);
                      }}
                    >
                      <option value="">Insert template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <Button variant="outline" className="border-[var(--border)] ml-auto" onClick={() => onAISuggest(it, aiTone)} disabled={aiLoading}>
                      {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
                      Regenerate
                    </Button>
                  </div>
                  <textarea className="w-full h-28 card-background border-[var(--border)] rounded-md p-3 text-sm" value={aiText} onChange={(e) => setAiText(e.target.value)} />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-dark">
                    <span>Characters: {aiText.length} {aiText.length > 220 && <span className="text-red-500">(May exceed some platform limits)</span>}</span>
                    <div className="flex gap-2">
                      <Button size="sm" className="button-primary" onClick={() => {
                        if (!aiText.trim()) return pushToast('Generate or type a reply first','error');
                        // mark as responded and attach our reply for display in Responded section
                        if (it.kind === 'comment') {
                          const patch: Partial<Interaction> = {
                            status: 'Responded',
                            ourReply: { content: aiText, createdAt: new Date().toISOString(), tone: aiTone },
                          };
                          updateInteraction(it.id, patch);
                        } else {
                          const patch: Partial<Interaction> = {
                            status: 'Responded',
                            ownerResponse: { content: aiText, createdAt: new Date().toISOString() },
                          };
                          updateInteraction(it.id, patch);
                        }
                        pushToast('Reply sent (demo)', 'success');
                        setAiOpenFor(null);
                      }}>Send</Button>
                      <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => pushToast('Opening composer (demo)','info')}>Edit & Send</Button>
                      <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => {
                        const name = prompt('Template name:', `Reply (${aiTone})`);
                        if (!name || !aiText.trim()) return;
                        addTemplate({ id: `tpl_${Date.now()}`, name, content: aiText, tone: aiTone });
                        pushToast('Template saved','success');
                      }}>Save as Template</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Infinite scroll control */}
        <div className="flex justify-center py-4">
          <Button onClick={() => { loadMore(); if (!loading) pushToast('Loaded more', 'success'); }} disabled={loading} className="button-primary">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
            Load more
          </Button>
        </div>
      </div>

      {/* Responded Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-primary-dark mt-8">Replied</h2>
        {filtered.filter(i => i.status === 'Responded').slice(0, 20).map((it) => (
          <Card key={`resp_${it.id}`} className="card-background border-[var(--border)]">
            <CardContent className="p-4">
              <div className="flex justify-between">
                <div className="text-primary-dark font-medium truncate pr-4">{it.content}</div>
                <Badge variant="outline" className="border-[var(--border)]">Responded</Badge>
              </div>
              <div className="mt-2 text-sm text-secondary-dark">
        {it.kind === 'comment' && 'ourReply' in it && it.ourReply ? (
                  <>
          <div className="text-xs text-muted-dark">Our reply ({it.ourReply.tone || 'Professional'}):</div>
          <div className="mt-1">{it.ourReply.content}</div>
                  </>
        ) : it.kind === 'review' && 'ownerResponse' in it && it.ownerResponse ? (
                  <>
                    <div className="text-xs text-muted-dark">Owner response:</div>
          <div className="mt-1">{it.ownerResponse.content}</div>
                  </>
                ) : (
                  <div className="text-xs">Response details not available (demo)</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Archived Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-primary-dark mt-8">Archived</h2>
        {filtered.filter(i => i.status === 'Archived').slice(0, 20).map((it) => (
          <Card key={`arch_${it.id}`} className="card-background border-[var(--border)]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-primary-dark truncate pr-4">{it.content}</div>
              <Badge variant="outline" className="border-[var(--border)]">Archived</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report dialog substitute: inline quick reason capture (demo) */}
      <div className="hidden" />
    </div>
  );
}
