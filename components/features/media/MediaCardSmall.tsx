import { getEpisodeDetails, getMediaDetails } from "@/lib/tmdb";
import MediaCardOverlay from "./MediaCardOverlay";
import ImageWithFallback from "./ImageWithFallback";
import MoreOptions from "@/components/features/media/MoreOptions";
import { getWatchTime } from "@/lib/supabase/serverQueries";
import {
  formatEpisodeCode,
  getImageUrl,
  getRelativeTime,
  transformRuntime,
} from "@/lib/utils";

type MediaCardSmallProps = {
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
  user_id: string;
  media?: any;
  rounded?: boolean;
};

const MediaCardSmall = async ({
  media_type,
  media_id,
  season_number,
  episode_number,
  user_id,
  media,
  rounded,
}: MediaCardSmallProps) => {
  let fetchedWatchTime = null;

  const fetchMedia = async () => {
    if (!media) {
      if (season_number && episode_number) {
        return getEpisodeDetails(media_id, season_number, episode_number);
      }
      return getMediaDetails(media_type, media_id);
    }
    return media;
  };

  const fetchWatchTime = async () => {
    if (user_id) {
      return getWatchTime(
        user_id,
        media_type,
        media_id,
        season_number,
        episode_number,
      );
    }
    return null;
  };

  // Fetch media and watch time in parallel
  const [fetchedMedia, watchTime] = await Promise.all([
    fetchMedia(),
    fetchWatchTime(),
  ]);

  media = fetchedMedia;
  fetchedWatchTime = watchTime;

  const {
    runtime,
    vote_average,
    title,
    name,
    images,
    air_date,
    first_air_date,
    release_date,
  } = media;

  // Extract genre IDs
  const genreIds: bigint[] = media?.genres?.map((genre: any) => genre.id) || [];

  const mediaTitle = title || name || "Unknown Title";
  const episodeCode =
    media_type === "tv" && season_number && episode_number
      ? ` | ${formatEpisodeCode(season_number, episode_number)}`
      : "";

  const relativeTime = getRelativeTime(
    air_date || first_air_date || release_date,
  );

  return (
    <article className="flex w-full flex-col gap-2 hover:border-accent md:flex-row">
      <div
        className={`relative w-full flex-shrink-0 overflow-hidden md:w-1/2 ${
          rounded ? "rounded-[8px]" : "md:rounded-[8px]"
        }`}
      >
        <MediaCardOverlay
          runtime={runtime}
          voteAverage={vote_average}
          watchTime={fetchedWatchTime}
          transformRuntime={transformRuntime}
        />
        <ImageWithFallback
          imageUrl={getImageUrl(media, season_number, episode_number)}
          altText={mediaTitle}
          quality={"w1280"}
        />
      </div>
      <div className="flex flex-col gap-1 md:w-full md:px-0">
        <div className="flex flex-row items-center justify-between">
          <h3 className="flex items-center space-x-2 font-medium md:text-sm">
            {mediaTitle}
            {episodeCode}
          </h3>
          <MoreOptions
            user_id={user_id}
            media_type={media_type}
            media_id={media_id}
            genre_ids={genreIds}
          />
        </div>

        <p className="text-xs text-foreground/50">{relativeTime}</p>
      </div>
    </article>
  );
};

export default MediaCardSmall;
