'use client';

import { getPostByIdNew } from '@/lib/db/client-actions';
import { logger } from '@/lib/logger';
import { fetchMediaData } from './fetchMediaData';

/**
 * Client-side equivalent of `lib/server/fetchPostsData.ts#fetchPostById`, used for
 * cold loads of the post modal (a deep-link / hard navigation where the post card
 * was never rendered, so there is nothing seeded in `postModalStore`).
 *
 * `getPostByIdNew` is a server action (its module is marked `'use server'`) so it is
 * callable from the client; it returns the post WITH its comments already populated.
 */
export async function fetchPostByIdClient(post_id: string, current_user_id?: string) {
  try {
    const post = await getPostByIdNew(post_id, current_user_id);
    if (!post?.post) return null;
    // NOTE: the client fetchMediaData signature is (media_type, media_id) — the
    // opposite order of the server one.
    const media_data = await fetchMediaData(post.post.media_type, post.post.media_id);
    return { post_data: post, media_data };
  } catch (error) {
    logger.error('fetchPostByIdClient failed:', error);
    return null;
  }
}
