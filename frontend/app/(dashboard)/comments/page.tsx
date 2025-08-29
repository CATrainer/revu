"use client";

import { useEffect, useMemo, useState } from 'react';
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

export default function CommentsPage() {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'byVideo'>('byVideo');

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
  const { isLoading: vidsLoading } = useVideos({ connectionId: connectionId ?? undefined, limit: 12, offset: 0, newestFirst: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">YouTube Comments</h1>
          <p className="mt-1 text-secondary-dark">Manage comments and see video metrics side by side.</p>
        </div>
        {connectionId ? (
          <SyncStatus connectionId={connectionId} />
        ) : (
          <ConnectButton />
        )}
      </div>

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
                  <CardTitle className="text-primary-dark">Comments</CardTitle>
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
                <div className="w-full max-w-md ml-auto">
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
                  <SearchResults connectionId={connectionId} query={searchQuery} onSelect={setSelectedVideo} selectedId={selectedVideo?.videoId || null} />
                ) : (
                  <VideosGrid connectionId={connectionId} onSelect={setSelectedVideo} selectedId={selectedVideo?.videoId || null} />
                )
              ) : (
                <AllCommentsFeed connectionId={connectionId} onSelectVideo={setSelectedVideo} />
              )}
            </CardContent>
          </Card>

          {/* Modal with comments + metrics */}
          <Dialog open={Boolean(selectedVideo)} onOpenChange={(open) => !open && setSelectedVideo(null)}>
            <DialogContent className="max-w-[1200px] w-[96vw] h-[85vh] p-0 overflow-hidden">
              {selectedVideo && (
                <div className="h-full flex flex-col">
                  <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="text-primary-dark line-clamp-2">{selectedVideo.title || selectedVideo.videoId}</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 h-[calc(100%-72px)]">
                    <div className="lg:col-span-2 h-full overflow-hidden">
                      <Card className="card-background border-[var(--border)] h-full flex flex-col">
                        <CardHeader className="py-3 px-4 border-b">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-primary-dark">Comments</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto px-4">
                          <CommentList connectionId={connectionId} videoId={selectedVideo.videoId} className="py-4" />
                        </CardContent>
                      </Card>
                    </div>
                    <div className="lg:col-span-1 h-full overflow-hidden">
                      <Card className="card-background border-[var(--border)] h-full flex flex-col">
                        <CardHeader className="py-3 px-4 border-b">
                          <CardTitle className="text-primary-dark">Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto px-4">
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

function VideosGrid({ connectionId, onSelect, selectedId }: { connectionId: string; onSelect: (v: YouTubeVideo) => void; selectedId: string | null }) {
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const { data, isLoading, isFetching, isError, error } = useVideos({ connectionId, limit: pageSize, offset: page * pageSize, newestFirst: true });

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

function SearchResults({ connectionId, query, onSelect, selectedId }: { connectionId: string; query: string; onSelect: (v: YouTubeVideo) => void; selectedId: string | null }) {
  const { data, isLoading, isError, error } = useVideoSearch({ connectionId, query, limit: 24, offset: 0 });
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
          </div>
        </button>
      ))}
    </div>
  );
}

function AllCommentsFeed({ connectionId, onSelectVideo }: { connectionId: string; onSelectVideo: (v: YouTubeVideo) => void }) {
  const [page, setPage] = useState(0);
  const pageSize = 30;
  const { data, isLoading, isFetching, isError, error } = useChannelComments({ connectionId, limit: pageSize, offset: page * pageSize, newestFirst: true, parentsOnly: true });

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
  const items = data ?? [];
  if (!items.length) return <div className="text-secondary-dark text-sm">No comments found.</div>;

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
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || isFetching}>Prev</Button>
        <div className="text-sm text-muted-foreground flex items-center gap-2">Page {page + 1}{isFetching && <LoadingSpinner size="small" />}</div>
        <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={isFetching || (items && items.length < pageSize)}>Next</Button>
      </div>
    </div>
  );
}
