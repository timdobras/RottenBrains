import { getFollowedUsersPosts } from '@/lib/db/client-actions';
import { fetchMediaData } from './fetchMediaData';
import { logger } from '@/lib/logger';

export async function fetchFeedPosts(userId: string, page: number) {
  const posts = await getFollowedUsersPosts(userId, page);
  if (!posts || posts.length === 0) return [];

  // Deduplicate TMDB calls: build a map of unique media_type-media_id keys
  const mediaMap = new Map<string, { media_type: string; media_id: number }>();
  posts.forEach((post: any) => {
    const key = `${post.post.media_type}-${post.post.media_id}`;
    if (!mediaMap.has(key)) {
      mediaMap.set(key, { media_type: post.post.media_type, media_id: post.post.media_id });
    }
  });

  // Batch fetch all unique media data
  const mediaDataResults = await Promise.all(
    Array.from(mediaMap.entries()).map(async ([key, item]) => {
      try {
        const data = await fetchMediaData(item.media_type, item.media_id);
        return { key, data };
      } catch (error) {
        logger.warn('Error fetching media data for feed:', key, error);
        return { key, data: null };
      }
    })
  );

  // Build lookup map
  const mediaDataMap = new Map<string, any>();
  mediaDataResults.forEach(({ key, data }) => {
    if (data) mediaDataMap.set(key, data);
  });

  // Map posts with their media data, filter out posts with no media
  return posts
    .map((post: any) => {
      const key = `${post.post.media_type}-${post.post.media_id}`;
      const mediaData = mediaDataMap.get(key);
      if (!mediaData) return null;
      return { post_data: post, media_data: mediaData };
    })
    .filter(Boolean);
}
