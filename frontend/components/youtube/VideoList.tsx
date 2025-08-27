"use client";

import Image from 'next/image';
import { useState, useMemo } from 'react';
import { useVideos } from '@/hooks/useYouTube';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { YouTubeVideo } from '@/types/youtube';

interface VideoListProps {
  connectionId: string;
  pageSize?: number;
  className?: string;
}

function formatNumber(n?: number | null) {
  if (n === null || n === undefined) return '—';
  return Intl.NumberFormat().format(n);
}

function VideoCard({ v }: { v: YouTubeVideo }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video w-full bg-muted">
        {v.thumbnailUrl ? (
          <Image src={v.thumbnailUrl} alt={v.title || 'Video thumbnail'} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No thumbnail</div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-2 text-base">{v.title || 'Untitled'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div>Views: {formatNumber(v.viewCount)}</div>
          <div>Comments: {formatNumber(v.commentCount)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="relative aspect-video w-full bg-muted" />
      <CardHeader>
        <div className="h-4 w-3/4 bg-muted rounded" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function VideoList({ connectionId, pageSize = 12, className }: VideoListProps) {
  const [page, setPage] = useState(0);
  const offset = page * pageSize;
  const { data, isLoading, isFetching, isError, error } = useVideos({ connectionId, limit: pageSize, offset, newestFirst: true });

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: pageSize }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="text-destructive">{(error as Error)?.message ?? 'Failed to load videos'}</div>
      );
    }

    const videos = data ?? [];

    if (videos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border p-8 text-center text-muted-foreground">
          <div className="mb-2">No videos found.</div>
          <div className="text-sm">Try syncing your channel or adjusting filters.</div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </div>
    );
  }, [isLoading, isError, error, data, pageSize]);

  return (
    <div className={className}>
      {content}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || isFetching}>
          Prev
        </Button>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          Page {page + 1}
          {isFetching && <LoadingSpinner size="small" />}
        </div>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={isFetching || (data && data.length < pageSize)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
