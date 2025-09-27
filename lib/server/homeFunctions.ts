import {
  getLatestNewEpisodes,
  getNextEpisodes,
} from "../supabase/serverQueries";
import { getMediaDetails } from "../tmdb";
import { fetchMediaData } from "./fetchMediaData";

export async function fetchContinueWatching(user_id: string) {
  try {
    const continueWatchingMediaArray = await getNextEpisodes(user_id);

    // Process each item with error handling for each individual entry
    const processedResults = await Promise.allSettled(
      continueWatchingMediaArray.map(async (media: any) => {
        try {
          const processed = { ...media };
          processed.episode_number =
            processed.episode_number === -1
              ? undefined
              : processed.episode_number;
          processed.season_number =
            processed.season_number === -1
              ? undefined
              : processed.season_number;

          if (!processed.next_episode) {
            return processed;
          }

          if (processed.episode_number && processed.next_episode) {
            const details = await getMediaDetails(
              media.media_type,
              media.media_id,
            );
            if (
              processed.season_number ===
                details.last_episode_to_air.season_number &&
              processed.episode_number ===
                details.last_episode_to_air.episode_number
            ) {
              // Series finished—no more episodes
              processed.next_episode = false;
              processed.next_season_number = undefined;
              processed.next_episode_number = undefined;
              return null;
            } else {
              const seasonNumber = processed.season_number;
              const currentSeason = details.seasons.find(
                (season: any) => season.season_number === seasonNumber,
              );
              if (
                currentSeason &&
                processed.episode_number < currentSeason.episode_count
              ) {
                // Next episode in the same season
                processed.episode_number = Number(processed.episode_number) + 1;
                return processed;
              } else if (
                currentSeason &&
                processed.episode_number === currentSeason.episode_count &&
                Number(processed.season_number) + 1 <=
                  details.last_episode_to_air.season_number
              ) {
                // First episode of the next season
                processed.season_number = Number(processed.season_number) + 1;
                processed.episode_number = 1;
                return processed;
              }
            }
          }
          return null;
        } catch (error) {
          console.error(
            "Error processing continue watching media",
            media,
            error,
          );
          return null;
        }
      }),
    );

    // Extract successful (non-null) processed items
    const processed = processedResults
      .filter(
        (result): result is PromiseFulfilledResult<any> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value)
      .filter((item) => item !== null && item !== undefined);

    // Fetch media data for each processed item in parallel
    const mediaDataResults = await Promise.allSettled(
      processed.map((media) => {
        return fetchMediaData(
          media.media_id,
          media.media_type,
          user_id,
          media.season_number,
          media.episode_number,
        );
      }),
    );

    const mediaData = mediaDataResults
      .filter(
        (result): result is PromiseFulfilledResult<any> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);

    return mediaData;
  } catch (error) {
    console.error("Error in fetchContinueWatching:", error);
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
      return fetchMediaData(
        media.tv_id,
        "tv",
        user_id,
        media.season_number,
        media.episode_number,
      );
    }),
  );

  return new_episodes_data;
}
