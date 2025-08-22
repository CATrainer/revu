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
import { useAuth } from '@/lib/auth';

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
    currentWorkspace,
    filters,
    setFilters,
    selectedItems,
    toggleSelect,
  setSelection,
    clearSelection,
    cacheAISuggestion,
  updateInteraction,
  } = useStore();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [aiOpenFor, setAiOpenFor] = useState<string | null>(null);
  const [aiTone, setAiTone] = useState<'Professional' | 'Friendly' | 'Casual' | 'Empathetic'>('Professional');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [bulkTag, setBulkTag] = useState('');
  const [assignee, setAssignee] = useState('Me');

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

  // If navigated from Clients with a client query, prefill the search
  useEffect(() => {
    const client = searchParams.get('client');
    if (client) {
      setFilters({ search: `(Client: ${client})` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // simulate new interactions every 30s
  useEffect(() => {
    const id = setInterval(() => {
      const flavor = user?.demo_access_type === 'agency_businesses'
        ? 'agency-businesses'
        : user?.demo_access_type === 'agency_creators'
          ? 'agency-creators'
          : 'default';
      const { interactions: more } = generateAllDemoData(flavor as 'default' | 'agency-creators' | 'agency-businesses');
      setInteractions([more[0], ...interactions].slice(0, 300));
    }, 30000);
    return () => clearInterval(id);
  }, [interactions, setInteractions, user?.demo_access_type]);

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

  const onAISuggest = (it: Interaction) => {
    setAiOpenFor(it.id);
    setAiLoading(true);
    // simulate AI generation
    setTimeout(() => {
      const txt = it.kind === 'review' && it.sentiment === 'Negative'
        ? "Hi NAME, I'm truly sorry to hear about your experience. This isn't the standard we aim for. I'd like to make this right - could you please email me at manager@business.com so we can discuss this further? We value your feedback and want to ensure your next visit exceeds expectations."
        : 'Thank you so much for the love! 💕 Glad you enjoyed the recipe. Stay tuned for more delicious content coming your way!';
      setAiText(txt);
      cacheAISuggestion(it.id, txt);
      setAiLoading(false);
    }, 750);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Engagement Hub</h1>
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
                  <Button variant="outline" className="border-[var(--border)]" onClick={() => onAISuggest(it)}>
                    <Sparkles className="h-4 w-4 mr-2"/>AI Suggest
                  </Button>
                  <Button variant="ghost" onClick={() => {
                    setAiOpenFor(it.id);
                    setAiText('');
                  }}>Reply</Button>
                  <Button variant="ghost" onClick={() => {
                    updateInteraction(it.id, { status: 'Archived' } as Partial<Interaction>);
                    pushToast('Archived item', 'success');
                  }}>Archive</Button>
                </div>
              </div>

              {/* AI Panel */}
              {aiOpenFor === it.id && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-secondary-dark">Tone:</span>
                    <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={aiTone} onChange={(e) => setAiTone(e.target.value as typeof aiTone)}>
                      {['Professional','Friendly','Casual','Empathetic'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <Button variant="outline" className="border-[var(--border)] ml-auto" onClick={() => onAISuggest(it)} disabled={aiLoading}>
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
                        updateInteraction(it.id, { status: 'Responded' } as Partial<Interaction>);
                        pushToast('Reply sent (demo)', 'success');
                        setAiOpenFor(null);
                      }}>Send</Button>
                      <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => pushToast('Opening composer (demo)','info')}>Edit & Send</Button>
                      <Button size="sm" variant="outline" className="border-[var(--border)]" onClick={() => pushToast('Saved as template (demo)','success')}>Save as Template</Button>
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
    </div>
  );
}
