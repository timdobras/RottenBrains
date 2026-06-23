'use client';

/**
 * In-memory hand-off store for post data.
 *
 * When a post card is already rendered in a feed/profile/grid, it holds the full
 * `post_media_data` object (post_data + media_data) in memory. Instead of letting
 * the post modal re-fetch that data over the network, the card seeds it here and
 * the intercepting modal route reads it back synchronously — so opening a post is
 * instant and refetch-free.
 *
 * This is a module-level singleton (not React state) on purpose: it must survive
 * client-side navigation between the card and the `@modal` slot without being tied
 * to any component's lifecycle. It only holds references to data already in memory,
 * so the footprint is negligible.
 */

type PostMediaData = any;

const store = new Map<string, PostMediaData>();

export function seedPostData(id: string | number, data: PostMediaData): void {
  if (id == null || !data) return;
  store.set(String(id), data);
}

export function getSeededPostData(id: string | number): PostMediaData | undefined {
  if (id == null) return undefined;
  return store.get(String(id));
}
