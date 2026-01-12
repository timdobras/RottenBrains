import { getPostByIdNew, getPostsFromFollowedUsers } from '../supabase/serverQueries';
import { fetchMediaData } from './fetchMediaData';
import { logger } from '@/lib/logger';

export async function fetchPostsData(user_id: string) {
  try {
    const posts = await getPostsFromFollowedUsers(user_id);
    if (!posts || posts.length === 0) return [];

    // Extract unique media items to avoid duplicate API calls
    const mediaMap = new Map<string, { media_id: number; media_type: string }>();
    posts.forEach((post: any) => {
      const key = `${post.post.media_type}-${post.post.media_id}`;
      if (!mediaMap.has(key)) {
        mediaMap.set(key, { media_id: post.post.media_id, media_type: post.post.media_type });
      }
    });

    // Batch fetch all unique media data
    const mediaDataResults = await Promise.all(
      Array.from(mediaMap.entries()).map(async ([key, item]) => {
        try {
          const data = await fetchMediaData(item.media_id, item.media_type);
          return { key, data };
        } catch (error) {
          logger.warn('Error fetching media data:', key, error);
          return { key, data: null };
        }
      })
    );

    // Build a lookup map for quick access
    const mediaDataMap = new Map<string, any>();
    mediaDataResults.forEach(({ key, data }) => {
      if (data) mediaDataMap.set(key, data);
    });

    // Map posts with their media data
    return posts
      .map((post: any) => {
        const key = `${post.post.media_type}-${post.post.media_id}`;
        const mediaData = mediaDataMap.get(key);
        if (!mediaData) return null;
        return { post_data: post, media_data: mediaData };
      })
      .filter(Boolean);
  } catch (error) {
    logger.error('Error in fetchPostsData:', error);
    return []; // fallback value so the page can still render
  }
}

export async function fetchPostById(post_id: string, current_user_id?: string) {
  const post = await getPostByIdNew(post_id, current_user_id);
  const posts_media_data = await fetchMediaData(post.post.media_id, post.post.media_type);
  return { post_data: post, media_data: posts_media_data };
}
