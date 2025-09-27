import React from "react";
import Link from "next/link";
import MediaCardOverlay from "@/components/features/media/MediaCardOverlay";
import HoverImage from "./TrailerDisplayOnHover";
import MoreOptions from "./MoreOptions";
import {
  formatDate,
  formatEpisodeCode,
  getHrefFromMedia,
  getImageUrl,
  transformRuntime,
} from "@/lib/utils";

interface MediaCardProps {
  media: any;
  media_type?: string;
  media_id?: number;
  season_number?: number;
  episode_number?: number;
  watch_time?: number;
  user_id?: string;
  quality?: string;
  rounded?: boolean;
}

const MediaCardUI: React.FC<MediaCardProps> = ({
  media,
  media_type,
  media_id,
  season_number,
  episode_number,
  watch_time,
  quality,
  user_id,
  rounded,
}) => {
  season_number = season_number || media.season_number || undefined;
  episode_number = episode_number || media.episode_number || undefined;
  media_type = media_type || media.media_type || undefined;
  media_id = media_id || media.media_id || media.id || undefined;
  watch_time = watch_time || media.watch_time || 0;

  const genreIds: bigint[] = media?.genres?.map((genre: any) => genre.id) || [];

  const releaseDate =
    media.release_date || media.air_date || media.first_air_date;

  const dayDifference = releaseDate
    ? (new Date().getTime() - new Date(releaseDate).getTime()) /
      (1000 * 3600 * 24)
    : undefined;

  const dayDifferenceTv =
    media_type === "tv" && media.last_air_date
      ? (new Date().getTime() - new Date(media.last_air_date).getTime()) /
        (1000 * 3600 * 24)
      : undefined;

  const isNew =
    dayDifference !== undefined && dayDifference > 0 && dayDifference <= 30;
  const isSoon = dayDifference !== undefined && dayDifference < 0;
  const isNewEpisodes =
    media_type === "tv" &&
    dayDifference !== undefined &&
    dayDifference >= 30 &&
    dayDifferenceTv !== undefined &&
    dayDifferenceTv < 30;

  const mediaTitle = media.title || media.name;

  const formattedEpisodeCode =
    media_type === "tv" && season_number && episode_number
      ? ` | ${formatEpisodeCode(season_number, episode_number)}`
      : "";

  return (
    <article className="flex w-full min-w-[70vw] max-w-[100vw] flex-col md:w-full md:min-w-[300px] md:max-w-[350px]">
      <Link
        className={`relative w-full overflow-hidden md:rounded-[8px] ${
          rounded === true ? "rounded-[8px]" : ""
        }`}
        href={getHrefFromMedia(
          media_type || "movie",
          media_id || 0,
          season_number,
          episode_number,
        )}
      >
        <HoverImage
          imageUrl={getImageUrl(media, season_number, episode_number)}
          altText={mediaTitle}
          media_type={media_type || "movie"}
          media_id={media_id || 0}
        >
          <MediaCardOverlay
            runtime={media.runtime}
            number_of_episodes={media.number_of_episodes}
            voteAverage={media.vote_average}
            isNew={isNew}
            isSoon={isSoon}
            quality={quality}
            isNewEpisodes={isNewEpisodes}
            watchTime={watch_time}
            transformRuntime={transformRuntime}
          />
        </HoverImage>
      </Link>
      <div className="flex flex-col md:p-0">
        <div className="mt-2 flex flex-row justify-between">
          <h2 className="text-sm font-semibold">
            {mediaTitle}
            {formattedEpisodeCode}
          </h2>
          {user_id ? (
            <MoreOptions
              user_id={user_id}
              media_type={media.media_type}
              media_id={media.media_id}
              genre_ids={genreIds}
            />
          ) : (
            <></>
          )}
        </div>
        <div className="mt-1 flex flex-row items-center gap-1">
          <span
            key={media_type}
            className="rounded-[4px] bg-foreground/10 px-2 py-[2px] text-xs font-medium text-foreground/70"
          >
            {media_type === "movie"
              ? "Movie"
              : episode_number
                ? "Episode"
                : "TV Show"}
          </span>
          {media.genres?.slice(0, 2).map((genre: any) => (
            <Link
              href={`/${media_type}/${genre.id}`}
              key={genre.id}
              className="rounded-[4px] bg-foreground/10 px-2 py-[2px] text-xs font-medium text-foreground/70"
            >
              {genre.name}
            </Link>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-foreground/70">
          {formatDate(releaseDate)}
        </p>
      </div>
    </article>
  );
};

export default MediaCardUI;
