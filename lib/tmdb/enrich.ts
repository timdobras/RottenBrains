import type { EnrichedMediaItem } from '@/lib/tmdb/types';
import { getMovieDetails, getTVDetails } from '@/lib/tmdb';
import { logger } from '@/lib/logger';

/**
 * Enrich a TMDB list result with full details (images, genres, runtime, etc.).
 * Failures are caught so one bad item doesn't break the whole row/page.
 */
export async function enrichItem(item: EnrichedMediaItem): Promise<EnrichedMediaItem> {
  try {
    const details =
      item.media_type === 'movie' ? await getMovieDetails(item.id) : await getTVDetails(item.id);
    return {
      ...item,
      images: details?.images,
      genres: details?.genres,
      runtime: details?.runtime,
      number_of_episodes: details?.number_of_episodes,
      number_of_seasons: details?.number_of_seasons,
      release_date: details?.release_date || item.release_date,
      first_air_date: details?.first_air_date || item.first_air_date,
    };
  } catch (error) {
    logger.error(`Failed to enrich media item ${item.id}:`, error);
    return item;
  }
}
