"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ConnectButton from '@/components/youtube/ConnectButton';
import { useTriggerYouTubeSync } from '@/hooks/useYouTube';

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border p-8 text-center">
      {children}
    </div>
  );
}

// 1) No connection
export function NoConnectionEmpty({ className }: { className?: string }) {
  return (
    <Container>
      <div className="mb-2 text-lg font-medium">Connect your YouTube channel</div>
      <div className="mb-4 max-w-md text-sm text-muted-foreground">
        To get started, connect your YouTube account so we can sync your videos and comments.
      </div>
      <ConnectButton className={className} />
    </Container>
  );
}

// 2) No videos
export function NoVideosEmpty({
  connectionId,
  onSync,
}: {
  connectionId?: string;
  onSync?: () => void;
}) {
  const sync = useTriggerYouTubeSync(connectionId);
  const handleSync = async () => {
    if (onSync) return onSync();
    if (connectionId) await sync.mutateAsync({ scope: 'full' });
  };
  return (
    <Container>
      <div className="mb-2 text-lg font-medium">No videos found</div>
      <div className="mb-4 max-w-md text-sm text-muted-foreground">
        We couldn&apos;t find any videos for this channel. Try syncing your channel or adjust filters.
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={handleSync} disabled={sync.isPending}>
          {sync.isPending ? 'Syncing…' : 'Sync channel'}
        </Button>
        <Link href="#filters" className="text-sm text-primary underline-offset-4 hover:underline">
          Adjust filters
        </Link>
      </div>
    </Container>
  );
}

// 3) No comments
export function NoCommentsEmpty({ onRefresh, onSyncRecent }: { onRefresh?: () => void; onSyncRecent?: () => void }) {
  return (
    <Container>
      <div className="mb-2 text-lg font-medium">No comments yet</div>
      <div className="mb-4 max-w-md text-sm text-muted-foreground">
        This video has no comments yet. New comments will appear here as they arrive.
      </div>
      <div className="flex items-center gap-3">
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            Refresh
          </Button>
        )}
        {onSyncRecent && <Button onClick={onSyncRecent}>Sync recent comments</Button>}
      </div>
    </Container>
  );
}

// 4) No search results
export function NoSearchResultsEmpty({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <Container>
      <div className="mb-2 text-lg font-medium">No results</div>
      <div className="mb-4 max-w-md text-sm text-muted-foreground">
        {query ? (
          <>No items match &quot;{query}&quot;. Try a different search or clear filters.</>
        ) : (
          <>No items match your filters. Try widening your search.</>
        )}
      </div>
      {onClear && <Button onClick={onClear}>Clear search</Button>}
    </Container>
  );
}

const EmptyStates = {
  NoConnectionEmpty,
  NoVideosEmpty,
  NoCommentsEmpty,
  NoSearchResultsEmpty,
};

export default EmptyStates;
