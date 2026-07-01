import {
  getBatchWatchTimes,
  getContinueWatchingItems,
  getLatestNewEpisodes,
  getUpNextItems,
} from '@/lib/db/queries';
import { getMediaDetails, getEpisodeDetails } from '../tmdb';
import { fetchMediaData } from './fetchMediaData';
import { logger } from '../logger';

/**
 * Fetch in-progress items for the "Continue Watching" section.
 * These are movies and TV episodes the user is still watching (< 75% progress).
 * No episode advancement needed — the user resumes where they left off.
 */
export async function fetchContinueWatching(user_id: string) {
  try {
    const items = await getContinueWatchingItems(user_id);

    if (!items || items.length === 0) {
      return [];
    }

    // Normalize season/episode: -1 from DB means undefined
    const normalized = items.map((media) => ({
      ...media,
      season_number: media.season_number === -1 ? undefined : media.season_number,
      episode_number: media.episode_number === -1 ? undefined : media.episode_number,
    }));

    // Batch fetch watch times + media details in parallel
    const watchTimeItems = normalized.map((media) => ({
      media_type: media.media_type,
      media_id: media.media_id,
      season_number: media.season_number ?? null,
      episode_number: media.episode_number ?? null,
    }));

    const [watchTimeMap, ...detailResults] = await Promise.all([
      getBatchWatchTimes(user_id, watchTimeItems),
      ...normalized.map(async (media) => {
        try {
          if (media.media_type === 'tv' && media.season_number && media.episode_number) {
            return await getEpisodeDetails(
              media.media_id,
              media.season_number,
              media.episode_number
            );
          } else {
            return await getMediaDetails(media.media_type, media.media_id);
          }
        } catch (error) {
          logger.error('Error fetching media details for continue watching', error);
          return null;
        }
      }),
    ]);

    // DB over-fetches (LIMIT 15); slice to 10 after filtering out any failed detail lookups
    return normalized
      .map((media, index) => {
        const details = detailResults[index];
        if (!details) return null;

        const sn = media.season_number ?? -1;
        const en = media.episode_number ?? -1;
        const wtKey = `${media.media_type}-${media.media_id}-${sn}-${en}`;
        const watchTime = watchTimeMap.get(wtKey) || 0;

        return {
          ...details,
          watch_time: watchTime,
          media_type: media.media_type,
          media_id: media.media_id,
          season_number: media.season_number,
          episode_number: media.episode_number,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  } catch (error) {
    logger.error('Error in fetchContinueWatching:', error);
    return [];
  }
}

/**
 * Fetch "Up Next" items — TV episodes where the user finished the previous episode
 * (>= 75% watched) and there's a next episode available.
 * Determines the actual next episode using TMDB season/episode data.
 */
export async function fetchUpNext(user_id: string) {
  try {
    const items = await getUpNextItems(user_id);

    if (!items || items.length === 0) {
      return [];
    }

    // Normalize season/episode: -1 from DB means undefined
    const normalized = items.map((media) => ({
      ...media,
      season_number: media.season_number === -1 ? undefined : media.season_number,
      episode_number: media.episode_number === -1 ? undefined : media.episode_number,
    }));

    // Pass 1: Determine the actual next episode for each item using TMDB data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailsCache = new Map<string, any>();

    const processedResults = await Promise.allSettled(
      normalized.map(async (media) => {
        try {
          const processed = { ...media };

          if (!processed.episode_number || !processed.season_number) {
            return null; // Should not happen for TV, but guard anyway
          }

          const details = await getMediaDetails(media.media_type, media.media_id);
          detailsCache.set(`${media.media_type}-${media.media_id}`, details);

          // Check if the user is caught up to the last aired episode
          if (
            processed.season_number === details.last_episode_to_air.season_number &&
            processed.episode_number === details.last_episode_to_air.episode_number
          ) {
            return null; // Caught up — nothing to show
          }

          // Determine next episode: same season or next season
          const currentSeason = details.seasons.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (season: any) => season.season_number === processed.season_number
          );

          if (currentSeason && processed.episode_number < currentSeason.episode_count) {
            // Next episode in the same season
            processed.episode_number = Number(processed.episode_number) + 1;
            return processed;
          } else if (
            currentSeason &&
            processed.episode_number === currentSeason.episode_count &&
            Number(processed.season_number) + 1 <= details.last_episode_to_air.season_number
          ) {
            // First episode of the next season
            processed.season_number = Number(processed.season_number) + 1;
            processed.episode_number = 1;
            return processed;
          }

          return null; // No next episode available
        } catch (error) {
          logger.error('Error processing up next media', error);
          return null;
        }
      })
    );

    // Extract successful (non-null) processed items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processed = processedResults
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled'
      )
      .map((result) => result.value)
      .filter((item) => item !== null && item !== undefined);

    if (processed.length === 0) return [];

    // Pass 2: Batch fetch watch times + episode details for the resolved next episodes
    const watchTimeItems = processed.map((media) => ({
      media_type: media.media_type,
      media_id: media.media_id,
      season_number: media.season_number ?? null,
      episode_number: media.episode_number ?? null,
    }));

    const [watchTimeMap, ...episodeResults] = await Promise.all([
      getBatchWatchTimes(user_id, watchTimeItems),
      ...processed.map(async (media) => {
        try {
          if (media.season_number && media.episode_number) {
            return await getEpisodeDetails(
              media.media_id,
              media.season_number,
              media.episode_number
            );
          }
          // Fallback: reuse cached TV show details
          const cacheKey = `${media.media_type}-${media.media_id}`;
          const cached = detailsCache.get(cacheKey);
          if (cached) return cached;
          return await getMediaDetails(media.media_type, media.media_id);
        } catch (error) {
          logger.error('Error fetching episode details for up next', error);
          return null;
        }
      }),
    ]);

    // DB over-fetches (LIMIT 25); slice to 10 after filtering out caught-up / unavailable shows
    return processed
      .map((media, index) => {
        const details = episodeResults[index];
        if (!details) return null;

        const sn = media.season_number ?? -1;
        const en = media.episode_number ?? -1;
        const wtKey = `${media.media_type}-${media.media_id}-${sn}-${en}`;
        const watchTime = watchTimeMap.get(wtKey) || 0;

        return {
          ...details,
          watch_time: watchTime,
          media_type: media.media_type,
          media_id: media.media_id,
          season_number: media.season_number,
          episode_number: media.episode_number,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  } catch (error) {
    logger.error('Error in fetchUpNext:', error);
    return [];
  }
}

export async function fetchNewEpisodes(user_id: string) {
  const new_episodes = await getLatestNewEpisodes(user_id);
  if (!new_episodes || new_episodes.length <= 0) {
    return;
  }
  const new_episodes_data = await Promise.all(
    new_episodes.map(async (media) => {
      return fetchMediaData(media.tv_id, 'tv', user_id, media.season_number, media.episode_number);
    })
  );

  return new_episodes_data;
}
