// components/features/media/HomeMediaCardServer.tsx
import React from "react";
import { getMediaDetails, getEpisodeDetails } from "@/lib/tmdb";
import { getWatchTime } from "@/lib/supabase/serverQueries";
import HomeMediaCardSkeleton from "@/components/features/media/MediaCardSkeleton";
import MediaCardUI from "@/components/features/media/MediaCardUI";

interface MediaCardServerProps {
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
  quality?: string;
  user_id?: string;
  rounded?: boolean;
}

const MediaCardServer: React.FC<MediaCardServerProps> = async ({
  media_type,
  media_id,
  season_number,
  episode_number,
  quality,
  user_id,
  rounded,
}) => {
  try {
    // 1) fetch the TMDB data
    const media =
      media_type === "movie"
        ? await getMediaDetails(media_type, media_id)
        : season_number && episode_number
          ? await getEpisodeDetails(media_id, season_number, episode_number)
          : await getMediaDetails(media_type, media_id);

    // 2) fetch the (optional) watch-time
    const watchTime = user_id
      ? await getWatchTime(
          user_id,
          media_type,
          media_id,
          season_number,
          episode_number,
        )
      : 0;

    // 3) hand everything off to the pure-UI component
    return (
      <MediaCardUI
        media={media}
        media_type={media_type}
        media_id={media_id}
        season_number={season_number}
        episode_number={episode_number}
        watch_time={watchTime}
        quality={quality}
        user_id={user_id}
        rounded={rounded}
      />
    );
  } catch {
    return <HomeMediaCardSkeleton />;
  }
};

export default MediaCardServer;
