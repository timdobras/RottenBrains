import { getWatchTime } from "../supabase/serverQueries";
import { getEpisodeDetails, getMediaDetails } from "../tmdb";

export async function fetchMediaData(
  media_id: number,
  media_type: string,
  user_id?: string,
  season_number?: number,
  episode_number?: number,
) {
  // Determine which media details function to call
  const mediaPromise =
    media_type === "movie"
      ? getMediaDetails(media_type, media_id)
      : season_number && episode_number
        ? getEpisodeDetails(media_id, season_number, episode_number)
        : getMediaDetails(media_type, media_id);

  // Fetch watch time if user_id is provided
  const watchTimePromise = user_id
    ? getWatchTime(user_id, media_type, media_id, season_number, episode_number)
    : Promise.resolve(0); // Default to 0 if no user_id

  // Await both promises concurrently
  const [media, watch_time] = await Promise.all([
    mediaPromise,
    watchTimePromise,
  ]);

  return {
    ...media,
    watch_time,
    media_type,
    media_id,
    season_number,
    episode_number,
  };
}
