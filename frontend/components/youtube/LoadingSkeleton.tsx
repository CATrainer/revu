"use client";

import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Utility skeleton block
function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

// 1) Video card skeleton — matches VideoList Card layout
export function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Thumbnail area */}
      <div className="relative aspect-video w-full bg-muted" />
      {/* Title line */}
      <CardHeader>
        <Shimmer className="h-4 w-3/4" />
      </CardHeader>
      {/* Metrics */}
      <CardContent>
        <div className="flex items-center gap-4">
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function VideoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}

// 2) Comment item skeleton — matches CommentList rows
export function CommentItemSkeleton() {
  return (
    <div className="border-b py-4">
      {/* Author + date line */}
      <div className="space-y-2">
        <Shimmer className="h-4 w-40" />
        {/* Content lines */}
        <Shimmer className="h-4 w-2/3" />
        <Shimmer className="h-3 w-1/3" />
      </div>
      {/* Example nested reply preview */}
      <div className="mt-3 ml-4 space-y-2 border-l pl-4">
        <Shimmer className="h-3 w-32" />
        <Shimmer className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function CommentListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CommentItemSkeleton key={i} />
      ))}
    </div>
  );
}

// 3) Connection/sync status skeleton — matches SyncStatus/ConnectButton info block
export function ConnectionStatusSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1.5">
        <Shimmer className="h-4 w-48" />
        <Shimmer className="h-3 w-32" />
      </div>
      <Shimmer className="h-9 w-24" />
    </div>
  );
}

const Skeletons = {
  VideoCardSkeleton,
  VideoGridSkeleton,
  CommentItemSkeleton,
  CommentListSkeleton,
  ConnectionStatusSkeleton,
};

export default Skeletons;
