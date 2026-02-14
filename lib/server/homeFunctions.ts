import {
  getBatchWatchTimes,
  getLatestNewEpisodes,
  getNextEpisodes,
} from '../supabase/serverQueries';
import { getMediaDetails, getEpisodeDetails } from '../tmdb';
import { fetchMediaData } from './fetchMediaData';
import { logger } from '../logger';

export async function fetchContinueWatching(user_id: string) {
  try {
    const continueWatchingMediaArray = await getNextEpisodes(user_id);

    if (!continueWatchingMediaArray || continueWatchingMediaArray.length === 0) {
      return [];
    }

    // Pass 1: Process each item — fetch TV show details to determine next episode
    // Store the fetched details for reuse in Pass 2 to avoid double-fetching
    const detailsCache = new Map<string, any>();

    const processedResults = await Promise.allSettled(
      continueWatchingMediaArray.map(async (media: any) => {
        try {
          const processed = { ...media };
          processed.episode_number =
            processed.episode_number === -1 ? undefined : processed.episode_number;
          processed.season_number =
            processed.season_number === -1 ? undefined : processed.season_number;

          if (!processed.next_episode) {
            return processed;
          }

          if (processed.episode_number && processed.next_episode) {
            const details = await getMediaDetails(media.media_type, media.media_id);
            // Cache the TV show details for reuse in Pass 2
            detailsCache.set(`${media.media_type}-${media.media_id}`, details);

            if (
              processed.season_number === details.last_episode_to_air.season_number &&
              processed.episode_number === details.last_episode_to_air.episode_number
            ) {
              return null; // Series finished
            } else {
              const seasonNumber = processed.season_number;
              const currentSeason = details.seasons.find(
                (season: any) => season.season_number === seasonNumber
              );
              if (currentSeason && processed.episode_number < currentSeason.episode_count) {
                processed.episode_number = Number(processed.episode_number) + 1;
                return processed;
              } else if (
                currentSeason &&
                processed.episode_number === currentSeason.episode_count &&
                Number(processed.season_number) + 1 <= details.last_episode_to_air.season_number
              ) {
                processed.season_number = Number(processed.season_number) + 1;
                processed.episode_number = 1;
                return processed;
              }
            }
          }
          return null;
        } catch (error) {
          logger.error('Error processing continue watching media', error);
          return null;
        }
      })
    );

    // Extract successful (non-null) processed items
    const processed = processedResults
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((item) => item !== null && item !== undefined);

    if (processed.length === 0) return [];

    // Pass 2: Batch fetch watch times + reuse cached details for TMDB data
    // Build batch watch time request
    const watchTimeItems = processed.map((media) => ({
      media_type: media.media_type,
      media_id: media.media_id,
      season_number: media.season_number ?? null,
      episode_number: media.episode_number ?? null,
    }));

    // Fetch episode details for items that need them (TV with episode),
    // reuse cached TV show details for movies and TV overview cards
    const [watchTimeMap, ...episodeResults] = await Promise.all([
      getBatchWatchTimes(user_id, watchTimeItems),
      ...processed.map(async (media) => {
        try {
          if (media.media_type === 'tv' && media.season_number && media.episode_number) {
            // Need episode details — fetch them (TV show details already cached)
            return await getEpisodeDetails(
              media.media_id,
              media.season_number,
              media.episode_number
            );
          } else {
            // Movie or TV overview — reuse cached details or fetch fresh
            const cacheKey = `${media.media_type}-${media.media_id}`;
            const cached = detailsCache.get(cacheKey);
            if (cached) return cached;
            return await getMediaDetails(media.media_type, media.media_id);
          }
        } catch (error) {
          logger.error('Error fetching media details for continue watching', error);
          return null;
        }
      }),
    ]);

    // Combine everything into the final result
    return processed
      .map((media, index) => {
        const details = episodeResults[index];
        if (!details) return null;

        // Build composite key for watch time lookup
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
      .filter(Boolean);
  } catch (error) {
    logger.error('Error in fetchContinueWatching:', error);
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
