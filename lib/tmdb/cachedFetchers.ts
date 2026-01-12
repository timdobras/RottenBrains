/**
 * Cached TMDB fetchers using React's cache() for request deduplication
 *
 * These functions wrap the TMDB API calls with React's cache() to ensure
 * that duplicate requests within the same render pass (e.g., generateMetadata
 * and page component) are deduplicated automatically.
 */
import { cache } from 'react';
import { getMediaDetails, getEpisodeDetails, getRecommendations, getVideos } from './index';

/**
 * Cached version of getMediaDetails - deduplicates within same request
 */
export const getCachedMediaDetails = cache(async (mediaType: string, mediaId: number) => {
  return getMediaDetails(mediaType, mediaId);
});

/**
 * Cached version of getEpisodeDetails - deduplicates within same request
 */
export const getCachedEpisodeDetails = cache(
  async (tvId: number, seasonNumber: number, episodeNumber: number) => {
    return getEpisodeDetails(tvId, seasonNumber, episodeNumber);
  }
);

/**
 * Cached version of getRecommendations - deduplicates within same request
 */
export const getCachedRecommendations = cache(async (mediaType: string, mediaId: number) => {
  return getRecommendations(mediaType, mediaId);
});

/**
 * Cached version of getVideos - deduplicates within same request
 */
export const getCachedVideos = cache(async (mediaType: string, mediaId: number) => {
  return getVideos(mediaType, mediaId);
});
