import type { StateCreator, StoreApi } from 'zustand';
import type { YouTubeComment } from '@/types/youtube';

// Contract: host store must have a `comments: YouTubeComment[]` field.
export type WithOptimisticReplies = {
  optimistic: {
    replies: Record<string, {
      commentId: string;
      previous: YouTubeComment[];
      startedAt: number;
    }>;
  };
  // Start an optimistic reply update for a comment; returns an operation id.
  optimisticReplyStart: (commentId: string) => string;
  // Commit the optimistic update (no-op by default; optionally pass fields to merge later).
  optimisticReplyCommit: (opId: string, merge?: Partial<YouTubeComment>) => void;
  // Roll back the optimistic update.
  optimisticReplyRollback: (opId: string) => void;
  // Convenience wrapper to perform an async action with automatic start/commit/rollback.
  performOptimisticReply: (commentId: string, action: () => Promise<unknown>) => Promise<void>;
};

export type CommentsHostState = { comments: YouTubeComment[] };

function genId() {
  // Best-effort unique id without crypto requirement
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function incrementReplyCount(list: YouTubeComment[], commentId: string): YouTubeComment[] {
  return list.map((c) => (c.commentId === commentId ? { ...c, replyCount: (c.replyCount || 0) + 1 } : c));
}

// Middleware that augments a Zustand store with optimistic reply helpers.
export const optimisticReplies = <S extends CommentsHostState>(
  config: StateCreator<S, [], []>
): StateCreator<S & WithOptimisticReplies, [], []> =>
  (set, get, api) => {
  // Call base config with S (host) types; set/get/api already compatible
    const base = config(
      set as unknown as (partial: Partial<S> | ((state: S) => Partial<S>), replace?: boolean) => void,
      get as unknown as () => S,
      api as unknown as StoreApi<S>
    );

    const start: WithOptimisticReplies['optimisticReplyStart'] = (commentId) => {
      const id = genId();
      const prev = (get() as S).comments;
      // Apply optimistic increment
      const next = incrementReplyCount(prev, commentId);
      set({ comments: next } as Partial<S & WithOptimisticReplies>);
      // Track snapshot
      set((state) => {
        const current = (state as unknown as WithOptimisticReplies)?.optimistic?.replies || {};
        const nextReplies = { ...current, [id]: { commentId, previous: prev, startedAt: Date.now() } };
        return { optimistic: { replies: nextReplies } } as Partial<S & WithOptimisticReplies>;
      });
      return id;
    };

    const commit: WithOptimisticReplies['optimisticReplyCommit'] = (opId, merge) => {
      set((state) => {
        const opt = (state as unknown as WithOptimisticReplies).optimistic || { replies: {} };
        if (!opt.replies?.[opId]) return {} as Partial<S & WithOptimisticReplies>;
        const rec = opt.replies[opId];
        const remaining = Object.fromEntries(Object.entries(opt.replies).filter(([k]) => k !== opId));
        // Optionally merge server fields into the specific comment
        let nextComments = (state as unknown as S).comments;
        if (merge) {
          nextComments = nextComments.map((c) => (c.commentId === rec.commentId ? { ...c, ...merge } : c));
        }
        return {
          comments: nextComments,
          optimistic: { replies: remaining },
        } as unknown as Partial<S & WithOptimisticReplies>;
      });
    };

    const rollback: WithOptimisticReplies['optimisticReplyRollback'] = (opId) => {
      set((state) => {
        const opt = (state as unknown as WithOptimisticReplies).optimistic || { replies: {} };
        const rec = opt.replies?.[opId];
        if (!rec) return {} as Partial<S & WithOptimisticReplies>;
        const remaining = Object.fromEntries(Object.entries(opt.replies).filter(([k]) => k !== opId));
        return {
          comments: rec.previous,
          optimistic: { replies: remaining },
        } as unknown as Partial<S & WithOptimisticReplies>;
      });
    };

    const perform: WithOptimisticReplies['performOptimisticReply'] = async (commentId, action) => {
      const id = start(commentId);
      try {
        await action();
        commit(id);
      } catch (e) {
        rollback(id);
        throw e;
      }
    };

    return {
  ...(base as S),
      optimistic: { replies: {} },
      optimisticReplyStart: start,
      optimisticReplyCommit: commit,
      optimisticReplyRollback: rollback,
      performOptimisticReply: perform,
    } as S & WithOptimisticReplies;
  };
