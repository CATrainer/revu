"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ConnectButton from '@/components/youtube/ConnectButton';
import SyncStatus from '@/components/youtube/SyncStatus';
import CommentList from '@/components/youtube/CommentList';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useVideos, useVideoSearch, useChannelComments } from '@/hooks/useYouTube';
import { listConnections } from '@/lib/api/youtube';
import type { YouTubeVideo } from '@/types/youtube';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import Link from 'next/link';

export default function CommentsPage() {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'byVideo'>('byVideo');
  const [parentsOnly, setParentsOnly] = useState(true);
  const [newestFirst, setNewestFirst] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // Per-video comments controls (apply inside modal)
  const [videoSortBy, setVideoSortBy] = useState<'newest' | 'oldest' | 'most_liked' | 'most_replies'>('newest');
  const [videoParentsOnly, setVideoParentsOnly] = useState(true);
  const [videoUnansweredOnly, setVideoUnansweredOnly] = useState(false);
  const [videoCommentQuery, setVideoCommentQuery] = useState('');

  // On mount, try to find an existing connection and store it.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const conns = await listConnections();
        if (!mounted) return;
        if (conns.length > 0) {
          setConnectionId(conns[0].id);
        }
      } catch {
        // ignore; render connect UI
      } finally {
        if (mounted) setLoadingConn(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // If connected, prefetch first page of videos and choose first by default
  const { isLoading: vidsLoading } = useVideos({ connectionId: connectionId ?? undefined, limit: 6, offset: 0, newestFirst: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Interactions</h1>
          <p className="mt-1 text-secondary-dark">Manage comments, DMs and @ mentions from connected accounts.</p>
        </div>
        {connectionId ? (
          <SyncStatus connectionId={connectionId} />
        ) : (
          <ConnectButton />
        )}
      </div>

      {/* Intro & Widgets */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">What you can do here</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-secondary-dark mb-4">
            Interactions aggregates activity across platforms. Connect your accounts to pull in Comments, DMs and @ mentions. Use Workflows to set up rules and automations for triage and responses.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/comments/dms" className="rounded-lg border border-[var(--border)] p-4 hover-background block">
              <div className="text-primary-dark font-medium">Direct Messages</div>
              <div className="text-xs text-secondary-dark mt-1">View and respond to DMs from connected platforms.</div>
            </Link>
            <Link href="/comments" className="rounded-lg border border-[var(--border)] p-4 hover-background block">
              <div className="text-primary-dark font-medium">Comments</div>
              <div className="text-xs text-secondary-dark mt-1">Monitor and reply to public comments by video or as a feed.</div>
            </Link>
            <Link href="/comments/mentions" className="rounded-lg border border-[var(--border)] p-4 hover-background block">
              <div className="text-primary-dark font-medium">@ Mentions</div>
              <div className="text-xs text-secondary-dark mt-1">Track mentions of your handle and brand across platforms.</div>
            </Link>
            <Link href="/comments/workflows" className="rounded-lg border border-[var(--border)] p-4 hover-background block">
              <div className="text-primary-dark font-medium">Workflows</div>
              <div className="text-xs text-secondary-dark mt-1">Build rules to triage, label and respond automatically.</div>
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/comments/view" className="inline-block">
              <Button className="button-primary">View Interactions</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* If not connected, show a friendly card prompting to connect */}
      {!connectionId && (
        <Card className="card-background border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-primary-dark">Connect your YouTube account</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConn ? (
              <div className="flex items-center gap-2 text-sm text-secondary-dark"><LoadingSpinner size="small" /> Checking connections…</div>
            ) : (
              <div className="space-y-2 text-secondary-dark text-sm">
                <p>Connect your channel to start syncing videos and replying to comments from your dashboard.</p>
                <ConnectButton />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {connectionId && (
        <div className="space-y-6">
          {/* Toggle + Search + Content */}
          <Card className="card-background border-[var(--border)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-primary-dark">Content</CardTitle>
                  <div className="inline-flex rounded-md border border-[var(--border)] overflow-hidden">
                    <button
                      className={`px-3 py-1.5 text-sm ${viewMode === 'byVideo' ? 'bg-primary text-white' : ''}`}
                      onClick={() => setViewMode('byVideo')}
                    >By video</button>
                    <button
                      className={`px-3 py-1.5 text-sm ${viewMode === 'all' ? 'bg-primary text-white' : ''}`}
                      onClick={() => setViewMode('all')}
                    >All</button>
                  </div>
                </div>
                <div className="w-full max-w-2xl ml-auto flex flex-wrap items-center gap-3">
                  {/* Tag filters */}
                  <TagFilters selected={selectedTags} onChange={setSelectedTags} />
                  {viewMode === 'all' && (
                    <div className="flex items-center gap-2 text-sm">
                      <label className="flex items-center gap-1">
                        <input type="checkbox" className="accent-primary" checked={parentsOnly} onChange={(e) => setParentsOnly(e.target.checked)} />
                        Parents only
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" className="accent-primary" checked={newestFirst} onChange={(e) => setNewestFirst(e.target.checked)} />
                        Newest first
                      </label>
                    </div>
                  )}
                  <label className="sr-only" htmlFor="video-search">Search videos</label>
                  <input
                    id="video-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={viewMode === 'all' ? 'Search videos (for selecting modal)…' : 'Search by title or description…'}
                    className="w-full rounded-md border border-[var(--border)] bg-background px-3 py-2 text-sm text-primary-dark placeholder:text-secondary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'byVideo' && vidsLoading && (
                <div className="text-sm text-secondary-dark flex items-center gap-2"><LoadingSpinner size="small" /> Loading…</div>
              )}
              {viewMode === 'byVideo' ? (
                searchQuery.trim() ? (
                  <SearchResults connectionId={connectionId} query={searchQuery} tags={selectedTags} onSelect={setSelectedVideo} selectedId={selectedVideo?.videoId || null} />
                ) : (
                  <VideosGrid connectionId={connectionId} tags={selectedTags} onSelect={setSelectedVideo} selectedId={selectedVideo?.videoId || null} />
                )
              ) : (
                <AllCommentsFeed connectionId={connectionId} onSelectVideo={setSelectedVideo} parentsOnly={parentsOnly} newestFirst={newestFirst} />
              )}
            </CardContent>
          </Card>

          {/* Modal with comments + metrics */}
          <Dialog open={Boolean(selectedVideo)} onOpenChange={(open) => !open && setSelectedVideo(null)}>
            <DialogContent className="max-w-[1200px] w-[96vw] h-[85vh] p-0 overflow-hidden">
              {selectedVideo && (
                <div className="h-full flex flex-col min-h-0">
                  <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="text-primary-dark line-clamp-2">{selectedVideo.title || selectedVideo.videoId}</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 h-[calc(100%-72px)] min-h-0">
                    <div className="lg:col-span-2 h-full overflow-hidden min-h-0">
                      <Card className="card-background border-[var(--border)] h-full flex flex-col min-h-0">
                        <CardHeader className="py-3 px-4 border-b">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <CardTitle className="text-primary-dark">Interactions</CardTitle>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <label className="flex items-center gap-2">
                                <span className="text-secondary-dark">Sort by</span>
                                <select
                                  className="rounded-md border border-[var(--border)] bg-background px-2 py-1 text-sm text-primary-dark"
                                  value={videoSortBy}
                                  onChange={(e) => setVideoSortBy(e.target.value as typeof videoSortBy)}
                                >
                                  <option value="newest">Newest</option>
                                  <option value="oldest">Oldest</option>
                                  <option value="most_liked">Most liked</option>
                                  <option value="most_replies">Most replies</option>
                                </select>
                              </label>
                              <label className="flex items-center gap-1">
                                <input type="checkbox" className="accent-primary" checked={videoParentsOnly} onChange={(e) => setVideoParentsOnly(e.target.checked)} />
                                Parents only
                              </label>
                              <label className="flex items-center gap-1">
                                <input type="checkbox" className="accent-primary" checked={videoUnansweredOnly} onChange={(e) => setVideoUnansweredOnly(e.target.checked)} />
                                Unanswered only
                              </label>
                              <input
                                type="text"
                                placeholder="Filter by text…"
                                value={videoCommentQuery}
                                onChange={(e) => setVideoCommentQuery(e.target.value)}
                                className="w-56 rounded-md border border-[var(--border)] bg-background px-3 py-1.5 text-sm text-primary-dark placeholder:text-secondary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto px-4 min-h-0">
                          <CommentList
                            connectionId={connectionId}
                            video={selectedVideo}
                            className="py-4"
                            sortBy={videoSortBy}
                            parentsOnly={videoParentsOnly}
                            unansweredOnly={videoUnansweredOnly}
                            query={videoCommentQuery}
                          />
                        </CardContent>
                      </Card>
                    </div>
                    <div className="lg:col-span-1 h-full overflow-hidden min-h-0">
                      <Card className="card-background border-[var(--border)] h-full flex flex-col min-h-0">
                        <CardHeader className="py-3 px-4 border-b">
                          <CardTitle className="text-primary-dark">Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto px-4 min-h-0">
                          <VideoMetrics video={selectedVideo} />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

function VideosGrid({ connectionId, tags, onSelect, selectedId }: { connectionId: string; tags: string[]; onSelect: (v: YouTubeVideo) => void; selectedId: string | null }) {
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const { data, isLoading, isFetching, isError, error } = useVideos({ connectionId, limit: pageSize, offset: page * pageSize, newestFirst: true, tags });

  const formatDuration = (iso?: string | null) => {
    if (!iso) return '—';
    // Minimal ISO8601 duration parser (PT#H#M#S)
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return iso;
    const h = parseInt(m[1] || '0', 10);
    const min = parseInt(m[2] || '0', 10);
    const s = parseInt(m[3] || '0', 10);
    const parts = [] as string[];
    if (h > 0) parts.push(String(h));
    parts.push(String(min).padStart(h > 0 ? 2 : 1, '0'));
    parts.push(String(s).padStart(2, '0'));
    return parts.join(':');
  };

  const grid = useMemo(() => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] aspect-video bg-muted animate-pulse" />
          ))}
        </div>
      );
    }
    if (isError) return <div className="text-destructive">{(error as Error)?.message ?? 'Failed to load videos'}</div>;
    const videos = data ?? [];
    if (!videos.length) return <div className="text-secondary-dark text-sm">No videos found.</div>;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {videos.map((v) => (
          <button key={v.id} onClick={() => onSelect(v)} className={`text-left rounded-lg border border-[var(--border)] overflow-hidden hover:shadow transition ${selectedId === v.videoId ? 'ring-2 ring-primary' : ''}`}>
            <div className="relative aspect-video w-full bg-muted">
              {v.thumbnailUrl ? (
                <Image src={v.thumbnailUrl} alt={v.title || 'Video thumbnail'} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">No thumbnail</div>
              )}
              <div className="absolute bottom-2 right-2 rounded bg-black/70 text-white text-[10px] px-1.5 py-0.5">
                {formatDuration(v.duration)}
              </div>
            </div>
            <div className="p-3">
              <div className="text-sm font-medium line-clamp-2 text-primary-dark">{v.title || 'Untitled'}</div>
              <div className="text-xs text-secondary-dark mt-1">Comments: {v.commentCount ?? '—'} • Views: {v.viewCount ?? '—'}</div>
              {v.tags && v.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {v.tags.slice(0, 3).map((t) => (
                    <span key={t} className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted text-primary-dark border border-[var(--border)]">{t}</span>
                  ))}
                  {v.tags.length > 3 && <span className="text-[10px] text-secondary-dark">+{v.tags.length - 3} more</span>}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }, [isLoading, isError, error, data, selectedId, onSelect]);

  return (
    <div>
      {grid}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || isFetching}>Prev</Button>
        <div className="text-sm text-muted-foreground flex items-center gap-2">Page {page + 1}{isFetching && <LoadingSpinner size="small" />}</div>
        <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={isFetching || (data && data.length < pageSize)}>Next</Button>
      </div>
    </div>
  );
}

function VideoMetrics({ video }: { video: YouTubeVideo }) {
  const items = [
    { label: 'Views', value: video.viewCount },
    { label: 'Likes', value: video.likeCount },
    { label: 'Comments', value: video.commentCount },
    { label: 'Published', value: video.publishedAt ? new Date(video.publishedAt).toLocaleString() : '—' },
    { label: 'Duration', value: video.duration || '—' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {items.map((it) => (
        <div key={it.label} className="p-3 rounded-md border border-[var(--border)]">
          <div className="text-secondary-dark">{it.label}</div>
          <div className="text-primary-dark font-medium">{it.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

function SearchResults({ connectionId, query, tags, onSelect, selectedId }: { connectionId: string; query: string; tags: string[]; onSelect: (v: YouTubeVideo) => void; selectedId: string | null }) {
  const { data, isLoading, isError, error } = useVideoSearch({ connectionId, query, tags, limit: 24, offset: 0 });
  const formatDuration = (iso?: string | null) => {
    if (!iso) return '—';
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return iso;
    const h = parseInt(m[1] || '0', 10);
    const min = parseInt(m[2] || '0', 10);
    const s = parseInt(m[3] || '0', 10);
    const parts = [] as string[];
    if (h > 0) parts.push(String(h));
    parts.push(String(min).padStart(h > 0 ? 2 : 1, '0'));
    parts.push(String(s).padStart(2, '0'));
    return parts.join(':');
  };
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[var(--border)] aspect-video bg-muted animate-pulse" />
        ))}
      </div>
    );
  }
  if (isError) return <div className="text-destructive">{(error as Error)?.message ?? 'Failed to search'}</div>;
  const videos = data ?? [];
  if (!videos.length) return <div className="text-secondary-dark text-sm">No results for “{query}”.</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((v) => (
        <button key={v.id} onClick={() => onSelect(v)} className={`text-left rounded-lg border border-[var(--border)] overflow-hidden hover:shadow transition ${selectedId === v.videoId ? 'ring-2 ring-primary' : ''}`}>
          <div className="relative aspect-video w-full bg-muted">
            {v.thumbnailUrl ? (
              <Image src={v.thumbnailUrl} alt={v.title || 'Video thumbnail'} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">No thumbnail</div>
            )}
            <div className="absolute bottom-2 right-2 rounded bg-black/70 text-white text-[10px] px-1.5 py-0.5">
              {formatDuration(v.duration)}
            </div>
          </div>
          <div className="p-3">
            <div className="text-sm font-medium line-clamp-2 text-primary-dark">{v.title || 'Untitled'}</div>
            <div className="text-xs text-secondary-dark mt-1">Comments: {v.commentCount ?? '—'} • Views: {v.viewCount ?? '—'}</div>
            {v.tags && v.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {v.tags.slice(0, 3).map((t) => (
                  <span key={t} className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted text-primary-dark border border-[var(--border)]">{t}</span>
                ))}
                {v.tags.length > 3 && <span className="text-[10px] text-secondary-dark">+{v.tags.length - 3} more</span>}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function TagFilters({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) {
  const all = ['youtube', 'tiktok', 'instagram', 'shorts', 'long form'] as const;
  const toggle = (t: string) => {
    onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]);
  };
  return (
    <div className="flex items-center gap-1">
      {all.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => toggle(t)}
          className={`text-xs px-2 py-1 rounded border ${selected.includes(t) ? 'bg-primary text-white border-primary' : 'border-[var(--border)] text-primary-dark'}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function AllCommentsFeed({ connectionId, onSelectVideo, parentsOnly, newestFirst }: { connectionId: string; onSelectVideo: (v: YouTubeVideo) => void; parentsOnly: boolean; newestFirst: boolean }) {
  const pageSize = 30;
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<ReturnType<typeof useChannelComments>['data']>([]);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, isFetching, isError, error } = useChannelComments({ connectionId, limit: pageSize, offset, newestFirst, parentsOnly });

  useEffect(() => {
    // Reset list when filters change
    setItems([]);
    setOffset(0);
  }, [connectionId, parentsOnly, newestFirst]);

  useEffect(() => {
    if (data && data.length) {
      setItems((prev) => {
        // Avoid duplicates by commentId
        const seen = new Set(prev?.map((p) => p.id));
        const merged = [...(prev || [])];
        for (const d of data) if (!seen.has(d.id)) merged.push(d);
        return merged;
      });
    }
  }, [data]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !isFetching) {
        setOffset((o) => o + pageSize);
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [isFetching]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md border border-[var(--border)] bg-muted animate-pulse" />
        ))}
      </div>
    );
  }
  if (isError) return <div className="text-destructive">{(error as Error)?.message ?? 'Failed to load comments feed'}</div>;
  if (!items || items.length === 0) return <div className="text-secondary-dark text-sm">No interactions found.</div>;

  return (
    <div>
      <div className="divide-y">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onSelectVideo(it.video)}
            className="w-full text-left py-3 flex items-start gap-3 hover:bg-muted/50"
          >
            <div className="relative h-16 w-28 flex-shrink-0 rounded border border-[var(--border)] overflow-hidden bg-muted">
              {it.video.thumbnailUrl ? (
                <Image src={it.video.thumbnailUrl} alt={it.video.title || 'Thumbnail'} fill className="object-cover" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary-dark line-clamp-1">{it.video.title || it.video.videoId}</div>
              <div className="text-xs text-secondary-dark">{it.authorName || 'Unknown'} • {it.publishedAt ? new Date(it.publishedAt).toLocaleString() : ''}</div>
              <div className="mt-1 text-sm line-clamp-2">{it.content || ''}</div>
            </div>
          </button>
        ))}
      </div>
      <div ref={loaderRef} className="py-6 flex items-center justify-center text-muted-foreground text-sm">
        {isFetching ? <><LoadingSpinner size="small" /> <span className="ml-2">Loading more…</span></> : <span>Scroll to load more</span>}
      </div>
    </div>
  );
}
