'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reactive, cross-tree store for a post's live comment count.
 *
 * The feed card footer (`PostStats`) and the intercepting post modal
 * (`CommentSection`) render in *separate* React trees, so neither React state nor
 * a per-card context can keep their counts in sync — commenting in the modal used
 * to leave the feed card's number stale until a reload.
 *
 * This is a module-level singleton (mirrors `postModalStore`) holding a per-post
 * override that any number of mounted components can subscribe to. When a comment
 * is added anywhere, the caller pushes the new authoritative total here and every
 * component showing that post re-renders. Components fall back to the SSR
 * `post.total_comments` until an override exists, so a fresh load / server refetch
 * (which already reflects the DB increment) stays correct.
 */

const counts = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

function emit(id: string): void {
  listeners.get(id)?.forEach((cb) => cb());
}

/** Publish the authoritative comment total for a post; notifies subscribers. */
export function setPostCommentCount(id: string | number, total: number): void {
  if (id == null || !Number.isFinite(total)) return;
  const key = String(id);
  if (counts.get(key) === total) return;
  counts.set(key, total);
  emit(key);
}

function subscribe(id: string, cb: () => void): () => void {
  let set = listeners.get(id);
  if (!set) {
    set = new Set();
    listeners.set(id, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(id);
  };
}

/**
 * Subscribe to a post's comment count. Returns the greater of the live override
 * and `fallback` (the server-rendered `total_comments`).
 *
 * Comment counts are monotonic — comments are only ever added, never deleted — so
 * taking the max is always correct and lets a fresh server value (someone else
 * commented, feed refetched) supersede a now-stale session override automatically.
 */
export function usePostCommentCount(id: string | number, fallback: number): number {
  const key = String(id);
  const snapshot = () => {
    const override = counts.get(key);
    return override == null ? fallback : Math.max(override, fallback);
  };
  return useSyncExternalStore((cb) => subscribe(key, cb), snapshot, snapshot);
}
