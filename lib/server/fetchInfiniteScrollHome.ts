import { getMovieRecommendationsForUser, getTvRecommendationsForUser } from '@/lib/recommendations';
import { logger } from '@/lib/logger';
import { getBatchWatchedItemsForUser } from '../supabase/clientQueries';
import { fetchMediaData } from './fetchMediaData';

const shuffleArray = (array: any[]) => {
  if (!array || array.length === 0) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export async function fetchInfiniteScrollHome(
  movie_genres: any,
  tv_genres: any,
  page: number = 1,
  user_id: string
) {
  const [movie_rec, tv_rec] = await Promise.all([
    getMovieRecommendationsForUser(movie_genres, page),
    getTvRecommendationsForUser(tv_genres, page),
  ]);

  // Handle null responses gracefully
  const resMovies = (movie_rec?.results || []).map((movie: any) => ({
    ...movie,
    media_type: 'movie',
  }));
  const resTv = (tv_rec?.results || []).map((tvShow: any) => ({
    ...tvShow,
    media_type: 'tv',
  }));

  const combined_not_shuffled = [...resTv, ...resMovies];
  if (combined_not_shuffled.length === 0) {
    return [];
  }

  const combined = shuffleArray(combined_not_shuffled);

  // Extract unique media items to avoid duplicate API calls
  const mediaMap = new Map<string, { media_id: number; media_type: string }>();
  combined.forEach((media: any) => {
    const key = `${media.media_type}-${media.id}`;
    if (!mediaMap.has(key)) {
      mediaMap.set(key, { media_id: media.id, media_type: media.media_type });
    }
  });

  // Batch fetch unique media data and watched items in parallel
  const [mediaDataResults, watched_items] = await Promise.all([
    Promise.all(
      Array.from(mediaMap.entries()).map(async ([key, item]) => {
        try {
          const data = await fetchMediaData(item.media_id, item.media_type);
          return { key, data };
        } catch (error) {
          logger.warn('Error fetching media data:', key, error);
          return { key, data: null };
        }
      })
    ),
    getBatchWatchedItemsForUser(user_id, combined),
  ]);

  // Build a lookup map for quick access
  const mediaDataMap = new Map<string, any>();
  mediaDataResults.forEach(({ key, data }) => {
    if (data) mediaDataMap.set(key, data);
  });

  const watchedSet = new Set(
    (watched_items || []).map((item: any) => `${item.media_type}-${item.media_id}`)
  );

  // Map combined items to their fetched data and filter out watched/null items
  const unwatched_items = combined
    .map((media: any) => {
      const key = `${media.media_type}-${media.id}`;
      const mediaData = mediaDataMap.get(key);
      if (!mediaData) return null;
      if (watchedSet.has(`${mediaData.media_type}-${mediaData.id}`)) return null;
      return mediaData;
    })
    .filter(Boolean);

  return unwatched_items;
}
