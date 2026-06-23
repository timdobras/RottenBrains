'use client';

/**
 * Session-lifetime cache of fetched comments, keyed by post id.
 *
 * Comments are loaded lazily (when a post's comment section is actually opened),
 * then kept here so reopening the same post doesn't refetch them. Module-level
 * singleton so it survives modal open/close and client-side navigation.
 */
const cache = new Map<string, any[]>();

export function getCachedComments(id: string | number): any[] | undefined {
  if (id == null) return undefined;
  return cache.get(String(id));
}

export function setCachedComments(id: string | number, comments: any[]): void {
  if (id == null) return;
  cache.set(String(id), comments ?? []);
}
