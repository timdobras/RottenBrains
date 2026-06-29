// components/features/media/HomeMediaCardServer.tsx
import React from 'react';
import HomeMediaCardSkeleton from '@/components/features/media/MediaCardSkeleton';
import MediaCardUI from '@/components/features/media/MediaCardUI';
import { getWatchTime } from '@/lib/db/queries';
import { getMediaDetails, getEpisodeDetails } from '@/lib/tmdb';

interface MediaCardServerProps {
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
  quality?: string;
  user_id?: string;
  rounded?: boolean;
  disableTrailer?: boolean;
}

const MediaCardServer: React.FC<MediaCardServerProps> = async ({
  media_type,
  media_id,
  season_number,
  episode_number,
  quality,
  user_id,
  rounded,
  disableTrailer,
}) => {
  try {
    // Fetch TMDB data and watch-time in parallel
    const mediaPromise =
      media_type === 'movie'
        ? getMediaDetails(media_type, media_id)
        : season_number && episode_number
          ? getEpisodeDetails(media_id, season_number, episode_number)
          : getMediaDetails(media_type, media_id);

    const watchTimePromise = user_id
      ? getWatchTime(user_id, media_type, media_id, season_number, episode_number)
      : Promise.resolve(0);

    const [media, watchTime] = await Promise.all([mediaPromise, watchTimePromise]);

    // 3) hand everything off to the pure-UI component (color is extracted client-side)
    return (
      <MediaCardUI
        media={media}
        media_type={media_type}
        media_id={media_id}
        season_number={season_number}
        episode_number={episode_number}
        watch_time={watchTime != null ? Number(watchTime) : undefined}
        quality={quality}
        user_id={user_id}
        rounded={rounded}
        disableTrailer={disableTrailer}
      />
    );
  } catch {
    return <HomeMediaCardSkeleton />;
  }
};

export default MediaCardServer;
